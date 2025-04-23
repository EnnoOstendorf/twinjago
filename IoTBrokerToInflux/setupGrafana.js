require('dotenv').config();


const DASHJSON = require('./grafana-dash.json');
const PANELJSON = require('./grafana-panel.json');
const rawstate = require('./pipestate.json');

const INFLUX_TOKEN = process.env.INFLUX_TOKEN;
const INFLUX_ORG = process.env.INFLUX_ORG;
const INFLUX_BUCKET = process.env.INFLUX_BUCKET;
const INFLUX_USER = process.env.INFLUX_USER;
const INFLUX_PASS = process.env.INFLUX_PASS;

// GRAFANA STUFF
const GRAFANA_URL = process.env.GRAFANA_URL;
const GRAFANA_USER = process.env.GRAFANA_USER;
const GRAFANA_PASS = process.env.GRAFANA_PASS;
const GRAFANA_PROTO = process.env.GRAFANA_PROTO;
const GRAFANA_HOST = process.env.GRAFANA_HOST;
const GRAFANA_PORT = process.env.GRAFANA_PORT;
//const GRAFANA_URL = 'https://freetwin.de:3000';
//const GRAFANA_TOKEN = 'glsa_L0Y091GkqFgeEKRCGqICCnd7gVjL6LN6_c2a11d40';

const fs = require('fs');
const axios = require('axios');

const uids = [];

const sendGrafanaApi = ( met, url, dat, succb, errcb ) => {
    axios({
	method: met,
	url: GRAFANA_PROTO + '://' + GRAFANA_USER + ':' + GRAFANA_PASS + '@'+ GRAFANA_HOST + ':'+ GRAFANA_PORT + url,
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

const getAllDataSources = () => {
    sendGrafanaApi( 'GET', '/api/datasources', 0, (data) => {
	console.log('success', data.data );
    }, (data) => {
	console.log('error', data );
    })
}

const getOneDataSource = ( id ) => {
    sendGrafanaApi( 'GET', '/api/datasources/uid/'+id, 0, (data) => {
	console.log('success', data.data );
    }, (data) => {
	console.log('error', data );
    })
}

//getAllDataSources();
//getOneDataSource('eejmr9uqlboxse');


const savePanelJSON = ( ) => {
    fs.writeFileSync( './grafana-panel.json', JSON.stringify(PANELJSON) );

}

const updatePanelJSON = ( uid ) => {
    PANELJSON.datasource.uid = uid;    
    for ( let i=0; i< PANELJSON.targets.length; i++ ) {	
	const targ = PANELJSON.targets[i];
	targ.datasource.uid = uid;
	const ta = targ.query.split('"');
	ta[1] = INFLUX_BUCKET;
	targ.query = ta.join('"');
//	console.log('Targets',ta.join('"'));	
    }
}

const createDataSource = ( ) => {
    console.log('datasourcename', 'influx-'+Date.now() );
    const datasourcename = 'influx-'+Date.now();
    const senddata = {
	orgId: 1,
	name: datasourcename,
	type: 'influxdb',
	access: 'proxy',
	url: 'http://localhost:8086',
	basicAuth: true,
	basicAuthUser: INFLUX_USER,
	withCredentials: false,
	isDefault: false,
	jsonData: {
	    defaultBucket: INFLUX_BUCKET,
	    httpMode: 'POST',
	    organization: INFLUX_ORG,
	    timeout: 10,
	    version: 'Flux'
	},
	secureJsonData: {
	    basicAuthPassword: INFLUX_PASS,
	    token: INFLUX_TOKEN
	},
	readOnly: false,
    };
    console.log('create data source',senddata);
    sendGrafanaApi( 'POST', '/api/datasources', senddata, (data) => {
	const newUid = data.data.datasource.uid;
	updatePanelJSON( newUid );
	savePanelJSON( );
	console.log('success', newUid, PANELJSON );
    }, (data) => {
	console.log('error', data );
    })
}

createDataSource();

const createGrafanaDash = ( id, msg ) => {
    let dashjson = JSON.parse(JSON.stringify(DASHJSON));;
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

const publishDashboard = ( id, uid ) => {
    console.log('publish Dashboard',id,uid);
    sendGrafanaApi( 'post', '/api/dashboards/uid/'+uid+'/public-dashboards/', { "isEnabled" : true }, (response) => {
	devices[id].grafana.pubuid = response.data.uid;
	devices[id].grafana.pubdbuid = response.data.dashboardUid;
	devices[id].grafana.pubtoken = response.data.accessToken;
	saveState();

	console.log('success',response.data,devices[id].grafana);
    }, (err2) => {
	console.log('error2',err2.response.data);
    });
};



