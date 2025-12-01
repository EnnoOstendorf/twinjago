import { TWEEN } from 'three/addons/libs/tween.module.min.js';

function Sensors() {
    const displays = [];
    const url = 'wss://iot.fh-muenster.de/mqtt'
    const broker = {
	'connected' : false,
	'devices' : [],
	'deviceids' : []   
    };
    const options = {
	// Clean session
	clean: true,
	// Authentication
	username: 'user000',
	password: 'zAJ5T2mW',
	protocolVersion: 4,
	keepalive: 30,
	protocolId: 'MQTT',
	reconnectPeriod: 100,
	connectTimeout: 30 * 100,
	will: {
	    topic: 'WillMsg',
	    payload: 'Connection Closed abnormally..!',
	    qos: 0,
	    retain: false
	}
    }

    const MSGBUFFERLINES = 2;
    let aktdevice = null;
    let aktsensorout = null;
    
    const client  = mqtt.connect(url, options)
    console.log('connecting to ',url);
    document.getElementById('mqtttask')?.classList.add('pending');

    client.on('connect', function () {
	console.log('Connected')
	// Subscribe to a topic
	client.subscribe('meta/#');
	client.subscribe('beacon/#');
	client.subscribe('sensor/#');
	broker.connected = true;
	const taskDOM = document.getElementById('mqtttask');
	if ( taskDOM ) {
	    taskDOM.classList.remove('pending');
	    taskDOM.classList.add('ready');
	}
    })

    client.on('error', function (err) {
	console.log('error',err);
    })

    const writePoint = ( field, id, value ) => {
    }


    const aktDisplay = ( display, msg ) => {
	const struct = broker.devices[display.id].meta.payloadStructure;
	display.dispdom.replaceChildren();
	//    console.log('akt Display',display,msg,struct);
	for ( let i=0; i<struct.length; i++ ) {
	    if ( display.measures )
		for ( let j=0; j<display.measures.length; j++ ) {
		    if ( struct[i].name === display.measures[j].name && typeof msg[i] !== 'undefined' && msg[i] !== null ) {
			//		    console.log('akt Display',typeof msg[i]);
			//	displays.push( { 'id' : id, 'mesh' : mesh, 'measures' : measures, 'dispdom' : sensdiv } );
			const tmsg = typeof msg[i] === 'number' ? msg[i].toFixed(4) : msg[i];
			display.dispdom.insertAdjacentHTML( 'beforeend', '<b>'+ struct[i].name + ':</b> ' + tmsg + ' ' + (struct[i].unit || '') + '<br />' );
		    }
		}
	};
    }

    const attachSensor3D = ( id, mesh ) => {
	if ( ! broker.devices[id] ) {
	    broker.devices[id] = { 'meta' : '', 'datacount' : 0, 'beaconcount' : 0, 'lastdata' : [] };
	    console.log('attachSensor3D: no such Device, creating new', id);
	}    
	if ( ! mesh ) {
	    console.log('attachSensor3D: no mesh', mesh);
	    return;
	}
	if ( !broker.devices[id].control3D ) broker.devices[id].control3D = [];
	broker.devices[id].control3D.push( mesh );
    }

    const detachSensor3D = ( id, mesh ) => {
	if ( ! broker.devices[id] || ! broker.devices[id].control3D ) {
	    console.log('detachSensor3D: no such Device', id);
	    return;
	}    

	const btc3d = broker.devices[id].control3D;
	for ( let i=btc3d.length; i>=0; i-- ) {
	    if ( btc3d[i].id === mesh.id ) {
		btc3d.splice( i, 1 );
		break;
	    }
	}
    }

    const control3DObj = ( id, msg ) => {
	if ( editmode ) return;
	if ( broker.devices[id].control3D.length === 0 ) return;
	
	broker.devices[id].control3D.forEach( ( ob, i ) => {
	    const mmesh = ob;
	    const ud = mmesh.userData;
	    const changed = {
		position : { x : parseFloat(ud.opos.x), y : parseFloat(ud.opos.y), z : parseFloat(ud.opos.z), changed: false },
		rotation : { x : parseFloat(ud.orot.x), y : parseFloat(ud.orot.y), z : parseFloat(ud.orot.z), changed: false },
		scale : { x : parseFloat(ud.oscl.x), y : parseFloat(ud.oscl.y), z : parseFloat(ud.oscl.z), changed: false }
	    }
	    for( let i=0; i<broker.devices[id].meta.payloadStructure.length; i++ ) {
		const o=broker.devices[id].meta.payloadStructure[i];
		
		if ( o.name == 'position.x' ) {
		    changed.position.x += parseFloat(msg[i]); changed.position.changed=true; }
		if ( o.name == 'position.y' ) {
		    changed.position.y += parseFloat(msg[i]); changed.position.changed=true; }
		if ( o.name == 'position.z' ) {
		    changed.position.z += parseFloat(msg[i]); changed.position.changed=true; }
		if ( o.name == 'rotation.x' ) {
		    changed.rotation.x += parseFloat(msg[i]); changed.rotation.changed=true; }
		if ( o.name == 'rotation.y' ) {
		    changed.rotation.y += parseFloat(msg[i]); changed.rotation.changed=true; }
		if ( o.name == 'rotation.z' ) {
		    changed.rotation.z += parseFloat(msg[i]); changed.rotation.changed=true; }
		if ( o.name == 'scale.x' ) {
		    changed.scale.x *= parseFloat(msg[i]); changed.scale.changed=true; }
		if ( o.name == 'scale.y' ) {
		    changed.scale.y *= parseFloat(msg[i]); changed.scale.changed=true; }
		if ( o.name == 'scale.z' ) {
		    changed.scale.z *= parseFloat(msg[i]); changed.scale.changed=true; }
		//	console.log('device mover meta',o.name);
	    };
	    if ( changed.position.changed ) {
		//	mmesh.position.set( changed.position.x, changed.position.y, changed.position.z );
		new TWEEN.Tween(mmesh.position)
		    .to( { x : changed.position.x, y : changed.position.y, z : changed.position.z }, 500 )
		    .start();
		//	console.log('control3d position',ud.opos,changed);
	    }
	    if ( changed.rotation.changed ) {
		new TWEEN.Tween(mmesh.rotation)
		    .to( { x : changed.rotation.x, y : changed.rotation.y, z : changed.rotation.z }, 500 )
		    .start();
		//	mmesh.rotation.set( changed.rotation.x, changed.rotation.y, changed.rotation.z );
		//	console.log('control3d rotation',ud.orot,changed);
	    }
	    if ( changed.scale.changed ) {
		new TWEEN.Tween(mmesh.scale)
		    .to( { x : changed.scale.x, y : changed.scale.y, z : changed.scale.z }, 500 )
		    .start();
		//	mmesh.scale.set( changed.scale.x, changed.scale.y, changed.scale.z );
		//	console.log('control3d scale',ud.oscl,changed);
	    }
	});
	//    console.log('3D Device Move',msg);
    }

    const parseMessage = ( idp, msg ) => {

	const [ type, id ] = idp.split( /\// );
	if ( ! broker.devices[id] ) {
	    broker.devices[id] = { 'meta' : '', 'datacount' : 0, 'beaconcount' : 0, 'lastdata' : [] };
	    broker.deviceids.push( id );
	    //	console.log( 'new device', id );
	}
	if ( type === 'meta' ) {
	    //	console.log('meta',id,msg);
	    broker.devices[id].meta = msg;
	}
	else if ( type === 'sensor' ) {
	    if ( isNaN( broker.devices[id].datacount ) ) broker.devices[id].datacount = 0;
	    broker.devices[id].datacount++;
	    let message = '';
	    if ( !broker.devices[id].meta || !broker.devices[id].meta.payloadStructure ) {                     
		// Devices wich do net send a payload Structure on the meta channel could not be handled atm
		// nothing will be written to influx
		//	    console.log('no payloadStructure for id '+id+', no writePoint(',msg,')');
		return;
	    };
	    for( let i=0; i<broker.devices[id].meta.payloadStructure.length; i++ ) {
		message += broker.devices[id].meta.payloadStructure[i].name + ': ' + msg[i] + '  ';
		//	    writePoint( broker.devices[id].meta.payloadStructure[i].name,id,msg[i] );
		//	    console.log('writePoint(',devices[id].meta.payloadStructure[i].name,id,msg[i],')');
	    };
	    broker.devices[id].lastdata.push( message );
	    while ( broker.devices[id].lastdata.length > MSGBUFFERLINES ) {
		broker.devices[id].lastdata.shift();
	    }
	    if ( aktdevice && aktdevice === id && aktsensorout ) {
		aktsensorout.innerHTML = broker.devices[id].lastdata.join('<br />');
	    }
	    if ( displays.length > 0 ) {
		for ( let i=0; i<displays.length; i++ ) {
		    if ( displays[i].id === id ) {
			aktDisplay( displays[i], msg, broker.devices[id] );
			//		    break;
		    }
		}
	    }
	    if ( broker.devices[id].control3D ) {
		control3DObj( id, msg   );
	    }
	}
	else if ( type === 'beacon' ) {
	    if ( isNaN( broker.devices[id].beaconcount ) ) broker.devices[id].beaconcount = 0;
	    broker.devices[id].beaconcount++;
	    //	console.log('beacon',msg);
	}
    };


    // Receive messages
    client.on('message', function (topic, message) {
	// message is Buffer
	let msg = message.toString();
	let json = [];
	try {
	    json = JSON.parse(msg);
	}
	catch {
	    console.log('MQTT: could not parse payload:',msg);
	    json = msg.split( /\ /g );
	    console.log('MQTT: splitting at spaces',json);
	}
	
	parseMessage( topic, json );

	//    client.end()
    })

    // fetch devices from the pipe service
    let pipedevs = [];
    const loadAllPipedDevices = ( hostname, succ ) => {
	const url = 'https://'+hostname+':3459/getAll';
	const xhr = new XMLHttpRequest();
	xhr.open('get',url,true);
	xhr.setRequestHeader("Content-Type", "application/json");
	xhr.onreadystatechange = function () {
	    if (xhr.readyState === 4 && xhr.status === 200) {
		var json = JSON.parse(xhr.responseText);
		pipedevs=json;
		document.getElementById( 'influximport' ).classList.add('ready');
		for ( let i=0; i<json.length; i++ ) {
		    const o = json[i];
		    const tid = o.id;
		    const ld = o.data.lastdata;
		    //		console.log('piped device',tid,ld);
		    if ( ! broker.devices[tid] ) broker.devices[tid] = { 'lastdata' : [] };
		    if ( o.data.ignore ) broker.devices[tid].ignore = true;
		    else {
			broker.devices[tid].ignore = false;
			delete broker.devices[tid].ignore;
		    }
		    if ( ld ) {
			for ( let j=0; j<ld.length; j++ ) {
			    broker.devices[tid].lastdata.push( ld[j] );
			}
		    }
		    if ( o.data.grafana ) broker.devices[tid].grafanaurl = o.data.grafana.pubtoken;
		    else if ( broker.devices[tid].grafanaurl ) delete broker.devices[tid].grafanaurl;
		}
		if ( typeof succ === 'function' ) succ();
		console.log('loaded all piped devices', pipedevs );
	    }
	};
	xhr.send();
    }

    return {
	displays: displays,
	broker: broker,
	loadAllPipedDevices: loadAllPipedDevices,
	aktdevice: aktdevice,
	aktsensorout: aktsensorout,
	attachSensor3D: attachSensor3D,
	detachSensor3D: detachSensor3D
    };

}

export { Sensors }
