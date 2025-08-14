require('dotenv').config();

// First the Influx Part
const {InfluxDB, Point} = require('@influxdata/influxdb-client');

// ENVS - 
const INFLUX_URL = process.env.INFLUX_URL;
//const INFLUX_URL = 'http://localhost:8086';
const INFLUX_TOKEN = process.env.INFLUX_TOKEN;
//const INFLUX_TOKEN = '_cacSJ3b2TXCWTGFlmDI71Y0AaN0IPpOV48fLiUdFoVKrTi_GX0dqoY2Q9gwy--rHXZu6h64ciAyQJSaIJ01rA==';
const INFLUX_ORG = process.env.INFLUX_ORG;
//const INFLUX_ORG = 'fh-muenster';
const INFLUX_BUCKET = process.env.INFLUX_BUCKET;
//const INFLUX_BUCKET = 'iot-sensors';

const influxDB = new InfluxDB({ 'url': INFLUX_URL, 'token': INFLUX_TOKEN });
const writeApi = influxDB.getWriteApi(INFLUX_ORG, INFLUX_BUCKET)

const writePoint = ( measurement, id, value ) => {
    if ( value && typeof value === 'string' ) value = parseFloat( value );
    if ( ! value || typeof value !== 'number' ) value = 0.0;
//    console.log('writepoint(',measurement, id, value,')');
    const p = new Point(measurement).tag('sensor_id', id).floatField('value', value);
    writeApi.writePoint(p);
};

const DASHJSON = require('./grafana-dash.json');
const PANELJSON = require('./grafana-panel.json');
const rawstate = require('./pipestate.json');

console.log('Connect to InfluxDB',process.env.INFLUX_URL);



// GRAFANA STUFF
const GRAFANA_URL = process.env.GRAFANA_URL;
const GRAFANA_TOKEN = process.env.GRAFANA_TOKEN;
const GRAFANA_USER = process.env.GRAFANA_USER;
const GRAFANA_PASS = process.env.GRAFANA_PASS;
const GRAFANA_PROTO = process.env.GRAFANA_PROTO;
const GRAFANA_HOST = process.env.GRAFANA_HOST;
const GRAFANA_PORT = process.env.GRAFANA_PORT;
//const GRAFANA_URL = 'https://freetwin.de:3000';
//const GRAFANA_TOKEN = 'glsa_L0Y091GkqFgeEKRCGqICCnd7gVjL6LN6_c2a11d40';

const axios = require('axios');

const sendGrafanaApi = ( met, url, dat, succb, errcb ) => {
    axios({
	method: met,
	url: GRAFANA_PROTO + '://' + GRAFANA_USER + ':' + GRAFANA_PASS + '@'+ GRAFANA_HOST + ':' + GRAFANA_PORT +url,
	headers: {
	    'Accept': 'application/json', 
	    'Content-Type': 'application/json'
	},
	data: dat
    }).then( ( resp ) => {
	succb( resp );
    }).catch( ( err ) => {
	errcb( err );
    });
}


// Now the MQTT Part

const mqtt = require('mqtt')
const fs = require('fs');
const http = require('http');
const https = require('https');
const express = require('express');

const mqtturl = process.env.MQTTURL;
//const mqtturl = 'wss://iot.fh-muenster.de/mqtt'
const privateKey = fs.readFileSync( process.env.PRIVKEYPATH, 'utf8');
//const privateKey = fs.readFileSync('/etc/letsencrypt/live/freetwin.de/privkey.pem', 'utf8');
const certificate = fs.readFileSync(process.env.CERTFILEPATH, 'utf8');
//const certificate = fs.readFileSync('/etc/letsencrypt/live/freetwin.de/cert.pem', 'utf8');
const ca = fs.readFileSync(process.env.CAFILEPATH, 'utf8');
//const ca = fs.readFileSync('/etc/letsencrypt/live/freetwin.de/chain.pem', 'utf8');
const credentials = {
	key: privateKey,
	cert: certificate,
	ca: ca
};

const options = {
    // Clean session
    clean: true,
    // Authentication
    username: process.env.MQTTUSER,
//    username: 'user000',
    password: process.env.MQTTPASS,
//    password: 'zAJ5T2mW',
    protocolVersion: 4,
    keepalive: 30,
    protocolId: 'MQTT',
    reconnectPeriod: 1000,
    connectTimeout: 30 * 1000,
    will: {
	topic: 'WillMsg',
	payload: 'Connection Closed abnormally..!',
	qos: 0,
	retain: false
    }

}

const client  = mqtt.connect(mqtturl, options)
console.log('connecting to MQTT',mqtturl);

const devices = [];
const deviceids = [];

const LINESBUND = 50;

const saveState = () => {
    let x=[];
    for ( i=0; i<deviceids.length; i++ ) {
	const o=devices[deviceids[i]];
	o.id=deviceids[i];
	x.push(o);
    }
    fs.writeFileSync( './pipestate.json', JSON.stringify(x) );
}

const prepareState = () => {
    for ( let i=0; i<rawstate.length; i++ ) {
	devices[rawstate[i].id] = rawstate[i];
	deviceids.push(rawstate[i].id);
//	console.log('prepareState', rawstate[i]);
    }
//    console.log('found state',rawstate,devices);
}

prepareState();

const createGrafanaDash = ( id, msg ) => {
    let dashjson = JSON.parse(JSON.stringify(DASHJSON));
    dashjson.title = id;
    for ( let i=0; i<msg.payloadStructure.length; i++ ) {
	const o = msg.payloadStructure[i];
	if ( o.name && o.name.toLowerCase() !== 'uptime' && o.name.toLowerCase() !== 'timestamp' ) {
	    let paneljson = JSON.parse(JSON.stringify(PANELJSON));
	    paneljson.title = o.name;
	    paneljson.targets[0].query = paneljson.targets[0].query.replace( '%%SENSORID%%', id );
	    paneljson.targets[0].query = paneljson.targets[0].query.replace( '%%MEASUREMENT%%', o.name );
	    dashjson.panels.push( paneljson );
	    //	    console.log( 'adding panel', paneljson.targets[0].query );
	}
    }
    sendGrafanaApi( 'post', '/api/dashboards/db', { "dashboard" : dashjson }, (response) => {
	devices[id].grafana = {
	    'id': response.data.uid,
	    'slug': response.data.slug,
	    'url': response.data.url
	}
	saveState();
	publishDashboard( id, response.data.uid );
	console.log('grafana create dashboard successful',id);
    }, (err) => {
	console.log('grafana create dashboard error',err.response.data,id);
    })
//    console.log('create Grafana Dashboard', id, msg, dashjson)
}

const deleteGrafanaDash = ( id ) => {
    const dev = devices[id];
    const uid = dev.grafana.id;
    sendGrafanaApi( 'delete', '/api/dashboards/uid/'+uid, ( response ) => {
	console.log('deleted grafana dashboard',id,uid);
    }, ( response ) => { console.log('deleted grafana dashboard',id,uid) });
}

const publishDashboard = ( id, uid ) => {
//    console.log('publish Dashboard',id,uid);
    sendGrafanaApi( 'post', '/api/dashboards/uid/'+uid+'/public-dashboards/', { "isEnabled" : true }, (response) => {
	devices[id].grafana.pubuid = response.data.uid;
	devices[id].grafana.pubdbuid = response.data.dashboardUid;
	devices[id].grafana.pubtoken = response.data.accessToken;
	saveState();

	console.log('published',id);
    }, (err2) => {
	console.log('error2',err2.response.data);
    });
};

const parseMessage = ( id, msg ) => {
    [ type, id ] = id.split( /\// );
//    console.log('got message',type,id);
    if ( ! devices[id] ) {
	devices[id] = { 'meta' : '', 'datacount' : 0, 'beaconcount' : 0, 'lastdata' : [], 'data' : { 'ignore':true } };
	deviceids.push( id );	
	console.log( 'new device', id );
    }
    if ( type === 'meta' ) {
//	console.log('meta',id,msg);
	if ( devices[id].ignore ) return;
	devices[id].meta = msg;

	if ( !devices[id].grafana ) {
	    createGrafanaDash( id, msg );
	}
	else if ( !devices[id].grafana.pubuid ) {
	    publishDashboard( id, devices[id].grafana.id );	    
	}
    }
    else if ( type === 'sensor' ) {
	if ( devices[id].ignore ) return;
	devices[id].datacount++;
	if ( !devices[id].meta || !devices[id].meta.payloadStructure ) {
	    // Devices wich do net send a payload Structure on the meta channel could not be handled atm
	    // nothing will be written to influx
	    //	    console.log('no payloadStructure for id '+id+', no writePoint(',msg,')');
	    return;
	};
	if ( ! devices[id].lastdata ) devices[id].lastdata = [];
	devices[id].lastdata.push( msg );
	while ( devices[id].lastdata.length > 5 ) devices[id].lastdata.shift();
	for( let i=0; i<devices[id].meta.payloadStructure.length; i++ ) {
	    writePoint( devices[id].meta.payloadStructure[i].name,id,msg[i] );
//	    console.log('writePoint(',devices[id].meta.payloadStructure[i].name,id,msg[i],')');
	};
    }
    else if ( type === 'beacon' ) {
	if ( devices[id].ignore ) return;
	devices[id].beaconcount++;
//	console.log('beacon',msg);
    }
};

const cycleout = () => {
    console.log( 'Device List\nDevice ID         meta data beacon' );
    for ( let i=0; i<deviceids.length; i++ ) {
	const key = deviceids[i];
	const o = devices[key];
	console.log( key, o.meta?'X':'-', o.datacount, o.beaconcount );	
    };
    setTimeout( cycleout, 5000 );
}

//setTimeout( cycleout, 5000 );

client.on('connect', function () {
    console.log('Connected')
    // Subscribe to a topic
    client.subscribe('meta/#');
    client.subscribe('beacon/#');
    client.subscribe('sensor/#');
})

client.on('error', function (err) {
    console.log('error',err);
})

/*
// not sure, what to do in desaster cases
client.on('disconnect', function () {
    console.log('disconnect');
})
client.on('offline', function () {
    console.log('offline');
})
client.on('reconnect', function () {
    console.log('reconnect');
})
client.on('close', function () {
    console.log('close');
})
*/

    // Receive messages
client.on('message', function (topic, message) {
  // message is Buffer
    //console.log('MSG:',topic,JSON.parse(message.toString()))
    if ( message.toString() === '' ) return;
    try {
	parseMessage( topic, JSON.parse(message.toString()) );
    } catch (e) {
	console.log('error parsing message',topic, message.toString());
    };
    //    client.end()
})


// APP
const cors = require( 'cors' );
const app = express();
app.use(express.json({limit:'50mb'}))
app.use(express.urlencoded({
  extended: true
}));
app.use(cors());
//app.use(express.static('static'));

//app.use('/api', routes);

app.use(express.json());

app.get('/getAll', (req, res) => {
    const allDevs = [];   
    for ( let i=0; i<deviceids.length; i++ ) {
	const key = deviceids[i];
	const o = devices[key];
	allDevs.push( { 'id': key, 'data' : o } );
    };
    console.log('getAll called');
//    console.log( 'getAll', allDevs );
//    res.header('Access-Control-Allow-Origin', '*')
    res.json( allDevs );
});

app.get('/delete/:id', (req, res) => {
    console.log('delete:',req.params.id);
    const delid=req.params.id;
    for ( let i=0; i<deviceids.length; i++ ) {
	const key = deviceids[i];
	if ( key === delid ) {
	    deleteGrafanaDash( key );
	    deviceids.splice(i,1);
	    delete devices[key];
	    saveState();
//	    console.log('found',i,deviceids,devices);
	    break;
	}
    };

    res.json({ 'delete' : req.params.id });
});

app.get('/ignore/:id', (req, res) => {
    console.log('ignore:',req.params.id);
    const ignid=req.params.id;
    for ( let i=0; i<deviceids.length; i++ ) {
	const key = deviceids[i];
	if ( key === ignid ) {
	    const o=devices[key];
	    if ( o.ignore ) return;
	    if ( o.grafana ) {
		deleteGrafanaDash( key );
		delete o.grafana;
	    }
	    o.ignore=true;
	    saveState();
//	    console.log('found',i,deviceids,devices);
	    break;
	}
    };

    res.json({ 'ignore' : req.params.id });
});

app.get('/deignore/:id', (req, res) => {
    console.log('deignore:',req.params.id);
    const ignid=req.params.id;
    for ( let i=0; i<deviceids.length; i++ ) {
	const key = deviceids[i];
	if ( key === ignid ) {
	    const o=devices[key];
	    o.ignore=false;
	    delete o.ignore;
	    saveState();
//	    console.log('found',i,deviceids,devices);
	    break;
	}
    };

    res.json({ 'deignore' : req.params.id });
});

// Starting both http & https servers
const httpServer = http.createServer(app);
const httpsServer = https.createServer(credentials, app);

httpServer.listen(process.env.PORT, () => {
    console.log('HTTP Server running on port ',process.env.PORT);
});

httpsServer.listen(process.env.HTTPSPORT, () => {
    console.log('HTTPS Server running on port ',process.env.HTTPSPORT);
});


