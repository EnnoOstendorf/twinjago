require('dotenv').config();

const { execSync } = require('child_process');

// First the Influx Part
const {InfluxDB, flux, fluxDuration} = require('@influxdata/influxdb-client');

// ENVS - 
const INFLUX_URL = process.env.INFLUX_URL;
//const INFLUX_URL = 'http://localhost:8086';
const INFLUX_TOKEN = process.env.INFLUX_TOKEN;
//const INFLUX_TOKEN = '_cacSJ3b2TXCWTGFlmDI71Y0AaN0IPpOV48fLiUdFoVKrTi_GX0dqoY2Q9gwy--rHXZu6h64ciAyQJSaIJ01rA==';
const INFLUX_ORG = process.env.INFLUX_ORG;
//const INFLUX_ORG = 'fh-muenster';
const INFLUX_BUCKET = process.env.INFLUX_BUCKET;
//const INFLUX_BUCKET = 'iot-sensors';


const axios = require('axios');

const influxDB = new InfluxDB({ 'url': INFLUX_URL, 'token': INFLUX_TOKEN });
const queryApi = influxDB.getQueryApi( INFLUX_ORG )

const TICKLEN = 1000; // 1s as ticklength should be small enough

const minutify = ( mins ) => {
    return Math.floor(mins / 60000);
};
const stundify = ( stunds ) => {
    return Math.floor(stunds / 3600000);
};
const tagify = ( tags ) => {
    return Math.floor(tags / 86400000);
};

const scheduler = {
    actions : [],
    start : Date.now(),
    lastvisit : 0,
    addContAction : ( action, day, hour, min ) => {
	scheduler.actions.push( { action:action, loop: true, day: day||0, hour: hour||0, min: min||0 });
    },
    addOnceAction : ( action, date ) => {
	scheduler.actions.push( { action:action, loop: false, date:date });
    },
    driveForward : () => {
	scheduler.lastvisit = Date.now();
	for ( let i=scheduler.actions.length; i>0; i-- ) {
	    o=scheduler.actions[i-1];
//	    console.log( 'scheduler action', o, i);
	    if ( o.loop ) {
		if ( ! o.last ) {
		    o.last = scheduler.lastvisit;
		}
		
		if ( o.min > 0 &&  minutify( scheduler.lastvisit ) - minutify(o.last) >= o.min ) {
		    o.action();
		    console.log('Minute action',new Date());
		    o.last=scheduler.lastvisit;
		}
		else if ( o.hour > 0 &&  stundify( scheduler.lastvisit ) - stundify(o.last) >= o.hour ) {
		    console.log('Hour action',new Date());
		    o.action();
		    o.last=scheduler.lastvisit;
		}
		else if ( o.day > 0 &&  tagify( scheduler.lastvisit ) - tagify(o.last) >= o.day ) {
		    console.log('Day action',new Date());
		    o.action();
		    o.last=scheduler.lastvisit;
		}
//		console.log('scheduler loop action',o);
	    }
	    else {
	    }

	}
//	console.log('schedule driveForward', tagify( scheduler.lastvisit ), stundify( scheduler.lastvisit ), minutify( scheduler.lastvisit ), scheduler.lastvisit );
    }	
}

const queryDevice = ( measurement, id, completecb ) => {
    const fluxQuery = 'from(bucket:"'+INFLUX_BUCKET+'") |> range(start: -1h) |> filter(fn: (r) => r._measurement == "'+measurement+'" and r.sensor_id == "'+id+'")';
    const lines = [];
//    console.log('query:', fluxQuery.toString())

    queryApi.queryLines(fluxQuery, {
	next: (line) => {
	    lines.push(line);
//	    console.log(line)
	},
	error: (error) => {
	    console.error(error)
	    console.log('QueryLines ERROR')
	},
	complete: () => {
	    completecb( lines );
//	    console.log('QueryLines SUCCESS')
	},
    })
    return lines;
};

/*
  const writeApi = influxDB.getWriteApi(INFLUX_ORG, INFLUX_BUCKET)

const writePoint = ( measurement, id, value ) => {
    if ( value && typeof value === 'string' ) value = parseFloat( value );
    if ( ! value || typeof value !== 'number' ) value = 0.0;
//    console.log('writepoint(',measurement, id, value,')');
    const p = new Point(measurement).tag('sensor_id', id).floatField('value', value);
    writeApi.writePoint(p);
};
*/

console.log('Connect to InfluxDB',process.env.INFLUX_URL);

//queryDevice( [ 'temperature', 'humidity' ], 'eui-10061c16c7b4feff' );

const fs = require('fs');
const http = require('http');
const https = require('https');
const express = require('express');

const privateKey = fs.readFileSync( process.env.PRIVKEYPATH, 'utf8');
const certificate = fs.readFileSync(process.env.CERTFILEPATH, 'utf8');
const ca = fs.readFileSync(process.env.CAFILEPATH, 'utf8');

const credentials = {
	key: privateKey,
	cert: certificate,
	ca: ca
};

const devices = [];
const deviceids = [];
const writtenfiles = fs.readdirSync('static/archive');
const writtendaily = fs.readdirSync('static/archive/daily');

console.log('loaded saved files',writtenfiles.length);
console.log('loaded saved daily',writtendaily.length);

const clearDeviceList = () => {
    for ( let i=0; i<deviceids.length; i++ ) {
	delete devices[deviceids[i]];
    }
    deviceids.splice(0);
}

const writeSensorArc = ( l, id, m ) => {
    if ( m.toLowerCase() === 'uptime' || m.toLowerCase() === 'timestamp' ) return;
    const pre = 'static/archive/';
    const now = new Date();
    console.log('writeSensorArc',id,m);
//    console.log('writeSensorArc',id,m,now);
    //    console.log('writeSensorArc',pre+id+'-'+now.getDate()+'-'+(now.getMonth()+1)+'-'+(now.getYear()+1900)+'-'+now.getHours()+'-'+m+'.csv');
    let hrs = now.getHours();
    let mon = now.getMonth()+1;
    let day = now.getDate();
    hrs = hrs < 10 ? '0'+hrs : hrs;
    mon = mon < 10 ? '0'+mon : mon;
    day = day < 10 ? '0'+day : day;
    const fname = id + '-' + m + '-' + day + '-' + mon + '-'
	  + (now.getYear()+1900) + '-' + hrs + '.csv';
    fs.writeFileSync( pre+fname , l.join( '\n') );
    writtenfiles.push( fname );
}

const backupDevices = () => {
    for ( let i=0; i<deviceids.length; i++ ) {
//	console.log('backing up',deviceids[i]);
	const devid = deviceids[i];
	const marr = devices[devid].meta.payloadStructure;
	if ( marr )
	    for( let j=0; j<marr.length; j++ ) {
		const mname = marr[j].name;
		queryDevice( marr[j].name, devid, ( list ) => {
		    writeSensorArc( list, devid, mname );
		});
	    }
    }
}

const removeOldFiles = (  ) => {
    const now = Date.now();
    const nowdaystart = tagify( now );    
    const nd=new Date((nowdaystart-2)*86400000);
    const datestr = nd.getDate() + '-' + (nd.getMonth()+1) + '-' + (nd.getYear()+1900);
    try {
	let stdout = execSync('rm static/archive/*-'+datestr+'*');
	writtenfiles = fs.readdirSync('static/archive');
//	writtendaily = fs.readdirSync('static/archive/daily');
	console.log('removing old files','rm static/archive/*-'+datestr+'*');
    }
    catch {
	console.log('no old files to remove');
    }
}

const backupDaily = () => {
// stderr is sent to stderr of parent process
// you can set options.stdio if you want it to go elsewhere
    const now = Date.now();
    const nowdaystart = tagify( now );    
    const nd=new Date((nowdaystart-1)*86400000);
    const datestr = nd.getDate() + '-' + (nd.getMonth()+1) + '-' + (nd.getYear()+1900);
    console.log('backup daily TODO',nd,datestr);
    for ( let i=0; i<deviceids.length; i++ ) {
	const devid = deviceids[i];
	if ( devices[deviceids[i]].meta.payloadStructure )
	for ( let j=0; j<devices[deviceids[i]].meta.payloadStructure.length; j++ ) {
	    const m=devices[deviceids[i]].meta.payloadStructure[j].name;
	    const fnamepre = devid+'-'+m+'-'+datestr;
	    let cmd = '';
	    let found =0;
	    for ( let k=0; k<writtenfiles.length; k++ ) {
		if ( writtenfiles[k].includes( fnamepre ) ) {
		    //		    console.log(writtenfiles[k]);
		    found++;
		    cmd += 'static/archive/'+writtenfiles[k]+' ';
		}
	    }
	    if ( found > 0 ) {
		cmd = 'cat ' + cmd + '> static/archive/daily/' + fnamepre + '.csv;';
		cmd += 'zip static/archive/daily/'+fnamepre+'.csv.zip static/archive/daily/'+fnamepre+'.csv;';
		cmd += 'rm static/archive/daily/'+fnamepre+'.csv';
		let stdout = execSync(cmd);
		writtendaily.push( fnamepre+'.csv.zip' );
	    }
	    console.log('backing up daily',fnamepre);
	}
    };
    removeOldFiles();
}

const queryDeviceList = () => {
    axios({
	method: 'GET',
	url: process.env.DEVICELISTURL,
	headers: {
	    'Accept': 'application/json', 
	    'Content-Type': 'application/json'
	}
    }).then( ( resp ) => {
	if ( resp.data ) {
	    clearDeviceList();
	    resp.data.forEach( ( o, i ) => {
		deviceids.push( o.id );
		devices[o.id] = o.data;
	    });
	    scheduler.addContAction( backupDevices, 0, 1, 0 );
	    scheduler.addContAction( backupDaily, 1, 0, 0 );
	    //	    backupDevices();
	};
//	console.log('devicelist', resp.data);
    }).catch( ( err ) => {
	console.log('error fetching devicelist',err);
    });
};

queryDeviceList();


// APP
//const cors = require( 'cors' );
const app = express();
app.use(express.urlencoded({
  extended: true
}));
//app.use(cors());
app.use(express.static('static'));

//app.use('/api', routes);

app.use(express.json());

app.get('/status', (req, res) => {
    const allDevs = [];   
    for ( let i=0; i<deviceids.length; i++ ) {
	const key = deviceids[i];
	const o = devices[key];
	allDevs.push( { 'id': key, 'data' : o } );
    };
    console.log('getAll called');
//    console.log( 'getAll', allDevs );
//    res.header('Access-Control-Allow-Origin', '*')
    res.json( { devices: allDevs, files: writtenfiles, daily: writtendaily } );
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

const timertick = () => {
    scheduler.driveForward();
    setTimeout( () => {
	timertick();
    }, TICKLEN );
}

timertick();

