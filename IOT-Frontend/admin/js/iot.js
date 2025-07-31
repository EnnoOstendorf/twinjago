import * as THREE from 'three';
import { ArcballControls } from 'three/addons/controls/ArcballControls.js';
import { TWEEN } from 'three/addons/libs/tween.module.min.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
console.log('Welcome to the IOT-System-Frontend of FH Münster', location.search.substr(1).split('='));
const scene = new THREE.Scene();
const config = [];
let playground = null;
let aktdevice = null;
let aktsensorout = null;
let HTMLready = false;
let controls;
let editmode = false;
const Displays = [];
const DISPWIDTH = 120;
const hostname = location.hostname;

const DUMMYSENDERURL = 'https://'+hostname+':3457/Dummy_Sender.html';

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
		    //	Displays.push( { 'id' : id, 'mesh' : mesh, 'measures' : measures, 'dispdom' : sensdiv } );
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
    broker.devices[id].control3D = mesh;
}

const detachSensor3D = ( id ) => {
    if ( ! broker.devices[id] ) {
	console.log('detachSensor3D: no such Device', id);
	return;
    }    
    broker.devices[id].control3D = false;
}

const control3DObj = ( id, msg ) => {
    if ( editmode ) return;
    const mmesh = broker.devices[id].control3D;
    const ud = mmesh.userData;
    const changed = {
	position : { x : ud.opos.x, y : ud.opos.y, z : ud.opos.z, changed: false },
	rotation : { x : ud.orot.x, y : ud.orot.y, z : ud.orot.z, changed: false },
	scale : { x : ud.oscl.x, y : ud.oscl.y, z : ud.oscl.z, changed: false }
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
	if ( Displays.length > 0 ) {
	    for ( let i=0; i<Displays.length; i++ ) {
		if ( Displays[i].id === id ) {
		    aktDisplay( Displays[i], msg, broker.devices[id] );
		    break;
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

const genControls = ( camera, renderer ) => {
    controls = new ArcballControls( camera, renderer.domElement, scene );
    controls.target.set( 0, 0, 0 );
//    controls.adjustNearFar = true;
    controls.setGizmosVisible( false );
//    controls.enableGrid = true;
    controls.cursorZoom = true;
    controls.rotateSpeed = 1.0;
    controls.zoomSpeed = 1.2;
    controls.panSpeed = 0.8;

    controls.noZoom = false;
    controls.noPan = false;
    
    controls.staticMoving = false;
    controls.dynamicDampingFactor = 0.15;
    controls.saveState();
    controls.keys = [ 65, 83, 68 ];
    console.log('generate controls',controls);
}

// fetch devices from the pipe service
let pipedevs = [];
const loadAllPipedDevices = ( succ ) => {
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

loadAllPipedDevices();

const pipeGuyDelete = ( id, succ ) => {
    const url = 'https://'+hostname+':3459/delete/'+id;
    const xhr = new XMLHttpRequest();
    xhr.open('get',url,true);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.onreadystatechange = function () {
	if (xhr.readyState === 4 && xhr.status === 200) {
	    if ( typeof succ === 'function' ) succ();
	    console.log('deleted pipeguy device', id );
	}
    };
    xhr.send();
}

const pipeGuyIgnore = ( id, succ ) => {
    const url = 'https://'+hostname+':3459/ignore/'+id;
    const xhr = new XMLHttpRequest();
    xhr.open('get',url,true);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.onreadystatechange = function () {
	if (xhr.readyState === 4 && xhr.status === 200) {
	    if ( typeof succ === 'function' ) succ();
	    console.log('pipeguy device ignore', id );
	}
    };
    xhr.send();
}

const pipeGuyDeIgnore = ( id, succ ) => {
    const url = 'https://'+hostname+':3459/deignore/'+id;
    const xhr = new XMLHttpRequest();
    xhr.open('get',url,true);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.onreadystatechange = function () {
	if (xhr.readyState === 4 && xhr.status === 200) {
	    if ( typeof succ === 'function' ) succ();
	    console.log('pipeguy device deignore', id );
	}
    };
    xhr.send();
}

window.onload = ( loadev ) => {
    Coloris({ alpha: false });
    
    const palette = ['#202020','#808080','#800000','#FF0000','#008000','#00FF00','#808000','#FFFF00','#000080','#0000FF','#800080','#FF00FF','#008080','#00FFFF','#C0C0C0','#FFFFFF'];
    
    const devcats = [];
    const devcattree = [];
    const basiccats = [];
    const basiccattree = [];
    
    playground = document.getElementById('playground');
    const width = playground.offsetWidth;
    const height = playground.offsetHeight;
    const ghosttransp = 0.7;   
    const offset = {
	x: playground.offsetLeft,
	y: playground.offsetTop
    }
    let dynscroll = true;
    let saved = true;
    let editbackup = {
	pos : {
	    x: 0, y: 0, z: 0
	},
	rot : {
	    x: 0, y: 0, z: 0
	},
	scl : {
	    x: 0, y: 0, z: 0
	}
    };
    let labelbackup = {
	pos : {
	    x: 0, y: 0, z: 0
	},
	rot : {
	    x: 0, y: 0, z: 0
	}
    };
    const labeloffset = {
	x: 0, y: 0.35, z: 3.55
    }
    let dragmode = false;
    let dragstartval = 0;
    let dragfactor = 0.1;
    let dragmousestart = 0;
    let dragtarget = null;
    let draginp = null;
    let aktsign = null;
    let aktmesh = null;
    let aktpin = null;
    let aktroute = null;
    let capturemode = false;
    let SHIFTPRESSED = true;
    const MAXFILESIZE = 5000000;
    let aktdeviceuid = '';
    let hiobj = null;
    let loadopencount = 0;
    let loadclosefuncs = [];
    let iotmanagerto = null;
    
    scene.background = new THREE.Color( '#000000' );

    const camnear = 1;
    const camfar = 10000;
    const camera = new THREE.PerspectiveCamera( 27, width/height, camnear, camfar );
    camera.position.z = 200;
    camera.position.x = 200;
    camera.position.y = 100;
    camera.rotation.z = Math.PI/4;

    const renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setSize( width, height );
    renderer.setAnimationLoop( animation );
    playground.appendChild( renderer.domElement );
    
    
    const camstart = {
	'position' : {
	    'x' : camera.position.x,
	    'y' : camera.position.y,
	    'z' : camera.position.z
	},
	'rotation' : {
	    'x' : camera.rotation.x,
	    'y' : camera.rotation.y,
	    'z' : camera.rotation.z
	}
    }
    const camstartdefault = {
	'position' : {
	    'x' : 293,
	    'y' : -396,
	    'z' : 294
	},
	'rotation' : {
	    'x' : 0.85,
	    'y' : 0.58,
	    'z' : 0.01
	}
    }
    
    const ambientLight = new THREE.AmbientLight( 0x111111 );
    scene.add( ambientLight );

    const light1 = new THREE.DirectionalLight( 0xffffff, 2.5 );
    light1.position.set( 2000, 500, 3000 );
    scene.add( light1 );
    
    const light2 = new THREE.PointLight( 0xffffff, 0.01 );
    light2.position.set( -2000, -1700, -3000 );
    scene.add( light2 );

    const light3 = new THREE.PointLight( 0xffffff, 25000000 );
    light3.position.set( -1500, -3500, 1500 );
    scene.add( light3 );

    const light4 = new THREE.PointLight( 0xffffff, 0.01 );
    light4.position.set( 1500, 4500, -1500 );
    scene.add( light4 );

    let mainmesh=new THREE.Group();
    mainmesh.userData.id="main";
    let routemesh=new THREE.Group();
    routemesh.userData.id="routes";
    let signmesh=new THREE.Group();
    signmesh.userData.id="signs";
    let hlp = null;
    let edithlp = null;
    let axishelp = new THREE.AxesHelper( 6 );
    mainmesh.add( axishelp );
    mainmesh.add( routemesh );
    let devices = [];
    let parts = [];
    let files = [];
    let newfiles = [];
    let newraws = [];
    let links = [];
    let signs = [];
    let routes = [];
    let routespre = [];

    let isbasic = false;
    
    const flattenVerts = ( verts ) => {
	let target = [];
	for ( let i=0; i<verts.length; i++ ) {
	    for ( let j=0; j<verts[i].length; j++ ) {
		target.push(verts[i][j]);
	    }
	}
	return target;
    }
    const showEditDlg = ( mode ) => {
	edithlp = new THREE.BoxHelper(aktmesh, 0x00ffff);
	scene.add(edithlp);
	window.setTimeout( () => {
	    backupCoords( aktmesh );
	    restoreBackup( aktmesh );
	    aktEditCoords();
	}, 500 );
	const edtDlg = document.getElementById('editDlg');
	const box = document.getElementById('partsinner');
	document.body.classList.add('modalmode');
	edtDlg.classList.add('vis');
	edtDlg.classList.add(mode);
//	console.log( 'clicked edit button', document.getElementById('partsinner').scrollTop );
    }
    const showDokumenteDlg = () => {
	const dokDlg = document.getElementById('dokumenteDlg');
	document.body.classList.add('modalmode');
	
	dokDlg.classList.add('vis');
//	console.log( 'clicked dokumente button' );
    }
    const hideDokumenteDlg = () => {
	const dokDlg = document.getElementById('dokumenteDlg');
	document.body.classList.remove('modalmode');
	
	dokDlg.classList.remove('vis');
//	console.log( 'clicked dokumente button' );
    }   
    const showSzeneDlg = () => {
	const sznDlg = document.getElementById('szeneDlg');
	document.body.classList.add('modalmode');
	showSceneHelpers();
	sznDlg.classList.add('vis');
//	console.log( 'clicked dokumente button' );
    }
    const hideSzeneDlg = () => {
	const sznDlg = document.getElementById('szeneDlg');
	document.body.classList.remove('modalmode');
	hideSceneHelpers();

	sznDlg.classList.remove('vis');
//	console.log( 'clicked dokumente button' );
    }   
    const fillCatSelect = () => {
	const devcatseldom = document.getElementById('devCatSelect');
	const bascatseldom = document.getElementById('basCatSelect');
	devcatseldom.replaceChildren();
	bascatseldom.replaceChildren();
	const devcatdom = document.getElementById('deviceCat');
	devcats.forEach( (o,i) => {
	    const nd = document.createElement( 'b' );
	    nd.innerHTML = o;
	    nd.onclick = ( ev ) => {
		console.log('clicked cate', o, devcatdom);
		devcatdom.value=o;
		devcatseldom.classList.remove('show');
	    }
	    devcatseldom.appendChild(nd);
	});
	basiccats.forEach( (o,i) => {
	    const nd = document.createElement( 'b' );
	    nd.innerHTML = o;
	    nd.onclick = ( ev ) => {
		devcatdom.value=o;
		bascatseldom.classList.remove('show');
	    }
	    bascatseldom.appendChild(nd);
	});
//	console.log('fill cat select',devcats,basiccats);
    }
    const showCatSelect = ( type ) => {
	const catseldom = document.getElementById(type+'CatSelect');
	catseldom.classList.add( 'show' );
	console.log('show cat select');
    }
    const hideCatSelect = ( type ) => {
	const catseldom = document.getElementById(type+'CatSelect');
	catseldom.classList.remove( 'show' );
	console.log('hide cat select');
    }
    const showGlobalDlg = () => {
	const globDlg = document.getElementById('globalConf');
	document.body.classList.add('modalmode');	
	globDlg.classList.add('show');
//	console.log( 'clicked dokumente button' );
    }
    const hideGlobalDlg = () => {
	const globDlg = document.getElementById('globalConf');
	document.body.classList.remove('modalmode');	
	globDlg.classList.remove('show');
//	console.log( 'clicked dokumente button' );
    }
    const showDummySenderDlg = () => {
	const dumDlg = document.getElementById('dummySenderCont');
	document.body.classList.add('modalmode');	
	dumDlg.classList.add('show');
	const dumBox = document.getElementById('dummySenderBox');
	if ( dumBox.children.length === 0 )
	    dumBox.insertAdjacentHTML( 'beforeend', '<iframe src="'+DUMMYSENDERURL+'" />' );
	
//	console.log( 'clicked dokumente button' );
    }
    const hideDummySenderDlg = () => {
	const dumDlg = document.getElementById('dummySenderCont');
	document.body.classList.remove('modalmode');	
	dumDlg.classList.remove('show');
	// const dumBox = document.getElementById('dummySenderBox');
	// dumBox.replaceChildren();
	//	console.log( 'clicked dokumente button' );
    }
    let iotmngrstopmode = false;
    let iotmngraktint = 60000;
    const intvalsel = document.getElementById( 'aktintervalsel' );
    const resetIOTDevice = ( id ) => {
	pipeGuyDelete( id, () => {
	    loadAllPipedDevices( () => {
//		fillIOTManager( document.getElementById('iotManagerCont') );
	    });
	});
	console.log( 'resetIOTDevice', id );
    }
    const refreshIOTManager = () => {
	window.clearTimeout( iotmanagerto );
	fillIOTManager( document.getElementById('iotManagerCont') );
    }
    const fillIOTManager = ( box ) => {
	if ( ! box.classList.contains('show') ) return;
	const listbox = document.getElementById('iotMngrList');
	const addLine = ( id, o ) => {
//	    console.log('addLine',id,o);
	    const line = document.createElement('div');
	    line.classList.add('iotMngrDev');
	    line.innerHTML = '<h4>'+id+'</h4> ( '+(o.datacount?o.datacount:0)+' / '
		+(o.beaconcount?o.beaconcount:0)+ ')'+
		(o.lastdata&&o.lastdata[0]?' <i>'+o.lastdata[0]+'</i>':'')+
		'<a href="https://'+hostname+':3211/?filter='+id+'" target="_blank">Archiv</a>';
	    const passBtn = document.createElement( 'div' );
	    passBtn.classList.add('iotdevpassbtn');
	    if ( o.ignore ) {
		passBtn.classList.add('active');
		line.classList.add('passthru');
	    }
	    passBtn.title='Ignorieren: Es werden keine Daten für dieses Devices gespeichert und kein Dashboard angelegt.';
	    passBtn.onclick = () => {
		if ( passBtn.classList.contains( 'active' ) )
		{
		    pipeGuyDeIgnore( id, () => {
			window.setTimeout( () => {
			    loadAllPipedDevices( () => {
				refreshIOTManager();
			    });
			}, 5000 );
			passBtn.classList.remove('active');
			passBtn.parentNode.classList.remove('passthru');
		    });
		}
		else {
		    pipeGuyIgnore( id, () => {
			window.setTimeout( () => {
			    loadAllPipedDevices( () => {
				refreshIOTManager();
			    });
			}, 5000 );
			passBtn.classList.add('active');
			passBtn.parentNode.classList.add('passthru');
		    });
		}
	    }
	    line.appendChild( passBtn );
	    if ( ! o.ignore ) {
		if ( o.grafanaurl ) {
		    const viewBtn = document.createElement( 'button' );
		    viewBtn.classList.add('iotdevviewbtn');
		    viewBtn.title='Dashboard ansehen.';
		    viewBtn.innerHTML='Dashboard ansehen';
		    viewBtn.onclick = () => {
			console.log('view dash',o.grafanaurl);
			showIOTDeviceDash( id, o.grafanaurl );
		    }
		    line.appendChild( viewBtn );
		}
		
		const resetBtn = document.createElement( 'button' );
		resetBtn.classList.add('iotdevremovebtn');
		resetBtn.title='Dashboard zurücksetzen: Das Dashboard des Devices wird gelöscht. Sobald das Device wieder etwas sendet, wird ein neues Dashboard angelegt.';
		resetBtn.innerHTML='Dashboard zurücksetzen';
		resetBtn.onclick = () => {
		    resetIOTDevice( id );
		}
		line.appendChild( resetBtn );
	    }

	    listbox.appendChild( line );
	}
	if ( ! iotmngrstopmode ) {
	    listbox.replaceChildren();
	    const keysarr = Object.keys(broker.devices);	
	    console.log('fillIOTManager');
	    for ( let i=0; i<keysarr.length; i++ ) {
		const k = keysarr[i];
		const o = broker.devices[k];
//		console.log('iot manager dev',i,o);
		addLine( k, o );
	    };
	};
	iotmanagerto = window.setTimeout( () => { fillIOTManager( box ) }, iotmngraktint );
    }
    intvalsel.onchange = ( ev ) => {
	const val = parseInt(ev.target.value);
	if ( val && !isNaN(val) && val != -1 ) {
	    iotmngraktint = val;
	    iotmngrstopmode = false;
	    window.clearTimeout( iotmanagerto );
	    fillIOTManager( document.getElementById('iotManagerCont') );
	}
	else {
	    iotmngraktint = 10000;
	    iotmngrstopmode = true;
	}
	console.log( 'intvalselchange', ev.target.value );
    }
    
    const showIOTDeviceDash = ( id, url ) => {
	document.body.classList.add('modalmode');	
	const dashdlg = document.createElement( 'div' );
	dashdlg.id="ShowDashboard";
	dashdlg.classList.add('showdash');
	const grurl = '/public-dashboards/'+url;
	dashdlg.innerHTML = '<iframe src="https://'+hostname+':3000'+grurl+'?kiosk"></iframe>';
	const cls = document.createElement( 'span' );
	cls.classList.add('clsBtn');
	cls.innerHTML = 'X';
	cls.onclick = ( ev ) => {
	    cls.replaceChildren();
	    dashdlg.replaceChildren();
	    dashdlg.remove();
	}
	dashdlg.appendChild( cls );
	document.body.appendChild(dashdlg);
    }
    const showIOTManagerDlg = () => {
	const dumDlg = document.getElementById('iotManagerCont');
	document.body.classList.add('modalmode');	
	dumDlg.classList.add('show');
	loadAllPipedDevices( () => {
	    fillIOTManager( dumDlg );
	});

	//	const mngrBox = document.getElementById('dummySenderBox');
	
//	console.log( 'clicked dokumente button' );
    }
    const hideIOTManagerDlg = () => {
	const dumDlg = document.getElementById('iotManagerCont');
	document.body.classList.remove('modalmode');	
	dumDlg.classList.remove('show');
	window.clearTimeout( iotmanagerto );
	// const dumBox = document.getElementById('dummySenderBox');
	// dumBox.replaceChildren();
	//	console.log( 'clicked dokumente button' );
    }
    const showPinDlg = ( partindex ) => {
//	console.log('showpin',aktpin.objDOM);
	document.body.classList.add('modalmode');
	document.getElementById('formPartIndex').value=partindex;
	hlp = new THREE.BoxHelper(aktpin.obj3d, 0x00ffff);
	scene.add(hlp);
	const edtDlg = document.getElementById('pinDlg');
	const cont = aktpin.objDOM.parentNode.parentNode;	
	edtDlg.classList.add('vis');
	aktPinCoords();
//	console.log( 'clicked edit pin button' );
    }
    const setPinColor = ( color ) => {
//	console.log('chosen color',aktpin.obj3d.material);
	const pinco = document.getElementById('pincolor');
	pinco.style.backgroundColor = color;
//	pinco.setAttribute('data-color',color);
	aktpin.color=color;
	aktpin.obj3d.material.color.set(color);
	aktpin.obj3d.userData.origColor=color;
//	console.log('setPinColor',color,aktpin.obj3d);
    }
    const addCatDev = ( cats, tree, o ) => {
	if ( !o.cat ) return;
	if ( !cats.includes( o.cat ) ) {
	    cats.push(o.cat);
	    tree[o.cat] = [];
	}
	tree[o.cat].push( o )
    }
    const renderCatDev = ( treeel, o ) => {
	const liel = document.createElement('li');
	liel.id = 'device-'+o.id;
	liel.title = o.name+'  Anzahl Teile: '+o.parts+'  Anzahl Schilder: '+o.signs;
	liel.setAttribute('data-devicename',o.name);
	liel.setAttribute('data-devicedbid',o.id);
	liel.innerHTML=o.name+' ('+o.parts+'/'+o.signs+')';
	const delel = document.createElement('s');
	liel.appendChild(delel);
	delel.onclick = ( ev ) => {
	    //		console.log( 'delete device', ev.target.parentNode.getAttribute('data-devicedbid') );
	    let types = 'den Twin';
	    if ( o.type && o.type === 'basic' ) types = 'das Basic';
	    modalDlg( 'Möchten Sie wirklich '+types+' '+o.name+' löschen?',
		      () => { // ok callback
			  sendDBDelete( ev.target.parentNode.getAttribute('data-devicedbid') );
			  liel.remove();
		      },
		      () => { // nok callback
		      } );
	    ev.preventDefault();
	    ev.stopPropagation();
	};
	devices.push(o);
	liel.onclick = loadDevice;
	treeel.appendChild(liel);
    }
    const renderCat = ( listdom, tree, o ) => {
	const domel = document.createElement('li');
	domel.id='cat-'+o; domel.classList.add('cat');
	domel.innerHTML = o;
	const plusel = document.createElement('b');
	plusel.innerHTML = '+';
	domel.insertAdjacentElement('afterbegin',plusel);	    
	listdom.appendChild( domel );
	const treeel = document.createElement('div');
	treeel.classList.add('tree');
	treeel.id = 'tree-'+o;
	tree[o]?.forEach( ( oo, ii ) => {
	    renderCatDev( treeel, oo );
	});
	domel.onclick = ( ev ) => {
	    if ( domel.classList.contains('open') ) {
		domel.classList.remove('open');
		treeel.classList.remove('open');
	    }
	    else {
		domel.classList.add('open');
		treeel.classList.add('open');
	    }
	}
	listdom.appendChild( treeel );
    }
    const populateDevlist = ( devs ) => {
	const devlistDom = document.querySelector('.deviceNavi ul');
	const basiclistDom = document.querySelector('.deviceNavi ol');
	if ( devs.length > 0 ) {
	    devlistDom.classList.add('filled');
	    basiclistDom.classList.add('filled');
	}
	devices.splice(0);
	devcats.splice(0); devcattree.splice(0);
	basiccats.splice(0); basiccattree.splice(0);
	devlistDom.innerHTML = '<li class="nodevs"></li>';
	basiclistDom.innerHTML = '<li class="nodevs"></li>';
//	console.log('devices[]',devlistDom.innerHTML);
	devs.forEach( ( o, i ) => {
	    if ( o.cat ) {
//		console.log( 'category found', o.cat );
		if ( o.type === 'basic' ) addCatDev( basiccats, basiccattree, o );
		else addCatDev( devcats, devcattree, o );
	    }
	});
	devcats.forEach( ( o, i ) => {
	    renderCat( devlistDom, devcattree, o );
	});
	basiccats.forEach( ( o, i ) => {
	    renderCat( basiclistDom, basiccattree, o );
	});
	fillCatSelect();
//	console.log( 'Build Cats',devcats,Object.keys(devcattree));
	devs.forEach( ( o, i ) => {
	    if ( o.cat ) return;
	    const aktDom = o.type === 'basic' ? basiclistDom : devlistDom;
	    aktDom.insertAdjacentHTML( 'beforeend',
					   '<li id="device-'+o.id+'" title="'+o.name
					   +'  Anzahl Teile: '+o.parts+'  Anzahl Schilder: '
					   +o.signs+'" data-devicedbid="'+o.id+'" data-devicename="'+o.name+'">'+o.name
					   +' ('+o.parts+'/'+o.signs+')<s></s></li>'
					 );
	    const it = document.getElementById( 'device-'+o.id );
	    const delit = it.querySelector('s');
	    delit.onclick = ( ev ) => {
//		console.log( 'delete device', ev.target.parentNode.getAttribute('data-devicedbid') );
		let types = 'den Twin';
		if ( o.type && o.type === 'basic' ) types = 'das Basic';
		modalDlg( 'Möchten Sie wirklich '+types+' '+o.name+' löschen?',
		      () => { // ok callback
			  sendDBDelete( ev.target.parentNode.getAttribute('data-devicedbid') );
			  it.remove();
		      },
		      () => { // nok callback
		      } );
		ev.preventDefault();
		ev.stopPropagation();
	    };
	    devices.push(o);
	    it.onclick = loadDevice;
	});

//	console.log('devices[]',devices);
//	console.log('devlist',devs,devlistDom);
    }
    const populateGlobals = () => {
	if ( devices.length === 0 ) {
	    window.setTimeout( () => { populateGlobals(); }, 500 );
	    return;
	}
	const deftwinSelDom = document.getElementById('deftwinSel');
	const deftwinInput = document.getElementById('deftwinName');
	deftwinSelDom.innerHTML = '<li class="nodevs">-</li>';
	deftwinSelDom.querySelector('li').onclick = ( ev ) => {
	    deftwinInput.value = '';
	    deftwinInput.removeAttribute('data-id');
	}
	console.log('populateGlobals',devices.length);
	devices.forEach( ( o, i ) => {
	    if ( o.type === 'basic' || ( o.cat && o.cat.toLowerCase().indexOf('test') > -1 ) ) {
//		console.log('no matching twin for deftwinselect', o.type, o.cat );
		return;
	    }
	    // fill the default twin select
	    const option = document.createElement('li');	    
	    option.innerHTML = o.name;
	    option.onclick = ( ev ) => {
		deftwinInput.value = o.name;
		deftwinInput.setAttribute('data-id',o.id);
		console.log('chosen deftwin', deftwinInput, o.name, o.id);
	    }
	    deftwinSelDom.appendChild(option);
	    if ( config[0].deftwin === o.id ) {
		deftwinInput.value = o.name;
		deftwinInput.setAttribute('data-id',o.id);
		console.log('default Twin?',config[0].deftwin,o.id,o.name);
	    }
	});
    }
    const saveGlobals = () => {
	const data = {
	    info : document.getElementById('infotext')?.value,
	    deftwin : document.getElementById('deftwinName').getAttribute('data-id') || ''
	};
	console.log('save Globals', data, config.length);
	if ( config.length === 0 )
	    sendDBconfCreate( data );
	else
	    sendDBconfUpdate( data );
	config.info = data.info;
    }
    const loadConfig = () => {
	const url = '/api/getconfig';
	const xhr = new XMLHttpRequest();
	xhr.open('GET',url,true);
	xhr.setRequestHeader("Content-Type", "application/json");
	xhr.onreadystatechange = function () {
	    if (xhr.readyState === 4 && xhr.status === 200) {
		var json = JSON.parse(xhr.responseText);
		config.push(json);
		document.getElementById('infotext').value = json.info;
		populateGlobals();
		/*		json.forEach( ( o, i ) => {
		    config.push( o );
		    if ( o.info ) {
			document.getElementById('infotext').value = o.info;
		    }
		    });
		    */
		console.log('loaded config',json);
	    }
	};
	xhr.send();
    }
    loadConfig();
    const loadAllDevices = () => {
	const deviceDom = document.querySelector('.deviceNavi ul');
	const basicDom = document.querySelector('.deviceNavi ol');
	deviceDom.innerHTML = '<img src="imgs/throbber.gif" /> lade Devices';
	basicDom.innerHTML = '<img src="imgs/throbber.gif" /> lade Basics';
	const url = '/api/list';
	const xhr = new XMLHttpRequest();
	xhr.open('get',url,true);
	xhr.setRequestHeader("Content-Type", "application/json");
	xhr.onreadystatechange = function () {
	    if (xhr.readyState === 4 && xhr.status === 200) {
		var json = JSON.parse(xhr.responseText);
		populateDevlist(json);
//		console.log('loaded all devices',json);
	    }
	};
	xhr.send();
    }
    loadAllDevices();
    const initPinDlg = () => {
	const colrow1 = document.getElementById('colrow1');
	const colrow2 = document.getElementById('colrow2');
	for ( let i=0; i<palette.length/2; i++ ) {
	    colrow1.insertAdjacentHTML(
		'beforeend',
		'<span class="colfield" id="colfield'+(i*2)+'" value="'+palette[i*2]+'" style="background-color:'+palette[i*2]+'" />'
	    );
	    colrow2.insertAdjacentHTML(
		'beforeend',
		'<span class="colfield" id="colfield'+(i*2+1)+'" value="'+palette[i*2+1]+'" style="background-color:'+palette[i*2+1]+'" />'
	    );
	    const colf1 = document.getElementById('colfield'+(i*2));
	    const colf2 = document.getElementById('colfield'+(i*2+1));
	    colf1.onclick = colf2.onclick = ( ev ) => {
		setPinColor( ev.target.getAttribute('value') );
	    };
	}
    }
    initPinDlg();
    const restoreBackup = ( mesh ) => {
	mesh.position.x = editbackup.pos.x;
	mesh.position.y = editbackup.pos.y;
	mesh.position.z = editbackup.pos.z;
	mesh.rotation.x = editbackup.rot.x;
	mesh.rotation.y = editbackup.rot.y;
	mesh.rotation.z = editbackup.rot.z;
	mesh.scale.x = editbackup.scl.x;
	mesh.scale.y = editbackup.scl.y;
	mesh.scale.z = editbackup.scl.z;
    }
    const backupCoords = ( mesh ) => {
	console.log('backupCoords',mesh.userData);
	editbackup.pos.x = mesh.userData.opos?.x || 0;// || mesh.position.x;
	editbackup.pos.y = mesh.userData.opos?.y || 0;// || mesh.position.y;
	editbackup.pos.z = mesh.userData.opos?.z || 0;// || mesh.position.z;
	editbackup.rot.x = mesh.userData.orot?.x || 0;// || mesh.rotation.x;
	editbackup.rot.y = mesh.userData.orot?.y || 0;// || mesh.rotation.y;
	editbackup.rot.z = mesh.userData.orot?.z || 0;// || mesh.rotation.z;
	editbackup.scl.x = mesh.userData.oscl?.x || 1;// || mesh.scale.x;
	editbackup.scl.y = mesh.userData.oscl?.y || 1;// || mesh.scale.y;
	editbackup.scl.z = mesh.userData.oscl?.z || 1;// || mesh.scale.z;
    }
    const backupLabelCoords = ( mesh ) => {
	labelbackup.pos.x = mesh.position.x;
	labelbackup.pos.y = mesh.position.y;
	labelbackup.pos.z = mesh.position.z;
	labelbackup.rot.x = mesh.rotation.x;
	labelbackup.rot.y = mesh.rotation.y;
	labelbackup.rot.z = mesh.rotation.z;
    }
    const restoreLabelBackup = ( mesh ) => {
	mesh.position.x = labelbackup.pos.x;
	mesh.position.y = labelbackup.pos.y;
	mesh.position.z = labelbackup.pos.z;
	mesh.rotation.x = labelbackup.rot.x;
	mesh.rotation.y = labelbackup.rot.y;
	mesh.rotation.z = labelbackup.rot.z;
    }
    const checkFilesReady = ( item ) => {
	if ( ! item || ! item.classList ) return;
	const nfiles = item.parentNode.querySelectorAll('.fileitem');
	let ready = true;
	for ( let i=0; i<nfiles.length; i++ ) {
	    if ( ! nfiles[i].classList.contains('ready') ) {
		ready = false;
		break;
	    }
	}
	if ( ready ) {
	    showThrobber();
	    saveDevice();
	    hideDokumenteDlg();
	}
	//	console.log( 'checkfilesready',ready);
    }
    const createFileEntry = ( id, name, size, label ) => {
//	console.log('creating File Entry',id,name,size);
	const nl = document.createElement( 'div' );
	nl.id='file'+id;
	nl.classList.add('filedesc');
	if ( !label ) label = name;
	nl.innerHTML = '<input id="label-'+id+'" value="'+ label + '" /><br/>' + name + ' (<i>' + size + 'b</i>)';
	const dl = document.createElement( 'span' );
	dl.classList.add('delbtn');
	dl.onclick=(ev) => {
	    files[id].name='';
	    nl.classList.add('deleted');
//	    console.log('delete file',id,files,name);
	}
	nl.appendChild(dl);
	return nl;
    }
    const createLinkEntry = ( ind, url, label, tooltip ) => {
//	console.log('creating Link Entry',ind,url,label,tooltip);
	const nld = document.createElement( 'div' );
	nld.classList.add('link');
	nld.setAttribute('data-index',ind);
	nld.innerHTML = '<a href="'+url+'" target="_blank" title="'+tooltip+'">'+label+'</a>';
	const nldd = document.createElement( 'span' );
	nldd.classList.add('linkdelete');
	nldd.onclick = ( ev ) => {
	    links[ind].url = '';
	    nld.classList.add('deleted');
//	    console.log('delete link');
	};
	nld.appendChild(nldd);
	return nld;
    }
    const createFile = ( raw, filedata, label, item ) => {
	const jso = {
	    'size' : filedata.size,
	    'filetype' : filedata.type,
	    'deviceid' : aktdeviceuid,
	    'filename' : filedata.name,
	    'label' : label,
	    'content' : raw
	}
//	console.log('create File',jso);
	if ( item ) item.insertAdjacentHTML( 'beforeend', '...' );

	sendDBDokCreate( jso, ( json ) => {
	    if ( item ) {
		item.insertAdjacentHTML( 'beforeend', 'fertig!' );
		item.classList.add('ready');
	    }
	    const filedesc = { 'name' : filedata.name, 'label' : label, 'size' : filedata.size, 'type' : filedata.type, 'dbid':json._id };
//	    console.log('upload finished', json, filedesc);
	    document.getElementById( 'filelist' ).appendChild(
		createFileEntry( files.length, filedesc.name,filedesc.size,filedesc.label));
	    files.push(filedesc);
	    checkFilesReady( item );
	    // callback when upload finished
	}, (msg) => {
	    // callback for error
	    console.log('upload error', msg);
	}, (ev) => {
	    // callback for progress
	    if ( item ) item.insertAdjacentHTML( 'beforeend', '.' );
//	    console.log('upload progress', ev, item);
	});

    }
    const clipString = ( str, anz ) => {
	if ( str.length > anz )
	    return str.substr(0,anz-3)+'...';
	return str;
    }
    const createSign = ( raw, fname, modifications, nocreateDom ) => {
	const img = new Image();
	img.src = raw;
	const index = signs.length;//document.querySelectorAll('.sign').length;//signlist.children.length;
	const sign3D = new THREE.PlaneGeometry( 10, 10 );
	const texture = new THREE.TextureLoader().load( raw );
	texture.wrapS = THREE.ClampToEdgeWrapping;
	texture.wrapT = THREE.ClampToEdgeWrapping;
	texture.magFilter = THREE.LinearFilter;
	texture.colorSpace = THREE.SRGBColorSpace;
	texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
//	console.log('Create Sign mods',modifications);
	const material = new THREE.MeshStandardMaterial( {
	    map: texture,
	    transparent: true,
	    side: THREE.FrontSide,
	    roughness: 0.0,
	    fog: false,	    
	    flatShading: true
	});
	if ( modifications ) {
	}
	const mesh = new THREE.Mesh( sign3D, material );
	mesh.origcolor = 0xffffff;
	mesh.userData.type = nocreateDom ? 'basicsign' : 'sign';
	mesh.userData.index = index;
	if ( modifications ) applyModifications( mesh, modifications );
	if ( ! nocreateDom ) {
	    signs.push({ 'index':index, 'fname': fname, 'img': raw, 'mesh': mesh, 'settings' : {} });
	    const signlist = document.getElementById( 'signsinner' );
	    signlist.insertAdjacentHTML( 'beforeend', '<span class="sign" id="sign'+index+'" title="'+fname+'"><i></i><s></s><b>('+clipString(fname,15)+')</b></span>' );
	    const sign = document.getElementById( 'sign'+index );
	    sign.appendChild( img );
	    sign.querySelector('i').onclick = ( ev ) => {
		editmode = true;
		aktsign = sign;
		aktmesh = mesh;
		backupCoords( mesh );
//		console.log( 'EDitbak', editbackup );
		showEditDlg('sign');
	    };
	    sign.querySelector('s').onclick = ( ev ) => {	    
		sign.remove();
		mesh.geometry.dispose();
		mesh.material.dispose();
		signmesh.remove(mesh);
//		console.log( 'clicked delete button', signs, index );
		signs.splice( index, 1 );
//		console.log( 'clicked delete button', signs, index );
	    };
	    sign.onmouseover = ( ev ) => {
		hilightPart( mesh );
	    };
	    sign.onmouseout = ( ev ) => {
		lolightParts();
	    };
	    signmesh.add( mesh );
	}
//	console.log('Create Sign', img );
	return mesh;
    }
    const copyPinStart = ( index, mesh, nmesh ) => {
//	console.log('findpinstart',mesh,parts[index].pins);
	const pa = parts[index].pins;
	if ( pa.length === 0 ) {
	    mesh.position.x = 0;
	    mesh.position.y = 10;
	    mesh.position.z = 0;
	    nmesh.position.x = labeloffset.x;
	    nmesh.position.y = labeloffset.y;
	    nmesh.position.z = labeloffset.z;
	    nmesh.rotation.y = Math.PI / 2;
	}
	else if ( pa.length === 1 ) {
	    const lastpos = pa[0].obj3d.position;
	    const lastrot = pa[0].obj3d.rotation;
	    mesh.position.x = lastpos.x+2.5445;
	    mesh.position.y = lastpos.y;
	    mesh.position.z = lastpos.z;	    
	    mesh.rotation.x = lastrot.x;
	    mesh.rotation.y = lastrot.y;
	    mesh.rotation.z = lastrot.z;	    
	    const lastlpos = pa[0].label.position;
	    const lastlrot = pa[0].label.rotation;
	    nmesh.position.x = lastlpos.x; nmesh.position.y = lastlpos.y; nmesh.position.z = lastlpos.z;
	    nmesh.rotation.x = lastlrot.x; nmesh.rotation.y = lastlrot.y; nmesh.rotation.z = lastlrot.z;
	}
	else if ( pa.length > 1 ) {
	    const lastpos = pa[pa.length-1].obj3d.position;
	    const prelastpos = pa[pa.length-2].obj3d.position;
	    const lastrot = pa[0].obj3d.rotation;
	    mesh.position.x = lastpos.x + lastpos.x - prelastpos.x;
	    mesh.position.y = lastpos.y + lastpos.y - prelastpos.y;
	    mesh.position.z = lastpos.z + lastpos.z - prelastpos.z;
	    mesh.rotation.x = lastrot.x;
	    mesh.rotation.y = lastrot.y;
	    mesh.rotation.z = lastrot.z;	    
	    const lastlpos = pa[0].label.position;
	    const lastlrot = pa[0].label.rotation;
	    nmesh.position.x = lastlpos.x;
	    nmesh.position.y = lastlpos.y;
	    nmesh.position.z = lastlpos.z;	    
	    nmesh.rotation.x = lastlrot.x;
	    nmesh.rotation.y = lastlrot.y;
	    nmesh.rotation.z = lastlrot.z;	    
	}
    }
    const getTextureFromText = ( text, bgcol, fgcol ) => {
	const fg = fgcol || '#000000';
	const bg = bgcol || '#FFFFFF';
	const canv = document.createElement( 'canvas' );//new OffscreenCanvas( 250, 50 );
	canv.width=250;
	canv.height=50;
	const ctx = canv.getContext('2d');
	ctx.fillStyle = bg;
	ctx.fillRect( 0, 0, 250, 50 );
	ctx.fillStyle = fg;
	ctx.font = 'bold 50px Arial';
	ctx.fillText (text, 10, 45, 250);
	const textAsDataUrl = canv.toDataURL();
	const img = document.createElement( 'img' )
	img.src = textAsDataUrl;
	const texture = new THREE.CanvasTexture(canv);
	texture.wrapS = THREE.ClampToEdgeWrapping;
	texture.wrapT = THREE.ClampToEdgeWrapping;
	return texture;
    };
    const addPinDOM = ( partindex, pinindex, pname, mesh ) => {
//	let pinDOM;
	const pinscont = document.querySelector( '#part'+partindex+' .pins');
	pinscont.classList.add('open');
	pinscont.insertAdjacentHTML( 'beforeend', '<div class="pin" id="pin'+partindex+'-'+pinindex
				     +'" index="'+pinindex+'"><span>'+pname+'</span><i></i><s></s></div>');
	const pinDOM = document.getElementById('pin'+partindex+'-'+pinindex);
	parts[partindex].pins[pinindex].objDOM = pinDOM;
//	console.log('addPINDOM', partindex, pinindex, pinscont.innerHTML, pinDOM);
	pinDOM.onmouseover = ( ev ) => {
	    mesh.material.color.set( '#aaaa00' );
	};
	pinDOM.onmouseout = ( ev ) => {
	    mesh.material.color.set( mesh.userData.origColor );
	};
	pinscont.querySelector('b').innerHTML = (parts[partindex].pins.length) + ' Pins';
	pinDOM.querySelector( 'i' ).onclick = ( ev ) => {
	    aktpin = parts[partindex].pins[pinindex];
	    backupCoords( mesh );
	    backupLabelCoords( aktpin.label );
	    showPinDlg(partindex);
	};
	pinDOM.querySelector( 's' ).onclick = ( ev ) => {	   
	    const tpi = parseInt(ev.target.parentNode.getAttribute('index'));
	    if ( tpi != parts[partindex].pins.length-1 ) return;
	    mesh.geometry.dispose();
	    mesh.material.dispose();
	    mesh.parent.remove(mesh);
	    pinDOM.remove();
	    let found = -1;
	    parts[partindex].pins.splice( tpi, 1 );
	    pinscont.querySelector('b').innerHTML = parts[partindex].pins.length + ' Pins';
	};
    }
    const addPin = ( index, cont3d, pinscont, pinname, pincol, pinmods, pinlabelmods, isbasicp, ppinindex ) => {
//	console.log('addPin',index,cont3d);
	const col = pincol || '#ffff00';
	let pname = pinname || 'Pin';
	let pinindex = parts[index]?parts[index].pins.length:0;
	const partname = parts[index]?parts[index].name:'unknown';
	const pin3D = new THREE.CylinderGeometry( 0.5, 0.5, 2.5 );
	const material = new THREE.MeshStandardMaterial({
	    color: col,
	    side: THREE.DoubleSide,
	    flatShading: true
	});
	const mesh = new THREE.Mesh( pin3D, material );
	mesh.userData.type='pin';
	mesh.userData.origColor=col;
	cont3d.add(mesh);
	const pinLabel = new THREE.PlaneGeometry( 8, 2 );
	const labelmaterial = new THREE.MeshStandardMaterial( {
	    map: getTextureFromText(pname),
	    side: THREE.DoubleSide,
	    flatShading: true
	});
	const nmesh = new THREE.Mesh( pinLabel, labelmaterial );
	if ( pinlabelmods ) {
	    applyModifications( nmesh, pinlabelmods );
	}
/*	else findPinStartLabel( index, nmesh );
		else {
	    nmesh.position.x = labeloffset.x;
	    nmesh.position.y = labeloffset.y;
	    nmesh.position.z = labeloffset.z;
	    nmesh.rotation.y = Math.PI / 2;
	}*/
	nmesh.userData.type='pinlabel';
	if ( pinmods ) {
	    applyModifications( mesh, pinmods );
	}
	else copyPinStart( index, mesh, nmesh );
	mesh.add(nmesh);

	if ( isbasicp ) {
	    pinindex = ppinindex;
	}
	if ( !isbasicp ) {
	    const pinDOM = document.getElementById('pin'+index+'-'+pinindex);
	    let newpin = { 'name': pname, 'objDOM': pinDOM, 'part' : partname, 'obj3d' : mesh, 'index':pinindex, 'label': nmesh, 'color' : col }
	    parts[index].pins.push(newpin);
//	    console.log('add Pin', pinindex, index);
	    pname = pinname || 'Pin '+pinindex;
	    addPinDOM( index, pinindex, pname, mesh );
//	    console.log('addPin',parts[index].pins);
	}
	else {
	    isbasicp.parts[index].pins[pinindex].obj3d = mesh;
	    isbasicp.parts[index].pins[pinindex].label = nmesh;
//	    console.log('addPin isbasic',isbasicp.parts[index].pins, pinindex);
	}
    }
    const rebuildPartsDom = () => {
	document.getElementById('partsinner').replaceChildren();
	parts.forEach( ( o, i ) => {
	    console.log('renumber Parts',o,i);
	    if ( o.type === 'basic' ) {
		addBasicPart( o, o.mesh, i+1 )
	    }
	    else {
		addPartDOM( o.name, o.fname, o.deviceid, o.brokerupmsg, o.tooltip, o.origdata, i+1 )
		addPartDOMEvents( i, o.mesh );
		if ( o.pins && o.pins.length > 0 ) {
		    o.pins.forEach( ( p, j ) => {
			addPinDOM( i, j, p.name, p.obj3d );
			console.log('PIN',j,p)
			
		    });
		}
	    }
	});
    }
    const reassignBasic = ( dobj ) => {	
	getBasics( dobj );
	console.log('reassign basic', )
    }
    const addPartDOMEvents = ( index, meshp ) => {
//	console.log('finding DOMObj',index,document.getElementById('part'+index));
	const DOMObj = document.getElementById('part'+index);
	DOMObj.onmouseover = ( ev ) => {
//	    console.log('hilite',meshp.userData.index);
	    const odynscroll = dynscroll;
	    dynscroll = false;
	    hilightPart( meshp );
	    dynscroll = odynscroll;

	};
	DOMObj.onmouseout = ( ev ) => {
	    lolightParts();
	};
	    
	DOMObj.querySelector( '.tooltip textarea' ).onchange = ( ev ) => {
	    if ( parts[index] )	parts[index].tooltip = ev.target.value;
	};
	DOMObj.querySelector( '.addPinBtn' ).onclick = ( ev ) => {
	    const pinscont = ev.target.parentNode;
	    addPin( index, meshp, pinscont );
	};
	DOMObj.querySelector( 'i' ).onclick = ( ev ) => {
//	    console.log( 'edit part' );
	    editmode = true;
	    aktmesh = meshp;
	    aktsign = DOMObj;
	    backupCoords( meshp );
//	    console.log( 'EDitbak', editbackup );
	    showEditDlg( 'part' );
	};
	DOMObj.querySelector('s').onclick = ( ev ) => {	    
	    meshp.geometry?.dispose();
	    meshp.material?.dispose();
	    mainmesh.remove(meshp);
	    DOMObj.remove();
	    parts.splice(index,1);
	    rebuildPartsDom();
//	    console.log( 'clicked delete button', parts, index, parts[index] );
	};
	DOMObj.querySelector('.partcolor').onclick = ( ev ) => {
	    aktmesh = meshp;
	    Coloris();
	};

    }
    const addPartDOM = ( namep, fnamep, deviceidp, brokerupmsg, tooltipp, origdata, rebuild ) => {
	let index=0;
	if ( ! rebuild ) {
	    parts.push({ 'name' : namep, 'fname': fnamep, 'deviceid': deviceidp, 'brokerupmsg': brokerupmsg, 'tooltip': tooltipp, 'origdata' : origdata, 'pins':[] });
	    index = parts.length-1;
	}
	else {
	    index = rebuild - 1;
	}
	const colcode = origdata && origdata.color ? origdata.color : '#888';
	document.getElementById('partsinner').insertAdjacentHTML(
	    'beforeend',
	    '<div id="part'+index+'" class="part" data-index="'+index+'"><strong>'+namep+'</strong><em>('+(fnamep||'-')+')</em><input class="partcolor" style="background:'+colcode+';" type="text" value="'+colcode+'" data-coloris /><div class="tooltip"><b>Tooltip</b> <textarea id="tooltip'+index+'" placeholder="mouseover Ballontext">'+(tooltipp||'')+'</textarea></div><div class="pins"><b>0 Pins</b><button id="addPintoPart'+index+'" data-index="'+index+'" class="addPinBtn">+</button><br /></div><i></i><s></s></div>' );

//	console.log('adding part DOM', index, document.getElementById( 'part'+index ).innerHTML);
	return index;
    }
    const addPartMesh = ( meshp, datap, index ) => {
//	console.log('adding part Mesh', index);
	parts[index].mesh = meshp;
	parts[index].origdata = datap;
	addPartDOMEvents( index, meshp );
	meshp.userData.index = index;
    }
    document.addEventListener('coloris:pick', event => {
	const col = event.detail.color;
	event.detail.currentEl.style='background:'+col;	
	if ( aktmesh ) {
	    aktmesh.origcolor = col;
	    if ( aktmesh?.material?.color ) {
		aktmesh.material.color.set( col );
	    }
	}
	
	if ( event.detail.currentEl.id === 'ambientcolor' ) {
	    ambientLight.color.set( event.detail.color );
	    console.log( 'ambient light color',event.detail.color,ambientLight);
	}
	else if ( event.detail.currentEl.id === 'light1color' ) {
	    light1.color.set( event.detail.color );
	    light1.userData.helper.update();
	    console.log( 'light1 light color',event.detail.color);
	}
	else if ( event.detail.currentEl.id === 'light2color' ) {
	    light2.color.set( event.detail.color );
	    light2.userData.helper.update();
	    console.log( 'light2 light color',event.detail.color);
	}
	else if ( event.detail.currentEl.id === 'light3color' ) {
	    light3.color.set( event.detail.color );
	    light3.userData.helper.update();
	    console.log( 'light3 light color',event.detail.color);
	}
	else if ( event.detail.currentEl.id === 'light4color' ) {
	    light4.color.set( event.detail.color );
	    light4.userData.helper.update();
	    console.log( 'light4 light color',event.detail.color);
	}
//	console.log('New Color', event.detail.currentEl.id);
    });
    const shortenPartName = ( name ) => {
	let shortname;
	if ( name.length > 19 ) {
	    const len = name.length;
	    shortname = name.substr( 0, 7 ) + '...' + name.substr( len - 10 );
	    return shortname;
	}
	else {
	    shortname = name;
	}
	return shortname;
    };
    const createButton = ( text, id, onclick ) => {
	const sbtn = document.createElement('button');
	sbtn.id = id;
	sbtn.innerHTML = text;
	sbtn.onclick = ( ev ) => {
	    onclick( ev );
	}
	return sbtn;
    }
    const addDisplaySensor = ( id, mesh, measures, height ) => {
	const ovl = document.getElementById( 'plgOvl' );
	const sensdiv = document.createElement( 'div' );
	sensdiv.id = 'display'+id; sensdiv.classList.add('sensordisplay');
	ovl.appendChild(sensdiv);
	Displays.push( { 'id' : id, 'mesh' : mesh, 'measures' : measures, 'dispdom' : sensdiv, 'height' : height||0 } );
//	console.log('add Display',id,Displays);
	return Displays.length-1;
    }
    const addBasicPart = ( basic, meshp, rebuild ) => {
	// save pins

	let index=0;
	let pinarr;
	let pincount =0;
	let partobj;
	if ( ! rebuild ) {
	    pinarr = [];
	    for ( let i=0; i<basic.parts.length; i++ ) {
		for ( let j=0; j<basic.parts[i].pins.length; j++ ) {
		    const trans = ( basic.pins && basic.pins.length > pincount ) ? basic.pins[pincount].trans : '';
		    pinarr.push({
			'part':basic.name,
			'name':basic.parts[i].pins[j].name,
			'trans':trans,
			'col':basic.parts[i].pins[j].color,
			'obj3d':basic.parts[i].pins[j].obj3d,
			'label':basic.parts[i].pins[j].label
			
		    });
//		    console.log('pinarr',i,j,basic.parts[i].pins[j],pinarr[pincount]);
		    pincount++;
		}
	    }

	    partobj = { 'name' : basic.name, 'type' : 'basic', 'id' : basic.id, 'deviceid': basic.deviceid, 'brokerupmsg': basic.brokerupmsg, 'tooltip' : basic.tooltip, 'mesh': meshp, 'pins' : pinarr, 'display' : basic.display, 'displayheight' : basic.displayheight||0, 'displaymeasures' : basic.displaymeasures };
	    parts.push( partobj );	
	    index = parts.length-1;
	}
	else {
	    index = rebuild - 1;
	    pinarr = basic.pins;
	}
	meshp.userData.index = index;
	const deviceidp = basic.deviceid || '';
	const brokerupmsg = basic.brokerupmsg || '';
//	console.log('Dound deviceid',deviceidp);
	const pi = document.getElementById('partsinner');
	const dispsens = basic.display;
	const control3D = basic.control3D;
	const disph = basic.displayheight || 0;
	pi.insertAdjacentHTML(
	    'beforeend',
	    '<div id="part'+index+'" class="part"><strong>'+basic.name+'</strong><c data-id="'+basic.id+'" title="zum Basic">BASIC</c><div class="deviceidbox"><b>Device ID</b> <input name="deviceID" class="deviceID" placeholder="ID im Broker" autocomplete="off" value="'+deviceidp+'" /><div class="brokeridselect"></div><div class="sensorout"></div><br /><b>Broker Up</b> <input class="brokerUpMsg" autocomplete="off" value="'+brokerupmsg+'" /><div class="display"><input type="checkbox" class="displaysensorcheck" id="displaySensorChk'+index+'" '+(dispsens?' checked="checked"':'')+'/><b>Display</b><span id="dispSensorHgt'+index+'" class="dispsenshgt">Höhe +<input id="dispsensheight'+index+'" value="'+disph+'" />px</span><span id="dispSensorMsr'+index+'" class="dispsensmsr"></span></div><div class="sensor3D"><b>3D control</b> <input type="checkbox" class="sensor3Dcontrol" id="sensor3DControl'+index+'" '+(control3D?' checked="checked"':'')+' /></div></div><div class="tooltip"><b>Tooltip</b> <textarea id="tooltip'+index+'" placeholder="mouseover Ballontext">'+(basic.tooltip||'')+'</textarea></div><div class="pins"><b>'+pinarr.length+' Pins</b> <button id="basicpinmap'+index+'" data-index="'+index+'" class="basicPinBtn">Anpassen</button><div class="pinmap"></div></div><i></i><s></s><d title="Basic neu zuweisen">🧷</d></div>' );
	pi.scrollTo({
	    top: pi.scrollHeight,
	    left: 0,
	    behavior: 'smooth'
	})
	const DOMObj = document.getElementById('part'+index);
	fillDisplayMeasures( DOMObj, partobj, basic.displaymeasures );
	let dispind=-1;
	if ( dispsens ) {
	    dispind = addDisplaySensor( deviceidp, meshp, basic.displaymeasures, basic.displayheight );
	};
	DOMObj.onmouseover = ( ev ) => {
//	    console.log('hilite',meshp.userData.index);
	    const odynscroll = dynscroll;
	    dynscroll = false;
	    hilightPart( meshp );
	    dynscroll = odynscroll;

	};
	DOMObj.onmouseout = ( ev ) => {
	    lolightParts();
	};

	DOMObj.querySelector( 'i' ).onclick = ( ev ) => {
//	    console.log( 'edit part' );
	    editmode = true;
	    aktmesh = meshp;
	    aktsign = DOMObj;
	    backupCoords( meshp );
//	    console.log( 'EDitbak', editbackup );
	    showEditDlg( 'part' );
	};
	DOMObj.querySelector( 'c' ).onclick = ( ev ) => {
	    quickLoadBasic( ev.target.getAttribute('data-id') )
	};
	DOMObj.querySelector('d').onclick = ( ev ) => {
	    reassignBasic( ev.target );
	};
	DOMObj.querySelector('.dispsenshgt input').onchange = ( ev ) => {
	    const va = parseInt(ev.target.value);
	    if ( !isNaN( va ) ) {
		parts[index].displayheight = va;
		if ( dispind > -1 ) {
		    Displays[dispind].height = va;
		    console.log('Display height change',Displays[dispind]);
		}
	    }
	    console.log('changed display height', va);
	};
	const closePinmap = (ev) => {
	    const par=ev.target.parentNode;
	    if ( par.classList.contains( 'pinmap' ) ) {
		par.innerHTML = '';
	    }
	    par.parentNode.querySelector('.hide').classList.remove('hide');
	}
	const selBox = DOMObj.querySelector( '.brokeridselect' );
	DOMObj.querySelector( '.deviceID' ).onfocus = ( ev ) => {
	    fillBrokerSelect( selBox );
	};
	DOMObj.querySelector( '.deviceID' ).onblur = ( ev ) => {
	    window.setTimeout( () => {
		selBox.classList.remove('show');
	    }, 200 );
	};
	DOMObj.querySelector( '.displaysensorcheck' ).onchange = ( ev ) => {
	    if ( ev.target.checked ) {
		partobj.display = true;		
		partobj.displaymeasures = [];
		partobj.displayheight = 0;
		addDisplaySensor( DOMObj.querySelector( '.deviceID' ).value, meshp, partobj.displaymeasures, 0 );
		fillDisplayMeasures( DOMObj, partobj );
	    }
	    else {
		partobj.display = false;
		deleteDisplay( basic.deviceid );
		deleteDisplayMeasures( DOMObj, partobj );
	    }
	    console.log('displaysensorcheck change', ev.target.checked);
	};
	DOMObj.querySelector( '.sensor3Dcontrol' ).onchange = ( ev ) => {
//	    if ( !partobj.deviceid ) return;
	    if ( ev.target.checked ) {
		partobj.control3D = true;
		attachSensor3D( DOMObj.querySelector( '.deviceID' ).value, meshp );
		console.log('sensor 3D control on',partobj,parts,index);
	    }
	    else {
		partobj.control3D = false;
		detachSensor3D( DOMObj.querySelector( '.deviceID' ).value );
		console.log('sensor 3D control off',partobj,parts,index);
	    }
	};
	DOMObj.querySelector('.basicPinBtn').onclick = ( ev ) => {	    
	    const outputBox = ev.target.nextSibling;
	    const saveBtn = createButton( 'Speichern', 'savePinTrans', ( evi ) => {
		for ( let i=0; i<pinarr.length; i++ ) {
		    const val =outputBox.querySelector('#pintrans'+i+' input').value;
		    pinarr[i].trans = val;
		    if ( val === '' ) {
//			pinarr[i].label.visible = false;
			pinarr[i].obj3d.visible = false;
		    }
		    else {
			pinarr[i].obj3d.visible = true;
			pinarr[i].label.material.map.dispose();
			pinarr[i].label.material.map = getTextureFromText( val );
		    }
//		    [TODO: update label]
//		    console.log( 'pinarr val', outputBox.querySelector('#pintrans'+i+' input').value,pinarr[i], parts[index] );
		}
//		closePinmap(evi);
	    });
	    const closeBtn = createButton( 'Schließen', 'closePinTrans', ( evi ) => {
		closePinmap(evi);
	    });
	    const copyallBtn = createButton( '*&gt;', 'copyAllPinTrans', ( evi ) => {
		console.log('copyallbtn',pinarr);
		for ( let i=0; i<pinarr.length; i++ ) {
		    outputBox.querySelector('#pintrans'+i+' input').value = pinarr[i].name;
		    pinarr[i].obj3d.visible = true;
		    pinarr[i].label.material.map.dispose();
		    pinarr[i].label.material.map = getTextureFromText( pinarr[i].name );
		}
		
	    });
	    outputBox.appendChild( saveBtn );
	    outputBox.appendChild( closeBtn );
	    outputBox.appendChild( copyallBtn );

//	    outputBox.insertAdjacentHTML( 'beforeend',
//				       '<button id="savePinTrans">Speichern</button><button id="closePinTrans">Schließen</button>');	    
	    for ( let i=0; i<pinarr.length; i++ ) {
		const o = pinarr[i];
		outputBox.insertAdjacentHTML( 'beforeend',
					      '<div class="pintrans" id="pintrans'+i+'" data-color="'+o.col+'">(<span>'+shortenPartName(o.part)+'</span>) <b>'+o.name+'</b><button class="pincopytrans">&gt;</button><input id="pintransval'+i+'" value="'+pinarr[i].trans+'" /></div>');
	    }
	    const ta=outputBox.querySelectorAll('.pincopytrans');
	    ta.forEach( ( o, i ) => {
		o.onclick = ( ev ) => {
		    ev.target.nextSibling.value = ev.target.previousSibling.innerHTML;
		}
	    });
	    ev.target.classList.add('hide');
//	    console.log( 'clicked basicPinBtn button', outputBox.querySelector('#savePinTrans'), pinarr.length, ev.target.nextSibling );
	};
	DOMObj.querySelector('s').onclick = ( ev ) => {	    
	    // TODO: dispose in basic
	    //	    meshp.geometry.dispose();
	    //	    meshp.material.dispose();
	    mainmesh.remove(meshp);
	    DOMObj.remove();
	    parts.splice(index,1);
	    rebuildPartsDom();
//	    console.log( 'clicked delete button', parts, index, parts[index] );
	};
	if ( basic.deviceid && basic.control3D ) {
	    console.log('broker.deviceids',broker.deviceids);
	    attachSensor3D( basic.deviceid, meshp );
	}
    }

    const create3DFromGlb = ( index, glb, fname, data, deviceid, brokerupmsg, tooltip, mods, isbasicp ) => {
	const col = data.color || '#ffffff';
	const oname = data.name || fname;
	const mesh = glb.scene;
	mesh.scale.set(50,50,50);
	mesh.userData.type = isbasicp ? 'basicpart' : 'part';
	if ( !isbasicp ) {
//	    addPartDOM(oname, fname, deviceid, brokerupmsg, tooltip, data);
	    addPartMesh(mesh, data, index);
	    mainmesh.add( mesh );
	}
	return mesh;
    };
    const create3DFromGeom = ( index, geom, fname, data, deviceid, brokerupmsg, tooltip, mods, isbasicp ) => {
	let material;
	const col = data.color || '#ffffff';
	const oname = data.name || fname;
	if ( mods && mods.ghost ) {
//	    console.log('ghost part', mods);
	    material = new THREE.MeshStandardMaterial({
		transparent: true,
		opacity: ghosttransp, flatShading: true
	    });
	}
	else {
	    material = new THREE.MeshPhongMaterial( { color: col, fog: false, flatShading: true } );
	}
	const mesh = new THREE.Mesh( geom, material );
	if ( mods && mods.ghost ) {
	    mesh.visible = false;
	}
	mesh.origcolor = col;
	mesh.userData.type = isbasicp ? 'basicpart' : 'part';
	if ( !isbasicp ) {
//	    addPartDOM(oname, fname, deviceid, brokerupmsg, tooltip, data);
	    addPartMesh(mesh, data, index);
	    mainmesh.add( mesh );
	}
	return mesh;
    };
    const create3D = ( index, data, fname, deviceid, brokerupmsg, tooltip, mods, isbasicp ) => {
	const geometry = new THREE.BufferGeometry();
	const verts = flattenVerts( data.vertices );
	const inds = flattenVerts( data.facets );
	const norms = data.normals;
	const oname = data.name;
	geometry.setIndex( inds );
	geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( verts, 3 ) );
	geometry.setAttribute( 'normal', new THREE.Float32BufferAttribute( norms, 3 ) );
	geometry.computeBoundingSphere();	
	return create3DFromGeom( index, geometry, fname, data, deviceid, brokerupmsg, tooltip, mods, isbasicp );
    }
    const finput = document.querySelector('input#newpartfile');
    finput.onchange = ( ev ) => {
//	console.log('3D File chosen',finput.value,finput.files[0]);
	const fname = finput.files[0].name;
	const reader = new FileReader();
	const ext = fname.substr(fname.lastIndexOf('.')+1);
	console.log('file:',ext);
	const index = addPartDOM( fname.replace('.'+ext,''), fname );
	if ( ext == 'json' ) {
	    reader.onload = (e) => {
		console.log('loading JSON:',e);
		const rawfile = e.target.result;
		const parsed = JSON.parse(rawfile);
		create3D( index, parsed.objects[0], fname );
	    };
	    reader.readAsText(finput.files[0]);
	}
	else if ( ext == 'stl' ) {
	    reader.onload = (e) => {
		const stlloader = new STLLoader();
		console.log('loading stl',e.target);
	    	stlloader.load( e.target.result, ( geometry ) => {
		    create3DFromGeom( index, geometry, fname, { type: 'stl', color: '#888888', file: e.target.result, name: fname.replace('.stl','') } );
//		    console.log('loaded stl',geometry);
		});
	    };
	    reader.readAsDataURL(finput.files[0]);
	}
	else if ( ext == 'glb' ) {
	    reader.onload = (e) => {
		const gltfloader = new GLTFLoader();
		console.log('loading glb',e.target);
	    	gltfloader.load( e.target.result, ( glb ) => {
		    create3DFromGlb( index, glb, fname, { type: 'glb', color: '#888888', file: e.target.result, name: fname.replace('.gltf','') } );
//		    console.log('loaded glb',glb);
		});
	    };
	    reader.readAsDataURL(finput.files[0]);
	}
    }
    const finput2 = document.getElementById('newsignfile');
    finput2.onchange = ( ev ) => {
//	console.log('Texture File chosen',finput2.value,finput2.files[0]);
    	const filedata = finput2.files[0];
	const reader = new FileReader();	    
	reader.onload = (e) => {		
	    const rawfile = e.target.result;
	    createSign( rawfile, filedata.name );
	};
	reader.readAsDataURL(filedata);
    }
    const addFile = ( file ) => {
    	const filedata = finput3.files[0];
	if ( filedata.size > MAXFILESIZE ) {
	    errorDlg('Die Datei '+filedata.name+' ist leider mit '+filedata.size+'b zu groß, es sind maximal '+MAXFILESIZE+'b erlaubt.');
	    finput3.value = '';
	    return;
	};
	const reader = new FileReader();
	reader.onload = (e) => {		
	    const rawfile = e.target.result;
	    createFile( rawfile, filedata );
//	    console.log('read file',e);
	};
	reader.readAsDataURL(filedata);
    };
    const addFiles = ( files ) => {
//	console.log('addFiles',files,typeof files);
	const flistdom = document.getElementById('newfilelist');
	for ( let i=0; i<files.length; i++ ) {
	    const xdom = document.createElement( 'div' );
	    xdom.classList.add('fileitem');
	    xdom.innerHTML = '<input class="filedesc" placeholder="Beschreibung" /><b>'+files[i].name+'</b> (<i>'+files[i].size+'</i>b)';
	    const xdeldom = document.createElement( 'span' );
	    xdeldom.classList.add("delNewFile");
	    xdeldom.innerHTML='X';
	    xdeldom.setAttribute( 'title', 'Datei entfernen' );
	    xdom.appendChild( xdeldom );
	    xdeldom.onclick = ( ev ) => {
		xdom.classList.add('deleted');
		newfiles[i] = '';
		xdeldom.innerHTML='';
//		console.log( 'delfile clicked', xdom, i, files );
	    };
	    xdom.setAttribute( 'data-index', newfiles.length );
	    flistdom.appendChild(xdom);
	    newfiles.push( files[i] );
	    const reader = new FileReader();
	    reader.onload = (e) => {		
		const rawfile = e.target.result;
		newraws[i]=rawfile;
		//		createFile( rawfile, filedata );
//		console.log('read file',e,i);
	    };
	    reader.readAsDataURL(files[i]);
	    
//	    console.log('addFile',i,files[i],xdom);
	}
    }
    const finput3 = document.getElementById('newfilefile');
    finput3.onchange = ( ev ) => {
	addFiles( finput3.files );
	finput3.value='';
    }	
//    console.log('loaded threejs',THREE);
    scene.add(mainmesh);
    scene.add(signmesh);
// animation

    const checkFrustum = (obj) => {
	var frustum = new THREE.Frustum();
	var projScreenMatrix = new THREE.Matrix4();

	camera.updateMatrix();
	camera.updateMatrixWorld();

	projScreenMatrix.multiplyMatrices( camera.projectionMatrix, camera.matrixWorldInverse );

	frustum.setFromProjectionMatrix(
	    new THREE.Matrix4().multiplyMatrices( camera.projectionMatrix, camera.matrixWorldInverse ) );
	return frustum.containsPoint ( obj.position );
    }
    const DISPWIDTHHALF = DISPWIDTH / 2;
    const DISPBOTTOMOFFSET = 5;
    const checkDisplays = (delta) => {
	for ( let i=0; i<Displays.length; i++ ) {
	    const v = new THREE.Vector3();
	    const obj=Displays[i].mesh;
	    v.copy( obj.position );
	    v.project( camera );
	    let left = Math.round((v.x+1)*width/2)-DISPWIDTHHALF;
	    let top = Math.round((-v.y+1)*height/2);
	    let bottom = height - top + DISPBOTTOMOFFSET + Displays[i].height;
	    let hinview=false;
	    let vinview=false;
	    if ( left < -30 ) left = -30;
	    else if ( left > width -100) left = width -70;
	    else hinview = true;
	    if ( top < 0 ) top = 0;
	    else if ( top > height -20) top = height-20;
	    else vinview = true;
	    if ( hinview && vinview && !checkFrustum(obj) ) {
		left=width/2 -DISPWIDTHHALF;
		bottom=DISPBOTTOMOFFSET;
		//	    console.log('falsely visible marker');
	    }
	    Displays[i].dispdom.style.left = left + 'px';
//	    Displays[i].dispdom.style.top = top + 'px';
	    Displays[i].dispdom.style.bottom = bottom + 'px';
	    //	console.log('Marker',i,markers[i].object);
	}
    }


    function animation( time ) {

	if ( mainmesh ) {
	    checkDisplays( time );
	    //	    mainmesh.rotation.x = time / 2000;
//	    mainmesh.rotation.y = time / 1000;
	    
	}
	renderer.render( scene, camera );
	TWEEN.update();
    }

    let MOUSEDOWN = false;
    let MOUSESTART = { x : 0, y : 0 };
    let MOUSEBUTTON = 0;
    let MESHSTARTPOS =  { x : 0, y : 0 };
    let EDITSTARTPOS =  { x : 0, y : 0, z : 0 };
    let EDITSTARTROT =  { x : 0, y : 0, z : 0 };
    let EDITSTARTSCL =  { x : 0, y : 0, z : 0 };
    let trans = 0.01;
    let ptrans = 0.1;
    let strans = 0.01;
    let rtrans = 0.01;
    let boxedObj = null;   
    let lastBoxedObjID = 0;   

    const Jump = ( part, overwrite ) => {
	if ( !part ) return;
	if ( dynscroll || overwrite ) {
	    const cont = part.parentNode;
	    cont.scrollTo({
		top: part.offsetTop - 100,
		left: 0,
		behavior: 'smooth'
	    })
	};
    }
    const Mark = ( part ) => {
	part?.classList.add('over');
    }
    const boxObj = ( obj, col ) => {
	if (hlp) unBox();
	boxedObj = obj;
	if ( ! col ) col = 0x00ffff;
	hlp = new THREE.BoxHelper(obj, col);
	scene.add(hlp);
	playground.classList.add('boxed');
    }
    const unBox = () => {
	    if ( hlp ) {
		hlp.geometry.dispose();
		hlp.material.dispose();
		scene.remove( hlp );
	    };
	boxedObj = null;
	playground.classList.remove('boxed');
    }
    const hilightPart = ( obj, overwrite ) => {
	if ( editmode ) return;
	const ind = obj.userData.index;
	const type = obj.userData.type;
	let part = document.getElementById('part'+ind);
//	console.log('hilight part',type);
	if ( type === 'part' ) {
	    Mark( part );
	    Jump( part, overwrite );
	    boxObj( obj, 0xbbbbbb );
//	    console.log('hilight part');
	    if ( obj.material?.color ) 
		obj.material.color.set( '#33aa88' );
	}
	else if ( type === 'basicpart' || type === 'basicsign' ) {
	    let t = obj;
	    while ( t != mainmesh && !t.userData || !t.userData.type || t.userData.type != 'basic' )
		t = t.parent;
	    part = document.getElementById('part'+t.userData.index);
	    Mark( part );
	    Jump( part, overwrite );
	    boxObj( t, 0xbbbbbb );
//	    console.log('hilight basicsign|basicpart',type);

	}
	else if ( type === 'basic' ) {
//	    console.log('hilight basic',part);
	    Mark( part );
	    Jump( part, overwrite );
	    boxObj( obj, 0xbbbbbb );
	}
	else if ( type === 'sign' ) {
	    const t=document.getElementById('sign'+ind);
//	    console.log('hilight sign');
	    if ( t ) {
		t.classList.add('over');
		if ( obj.material?.color ) 
		    obj.material.color.set( '#33aa88' );
	    }
	}
    }
    const lolightParts = () => {
	const hiparts = document.querySelector('.part.over,.sign.over');
	unBox();
	if ( hiparts ) hiparts.classList.remove('over');
	for ( let i=0; i<mainmesh.children.length; i++ ) {
	    const a=mainmesh.children[i];
	    if ( a && a.material ) a.material.color.set( a.origcolor );
	}
	for ( let i=0; i<signmesh.children.length; i++ ) {
	    const a=signmesh.children[i];
	    if ( a && a.material ) a.material.color.set( a.origcolor );
	}
    }
    const stopCapture = () => {
	capturemode = false;
	document.querySelector('#pincapture').classList.remove('hot');
    }
    const mouseOver3D = ( xp, yp ) => {
	const raycaster = new THREE.Raycaster();
	const pointer = new THREE.Vector2();
	pointer.x = (xp/width)*2-1; pointer.y = - (yp/height)*2+1;
	raycaster.setFromCamera( pointer, camera );
	const intersects = raycaster.intersectObjects( scene.children );
//	console.log('intersect', pointer, xp, yp, offset);
	if ( intersects.length > 0 ) {
	    if ( intersects[0].object.type !== 'AxesHelper'  ) {
		let o3 = intersects[0].object;
		if ( capturemode ) {
		    const posis = o3.geometry.attributes.position;
		    const face = intersects[0].face;
		    const poi = intersects[0].point;
		    if ( ! face ) return;
		    aktpin.obj3d.position.x = posis.getX(face.a);
		    aktpin.obj3d.position.y = posis.getY(face.a);
		    aktpin.obj3d.position.z = posis.getZ(face.a);
		    // aktpin.label.position.x = aktpin.obj3d.position.x + labeloffset.x;
		    // aktpin.label.position.y = aktpin.obj3d.position.y + labeloffset.y;
		    // aktpin.label.position.z = aktpin.obj3d.position.z + labeloffset.z;
		    aktPinCoords();
//		    console.log( 'intersects',intersects[0].point);//face.a,posis.getX(face.a) );
		}
		else if ( !o3.userData.type ||
			  o3.userData.type !== 'sign' &&
			  o3.userData.type !== 'basicsign' &&
			  o3.userData.type !== 'pin' &&
			  o3.userData.type !== 'pinlabel' ) {
		    if ( ! o3.userData.type ) {
			while ( o3.parent && ! o3.userData.type ) {
			    o3 = o3.parent;
			}
			if ( ! o3.userData.type ) return;
		    }
//		    console.log('intersect', o3);		    
		    
		    lolightParts();
		    hilightPart( o3 );
		}
		else if ( o3.userData.type && o3.userData.type === 'basicsign' ) {
		    while ( o3.parent && o3.userData.type !== 'basic' ) {
			o3 = o3.parent;
		    }
		    lolightParts();
		    hilightPart( o3 );
		}
		else {
		    lolightParts();
//		    console.log('intersect unknown', o3.userData);
		}
	    }
	}
	else lolightParts();
    }
    const mouseDown = ( x, y, b ) => {
	MOUSEDOWN = true;
	MOUSESTART.x = x;
	MOUSESTART.y = y;
	MOUSEBUTTON = b;
	if ( b === 0 ) {
	    MESHSTARTPOS.x = mainmesh.rotation.y;
	    MESHSTARTPOS.y = mainmesh.rotation.z;
	}
	else if ( b === 1 ) {
	    MESHSTARTPOS.x = mainmesh.position.x;
	    MESHSTARTPOS.y = mainmesh.position.y;	
	}
	if ( capturemode ) stopCapture();
	if ( boxedObj ) {
//	    console.log('dynscroll', lastBoxedObjID, boxedObj.id );
	    if ( boxedObj.id !== lastBoxedObjID ) {
		if ( dynscroll ) dynscroll = false;
	    }
	    else {
		if ( !dynscroll ) dynscroll = true;
		lastBoxedObjID = 0;
	    }
	    
	    hilightPart( boxedObj, true );
//	    console.log('dynscroll2', lastBoxedObjID, boxedObj.id );
	    lastBoxedObjID = boxedObj.id;
	}
	else {
	    if ( !dynscroll ) {
		dynscroll = true;
		lastBoxedObjID = 0;
	    }
	}
	if ( !dynscroll ) document.getElementById( 'dynamic' ).classList.add( 'fixed' );
	else document.getElementById( 'dynamic' ).classList.remove( 'fixed' );
//	console.log('mousedown', boxedObj, dynscroll);
    }
    const aktEditCoords = () => {
	console.log('aktEditCoords',aktmesh);
	if ( ! aktmesh ) return;
	document.getElementById('posx').value=aktmesh.position.x;
	document.getElementById('posy').value=aktmesh.position.y;
	document.getElementById('posz').value=aktmesh.position.z;
	document.getElementById('rotx').value=aktmesh.rotation.x;
	document.getElementById('roty').value=aktmesh.rotation.y;
	document.getElementById('rotz').value=aktmesh.rotation.z;
	document.getElementById('width').value=aktmesh.scale.x;
	document.getElementById('height').value=aktmesh.scale.y;
	document.getElementById('sclx').value=aktmesh.scale.x;
	document.getElementById('scly').value=aktmesh.scale.y;
	document.getElementById('sclz').value=aktmesh.scale.z;
	document.querySelectorAll('#editDlg .inprow input').forEach( ( o, i ) => {
	    o.value = o.value.replace( '.',',' );
	});
	if ( ! aktmesh.material ) {
	    document.getElementById('editpartconf').classList.add('hidden');	    
	}
	else {
	    document.getElementById('editpartconf').classList.remove('hidden');	    
	    if ( aktmesh.material.depthWrite )
		document.getElementById('depthwrite').checked=true;
	    else
		document.getElementById('depthwrite').checked=false;	

	    if ( aktmesh.material.opacity < 1 )
		document.getElementById('ghost').checked=true;
	    else
		document.getElementById('ghost').checked=false;	
	    console.log('akteditcoords',aktmesh.material);
	    if ( aktmesh.material.side === 0 )
		document.getElementById('frontside').checked=true;	
	    else if ( aktmesh.material.side === 1 )
		document.getElementById('backside').checked=true;	
	    else if ( aktmesh.material.side === 2 )
		document.getElementById('doubleside').checked=true;	
//	    console.log('aktConfig',aktmesh.material.side);
	}
	    
	//	document.getElementById('sclz').value=aktmesh.scale.z;
    }
    const editCopy = () => {
	const buf = {};
	buf.posx = document.getElementById('posx').value;
	buf.posy = document.getElementById('posy').value;
	buf.posz = document.getElementById('posz').value;
	buf.rotx = document.getElementById('rotx').value;
	buf.roty = document.getElementById('roty').value;
	buf.rotz = document.getElementById('rotz').value;
	buf.sclx = document.getElementById('sclx').value;
	buf.scly = document.getElementById('scly').value;
	buf.sclz = document.getElementById('sclz').value;
	localStorage.setItem('twinjago.edit.buffer', JSON.stringify(buf));
	console.log('editCopy',buf);
    }
    const editPaste = () => {
	const buf=JSON.parse(localStorage.getItem('twinjago.edit.buffer'));
	if ( !buf ) return;
	document.getElementById('posx').value=buf.posx;
	aktmesh.position.x = parseFloat(buf.posx.replace(',','.'));
	document.getElementById('posy').value=buf.posy;
	aktmesh.position.y = parseFloat(buf.posy.replace(',','.'));
	document.getElementById('posz').value=buf.posz;
	aktmesh.position.z = parseFloat(buf.posz.replace(',','.'));
	document.getElementById('rotx').value=buf.rotx;
	aktmesh.rotation.x = parseFloat(buf.rotx.replace(',','.'));
	document.getElementById('roty').value=buf.roty;
	aktmesh.rotation.y = parseFloat(buf.roty.replace(',','.'));
	document.getElementById('rotz').value=buf.rotz;
	aktmesh.rotation.z = parseFloat(buf.rotz.replace(',','.'));
	document.getElementById('sclx').value=buf.sclx;
	aktmesh.scale.x = parseFloat(buf.sclx.replace(',','.'));
	document.getElementById('scly').value=buf.scly;
	aktmesh.scale.y = parseFloat(buf.scly.replace(',','.'));
	document.getElementById('sclz').value=buf.sclz;
	aktmesh.scale.z = parseFloat(buf.sclz.replace(',','.'));
	console.log('editPaste',buf);
    }
    const pinPaste = () => {
	const buf=JSON.parse(localStorage.getItem('twinjago.pin.buffer'));
	if ( !buf ) return;
	document.getElementById('pinx').value=buf.posx;
	document.getElementById('piny').value=buf.posy;
	document.getElementById('pinz').value=buf.posz;
	document.getElementById('pinrotx').value=buf.rotx;
	document.getElementById('pinroty').value=buf.roty;
	document.getElementById('pinrotz').value=buf.rotz;
	document.getElementById('pinsclx').value=buf.sclx;
	document.getElementById('pinscly').value=buf.scly;
	document.getElementById('pinsclz').value=buf.sclz;
	document.getElementById('labelposx').value=buf.labelposx;
	document.getElementById('labelposy').value=buf.labelposy;
	document.getElementById('labelposz').value=buf.labelposz;
	document.getElementById('labelrotx').value=buf.labelrotx;
	document.getElementById('labelroty').value=buf.labelroty;
	document.getElementById('labelrotz').value=buf.labelrotz;
	if ( ! aktpin ) return;
	const obj3d = aktpin.obj3d;
	const label = aktpin.label;
	obj3d.position.x = parseFloat(buf.posx.replace(',','.'));
	obj3d.position.y = parseFloat(buf.posy.replace(',','.'));
	obj3d.position.z = parseFloat(buf.posz.replace(',','.'));
	obj3d.rotation.x = parseFloat(buf.rotx.replace(',','.'));
	obj3d.rotation.y = parseFloat(buf.roty.replace(',','.'));
	obj3d.rotation.z = parseFloat(buf.rotz.replace(',','.'));
	obj3d.scale.z = parseFloat(buf.sclz.replace(',','.'));
	obj3d.scale.x = parseFloat(buf.sclx.replace(',','.'));
	obj3d.scale.y = parseFloat(buf.scly.replace(',','.'));
	label.position.x = parseFloat(buf.labelposx.replace(',','.'));
	label.position.y = parseFloat(buf.labelposy.replace(',','.'));
	label.position.z = parseFloat(buf.labelposz.replace(',','.'));
	label.rotation.x = parseFloat(buf.labelrotx.replace(',','.'));
	label.rotation.y = parseFloat(buf.labelroty.replace(',','.'));
	label.rotation.z = parseFloat(buf.labelrotz.replace(',','.'));
	console.log('pinPaste',buf);
    }
    const pinCopy = () => {
	const buf = {};
	buf.posx = document.getElementById('pinx').value;
	buf.posy = document.getElementById('piny').value;
	buf.posz = document.getElementById('pinz').value;
	buf.rotx = document.getElementById('pinrotx').value;
	buf.roty = document.getElementById('pinroty').value;
	buf.rotz = document.getElementById('pinrotz').value;
	buf.sclx = document.getElementById('pinsclx').value;
	buf.scly = document.getElementById('pinscly').value;
	buf.sclz = document.getElementById('pinsclz').value;
	buf.labelposx = document.getElementById('labelposx').value;
	buf.labelposy = document.getElementById('labelposy').value;
	buf.labelposz = document.getElementById('labelposz').value;
	buf.labelrotx = document.getElementById('labelrotx').value;
	buf.labelroty = document.getElementById('labelroty').value;
	buf.labelrotz = document.getElementById('labelrotz').value;
	localStorage.setItem('twinjago.pin.buffer', JSON.stringify(buf));
	console.log('pinCopy',buf);
    }
    const aktPinCoords = () => {
//	console.log('aktpincoords',aktpin);
	if ( ! aktpin ) return;
	const obj3d = aktpin.obj3d;
	const label = aktpin.label;
	document.getElementById('pinx').value=obj3d.position.x;
	document.getElementById('piny').value=obj3d.position.y;
	document.getElementById('pinz').value=obj3d.position.z;
	document.getElementById('pinsclx').value=obj3d.scale.x;
	document.getElementById('pinscly').value=obj3d.scale.y;
	document.getElementById('pinsclz').value=obj3d.scale.z;
	document.getElementById('pinrotx').value=obj3d.rotation.x;
	document.getElementById('pinroty').value=obj3d.rotation.y;
	document.getElementById('pinrotz').value=obj3d.rotation.z;
	document.getElementById('labelrotx').value=label.rotation.x;
	document.getElementById('labelroty').value=label.rotation.y;
	document.getElementById('labelrotz').value=label.rotation.z;
	document.getElementById('labelposx').value=label.position.x;
	document.getElementById('labelposy').value=label.position.y;
	document.getElementById('labelposz').value=label.position.z;
	document.getElementById('pinname').value=aktpin.name;
	document.getElementById('pincolor').style.backgroundColor=aktpin.color;
	document.querySelectorAll('#pinDlg .inprow input').forEach( ( o, i ) => {
	    o.value = o.value.replace( '.',',' );
	});
    }
    const mouseUp = ( x, y ) => {
	MOUSEDOWN = false;
    }
    const mouseMove = ( xp, yp ) => {
	
	if ( MOUSEDOWN === false ) {
	    mouseOver3D(xp,yp);
	    return;
	}
/*	let diff = { x : xp - MOUSESTART.x, y : yp - MOUSESTART.y };
	if ( MOUSEBUTTON === 0 ) {
	    mainmesh.rotation.y = MESHSTARTPOS.x + ( diff.x * trans );
	    mainmesh.rotation.z = MESHSTARTPOS.y + ( diff.y * trans );
	    signmesh.rotation.x = mainmesh.rotation.x;
	    signmesh.rotation.y = mainmesh.rotation.y;
	}
	else if ( MOUSEBUTTON === 1 ) {
	    mainmesh.position.x = MESHSTARTPOS.x + ( diff.x * ptrans );
	    mainmesh.position.y = MESHSTARTPOS.y - ( diff.y * ptrans );
	    signmesh.position.x = mainmesh.position.x;
	    signmesh.position.y = mainmesh.position.y;
	}
*/
    }
    const removeMeshes = ( obj ) => {
	for ( let i=obj.children.length-1; i>=0; i-- ) {
	    const am = obj.children[i];
	    if ( am.type === "Mesh" ) {
//		console.log('removing mesh',am);
		if ( am.material.map ) am.material.map.dispose();
		am.geometry.dispose();
		am.material.dispose();
		am.parent.remove(am);
	    }
	    else if ( am.type === "Object3D" ) {
		removeMeshes( am );
	    }
	    else if ( am.type === "Group" && am.userData.id !== 'routes' ) {
		console.log('remove group',am);
		removeMeshes( am );
		am.parent.remove(am);
	    }
	    else if ( am.type === "Line" ) {
		am.geometry.dispose();
		am.material.dispose();
		am.parent.remove(am);
	    }
	    else {
//		console.log('RemoveMesh unknown type',am);
	    };
	}
    }
    const resetDevice = ( type ) => {	
	console.log('reset device', type);
	if ( type === 'basic' ) {
	    isbasic = true;
	    document.getElementById('saveDeviceBtn').classList.add('disabled');
	    document.getElementById('saveBasicBtn').classList.remove('disabled');
	    document.getElementById('liveBtn').classList.add('hidden');
	    document.getElementById('newpart').classList.remove('disabled');
	    document.getElementById('newgroup').classList.add('disabled');
	    document.getElementById( 'DokumenteBtn' ).classList.add('disabled');
	    document.getElementById( 'SzeneBtn' ).classList.add('disabled');
	    document.getElementById( 'RoutingBtn' ).classList.add('disabled');
	    document.getElementById( 'devType' ).innerHTML = 'Basic';
	}
	else {
	    isbasic = false;
	    document.getElementById('saveDeviceBtn').classList.remove('disabled');
	    document.getElementById('saveBasicBtn').classList.add('disabled');
	    document.getElementById('newpart').classList.add('disabled');
	    document.getElementById('liveBtn').classList.remove('hidden');
	    document.getElementById( 'DokumenteBtn' ).classList.remove('disabled');
	    document.getElementById( 'RoutingBtn' ).classList.remove('disabled');
	    document.getElementById( 'SzeneBtn' ).classList.remove('disabled');
	    document.getElementById('filelist').replaceChildren();
	    document.getElementById('linklist').replaceChildren();
	    document.getElementById('newfilelist').replaceChildren();
	    document.getElementById('routelist').replaceChildren();
	    document.getElementById('routingPinDlg').replaceChildren();
	    document.getElementById('newgroup').classList.remove('disabled');
	    document.getElementById( 'devType' ).innerHTML = 'Twin';
	    renderSceneData(iniscenedata);
	}
	aktsign = null;
	aktroute = null;
	aktmesh = null;
	aktpin = null;
	aktdevice = null;
	parts.splice( 0 );
	routes.splice( 0 );
	routespre.splice( 0 );
	signs.splice( 0 );
	files.splice( 0 );
	links.splice( 0 );
	Displays.splice(0);
	document.getElementById('plgOvl').replaceChildren();
	document.getElementById('partsinner').replaceChildren();
	document.getElementById('signsinner').replaceChildren();
	document.getElementById('deviceName').value = '';
	document.getElementById('mscale').value = '';
	document.getElementById('munit').value = 'Meter';
	
	//	document.getElementById('deviceID').value = '';
	document.getElementById('dok1txt').value = '';
	document.getElementById('dok2txt').value = '';
	document.getElementById('dok3txt').value = '';
//	document.getElementById('sensorout').innerHTML = '';
//	document.getElementById('sensorout').classList.remove('show');
	document.querySelector('#dbID span').innerHTML = 'new';
	removeMeshes( mainmesh );
	removeMeshes( signmesh );
	removeMeshes( routemesh );
	document.body.classList.remove('modalmode');

    }
    const findDevice = ( id ) => {
	for ( let i=0; i<devices.length; i++ ) {
	    if ( devices[i].id === id ) return devices[i];
	}
	return null;
    }
    const savePositionUserData = ( o ) => {
	o.userData.opos = { x: o.position.x, y:o.position.y, z:o.position.z};
	o.userData.orot = { x: o.rotation.x, y:o.rotation.y, z:o.rotation.z};
	o.userData.oscl = { x: o.scale.x, y:o.scale.y, z:o.scale.z};
    }
    const applyModifications = ( o, mods ) => {
	o.position.x = mods.position.x || 0; o.position.y = mods.position.y || 0;
	o.position.z = mods.position.z || 0;
	o.rotation.x = mods.rotation.x || 0; o.rotation.y = mods.rotation.y || 0;
	o.rotation.z = mods.rotation.z || 0;
	o.scale.x = mods.scale?.x || 1;
	o.scale.y = mods.scale?.y || 1;
	o.scale.z = mods.scale?.z || 1;
	savePositionUserData( o );
//	console.log('applyModifications',o.userData);
	/*	o.userData.orot = new THREE.Vector3();
	o.userData.oscl = new THREE.Vector3();
	o.position.copy(o.userData.opos);
	o.rotation.copy(o.userData.orot);
	o.scale.copy(o.userData.oscl);*/
	if ( mods.hasOwnProperty('depthWrite') ) o.material.depthWrite = mods.depthWrite;
	if ( mods.hasOwnProperty('side') ) o.material.side = mods.side;
	if ( mods.hasOwnProperty('ghost') && mods.ghost ) {
//	    console.log('applyModifications found ghost object',o,mods);
	    if ( !o.material.transparency ) o.material.transparency=true;
	    o.material.side=THREE.DoubleSide;
	    o.material.opacity = ghosttransp;
	    o.material.needsUpdate = true;
	}
    }
    const findPinObject = ( pin ) => {
//	console.log('findPinObject', pin, parts);
	for ( let i=0; i<parts.length; i++ ) {
//	    console.log('findPinObject part', parts[i].name);
	    if ( pin.part === parts[i].name ) {
//		console.log('findPinObject found part', pin.part);
		const op = parts[i].pins;
		for ( let j=0; j<op.length; j++ ) {
		    if ( op[j] && op[j].name === pin.name ) {
			return op[j];
			break;
		    }
		}
	    }
	}
	return 0;
    }
    const renderRoutes = ( dra ) => {
	document.getElementById('routelist').replaceChildren();
	routes.splice(0);
	dra.forEach( ( o, i ) => {
	    const po1 = findPinObject( o.pin1 );
	    const po2 = findPinObject( o.pin2 );
	    if ( !po1 || !po2 ) {
		o.broken = true;		
	    }
	    else {
		addRPin( po1,o.hmod,o.dmod );
		addRPin( po2,o.hmod,o.dmod );
	    }
//	    console.log('route h',o.h);
	});
//	console.log( 'render routes', dra );
    }
    const iniscenedata = {
	ambient: {
	    color: '#111111',
	    intensity: 1
	},
	lights : [
	    {
		color:'#ffffff',
		intensity: 2.5,
		position: {
		    x:2000,
		    y:500,
		    z:3000
		}
	    },
	    {
		color:'#ffffff',
		intensity: 0.01,
		position: {
		    x:-1500,
		    y:3500,
		    z:1500
		}
	    },
	    
	    {
		color:'#ffffff',
		intensity: 25000000,
		position: {
		    x:-1500,
		    y:-3500,
		    z:1500
		}
	    },
	    {
		color:'#ffffff',
		intensity: 0.01,
		position: {
		    x:1500,
		    y:4500,
		    z:-1500
		}
	    },
	
	]
    }
    const renderSceneData = ( scenedata ) => {
	console.log('render scene data',scenedata);
	const ambcolinp = document.getElementById('ambientcolor');
	ambcolinp.value = scenedata.ambient.color;
	ambcolinp.style.background = scenedata.ambient.color;
	ambientLight.color.set( scenedata.ambient.color );
	ambcolinp.dispatchEvent(new Event('input', { bubbles: true }));

	document.getElementById('ambientintensity').value = scenedata.ambient.intensity;
	ambientLight.intensity = scenedata.ambient.intensity;
	const lights = [ light1, light2, light3, light4 ];
	for ( let i=0; i<4; i++ ) {
	    const licolinp = document.getElementById('light'+(i+1)+'color');
	    licolinp.value = scenedata.lights[i].color;
	    licolinp.style.background = scenedata.lights[i].color;
	    licolinp.dispatchEvent(new Event('input', { bubbles: true }));
	    document.getElementById('light'+(i+1)+'intensity').value = scenedata.lights[i].intensity;
	    document.getElementById('light'+(i+1)+'x').value = scenedata.lights[i].position.x;
	    document.getElementById('light'+(i+1)+'y').value = scenedata.lights[i].position.y;
	    document.getElementById('light'+(i+1)+'z').value = scenedata.lights[i].position.z;
	    if ( lights[i] ) {
//		console.log('render light',i,lights[i]);
		lights[i].color.set(scenedata.lights[i].color);
		lights[i].intensity=scenedata.lights[i].intensity;
		lights[i].position.x=scenedata.lights[i].position.x;
		lights[i].position.y=scenedata.lights[i].position.y;
		lights[i].position.z=scenedata.lights[i].position.z;
		if ( lights[i].userData.helper ) lights[i].userData.helper.update();
	    }
	}
    }
    const showSceneHelpers = ( ) => {
	const lightobjs = [ light2, light3, light4 ]
	const hlp = new THREE.DirectionalLightHelper( light1 )
	light1.userData.helper = hlp;
	scene.add(hlp);
	for ( let i=0; i<3; i++ ) {
	    const o=lightobjs[i];
	    const helper = new THREE.PointLightHelper( o );
	    o.userData.helper = helper;
	    scene.add(helper);
	}
    }
    const hideSceneHelpers = ( ) => {
	const lightobjs = [ light1, light2, light3, light4 ]
	for ( let i=0; i<4; i++ ) {
	    const o=lightobjs[i];
	    if ( o.userData.helper ) {
		o.userData.helper.dispose();
		scene.remove( o.userData.helper );
		delete o.userData.helper;
	    }
	}
    }
    const renderDevice = ( devdata, isbasicp, fin ) => {
	let target;
	if ( isbasicp ) target = new THREE.Object3D();
//	console.log('render device', devdata.name);
	if ( !isbasicp ) {
	    document.getElementById('deviceName').value = devdata.name;
	    document.getElementById('deviceCat').value = devdata.category || '';
	    document.querySelector('#dbID span').innerHTML = devdata._id;
//	    console.log('render device !isbasic',devdata.type);
	    if ( devdata.type === 'basic' ) {
		document.getElementById( 'newgroup' ).classList.add('disabled');
		document.getElementById( 'DokumenteBtn' ).classList.add('disabled');
		document.getElementById( 'SzeneBtn' ).classList.add('disabled');
		document.getElementById('newpart').classList.remove('disabled');
	    }
	    else {
		document.getElementById('newpart').classList.add('disabled');
		document.getElementById( 'newgroup' ).classList.remove('disabled');
		document.getElementById( 'DokumenteBtn' ).classList.remove('disabled');
		document.getElementById( 'SzeneBtn' ).classList.remove('disabled');
	    }
	    if ( devdata.scene ) {
		renderSceneData( devdata.scene );
	    }
	    if ( devdata.doks && devdata.doks.length === 3 ) {
		for ( let i=0; i<devdata.doks.length; i++ ) {
		    const x = document.getElementById('dok'+(i+1)+'txt');
		    if ( devdata.doks[i] !== '' && x ) x.value = devdata.doks[i];
//		    console.log('found doks',devdata.doks,x);
		}
	    }
	    if ( devdata.files && devdata.files.length > 0 ) {
		const cont = document.getElementById( 'filelist' );
		const da=devdata.files;
		for ( let i=0; i<da.length; i++ ) {
//		    console.log('found file ',da[i] );
		    files.push(da[i]);
		    cont.appendChild( createFileEntry( i, da[i].name, da[i].size, da[i].label ) );
		}
	    }
	    if ( devdata.links && devdata.links.length > 0 ) {
		const cont = document.getElementById( 'linklist' );
		const da=devdata.links;
		for ( let i=0; i<da.length; i++ ) {
//		    console.log('found link ',da[i] );
		    links.push(da[i]);
		    cont.appendChild( createLinkEntry( i, da[i].url, da[i].linktext, da[i].tooltip ) );
		}
	    }
	}
//	for ( let i=0; i<devdata.parts.length; i++ ) {
	devdata.parts.forEach( ( o, i ) => {
//	    const o = devdata.parts[i];
//	    console.log('render part',o,i);
	    if ( o.type === 'basic' ) {
		loadBasic( o );
	    }
	    else {
		let o3;
		if ( !isbasicp ) addPartDOM( o.name, o.fname, o.deviceid, o.brokerupmsg, o.tooltip, o.origdata );
//		console.log('render part',o.origdata,isbasicp);
		if ( o.origdata && o.origdata.type && o.origdata.type === 'stl' ) {
		    const stlloader = new STLLoader();
		    loadopencount++;
		    stlloader.load( o.origdata.file, ( geometry ) => {
			o3 = create3DFromGeom( i, geometry, o.fname, o.origdata, o.deviceid, o.brokerupmsg, o.tooltip, o.modifications, isbasicp );
			applyModifications( o3, o.modifications );
//			console.log('loaded stl',geometry,o3);
			o.pins.forEach( ( p, j ) => {
			    const pinscont = document.querySelector('#part'+i+' .pins');
//			    console.log('add pin',p,pinscont);
			    addPin( i, o3, pinscont, p.name, p.color, p.modifications, p.labelmodifications, isbasicp, j );
			});
			if ( isbasicp && target ) target.add(o3);
			loadopencount--;
			CheckOpenCount();			
		    });
		}
		else if ( o.origdata && o.origdata.type && o.origdata.type === 'glb' ) {
		    const gltfloader = new GLTFLoader();
		    loadopencount++;
	    	    gltfloader.load( o.origdata.file, ( glb ) => {
			o3=create3DFromGlb( i, glb, o.fname, o.origdata, o.deviceid, o.brokerupmsg, o.tooltip, o.modifications, isbasicp );
			applyModifications( o3, o.modifications );
//			console.log('loaded glb',glb,o3);
			o.pins.forEach( ( p, j ) => {
			    const pinscont = document.querySelector('#part'+i+' .pins');
//			    console.log('add pin',p,pinscont);
			    addPin( i, o3, pinscont, p.name, p.color, p.modifications, p.labelmodifications, isbasicp, j );
			});
			if ( isbasicp && target ) target.add(o3);
			loadopencount--;
			CheckOpenCount();			
//			console.log('loaded glb',glb);
		    });
		}
		else {
		    o3 = create3D( i, o.origdata, o.fname, o.deviceid, o.brokerupmsg, o.tooltip, o.modifications, isbasicp );
		    applyModifications( o3, o.modifications );
		    o.pins.forEach( ( p, j ) => {
			const pinscont = document.querySelector('#part'+i+' .pins');
//			console.log('add pin json',i,p,pinscont,document.getElementById('partsinner').innerHTML);
			addPin( i, o3, pinscont, p.name, p.color, p.modifications, p.labelmodifications, isbasicp, j );
		    });
		    if ( isbasicp && target ) target.add(o3);
		}
	    }
	});
	devdata.signs.forEach( ( o, i ) => {
	    const o3=createSign( o.img, o.fname || 'noname', o.modifications, isbasicp );
	    if ( isbasicp && target ) target.add(o3);
//	    console.log( 'render sign', o, i );
	});
	if ( devdata.routes && devdata.routes.length > 0 ) {
	    devdata.routes.forEach( (o,i) => {
		routespre.push(o);
	    });
//	    devdata.routes.splice(0);
/*	    window.setTimeout( () => {
		loadclosefuncs.push( () => {
		    renderRoutes( devdata.routes );
		});
		}, 1000 );
		*/
	}
	if ( isbasicp && target ) return target;
    }
    const setCamStart = ( nc ) => {
	camstart.position.x = nc.position.x;
	camstart.position.y = nc.position.y;
	camstart.position.z = nc.position.z;
	camstart.rotation.x = nc.rotation.x;
	camstart.rotation.y = nc.rotation.y;
	camstart.rotation.z = nc.rotation.z;
    }
    const RestoreCamPos = ( akt ) => {	
	camera.position.x = akt.position.x;
	camera.position.y = akt.position.y;
	camera.position.z = akt.position.z;
	camera.rotation.x = akt.rotation.x;
	camera.rotation.y = akt.rotation.y;
	camera.rotation.z = akt.rotation.z;
	camera.updateProjectionMatrix();
	console.log('RestoerCamPos',akt);
    };
    const setControls = () => {
	const ocampo = {
	    'position' : {
		'x' : camera.position.x,
		'y' : camera.position.y,
		'z' : camera.position.z
	    },
	    'rotation' : {
		'x' : camera.rotation.x,
		'y' : camera.rotation.y,
		'z' : camera.rotation.z
	    }
	}
	controls = new ArcballControls( camera, renderer.domElement, scene );
	controls.addEventListener( 'change', (ev) => {
	    // sync the small camera for the axis triade on change of the main camera
	    //	    let ncp = 
	});
	controls.target.set( 0, 0, 0 );
//	controls.adjustNearFar = true;
	controls.setGizmosVisible( false );
	//    controls.enableGrid = true;
	controls.rotateSpeed = 1.0;
	controls.zoomSpeed = 1.2;
	controls.panSpeed = 0.8;
	
	controls.noZoom = false;
	controls.noPan = false;
	
	controls.cursorZoom = true;
	controls.staticMoving = false;
	controls.dynamicDampingFactor = 0.15;
    
//	controls.saveState();
	controls.keys = [ 65, 83, 68 ];
	RestoreCamPos(ocampo);
//	controls.update();
    }
    setControls( );
    const unsetControls = () => {
	if ( controls ) controls.dispose();
    }

    const showThrobber = () => {
	const to = document.getElementById('throbbermodal');
	to.classList.add('on');
	to.classList.add('show');
    }
    const hideThrobber = () => {
	const to = document.getElementById('throbbermodal');
	to.classList.remove('show');
	window.setTimeout( () => { to.classList.remove('on'); }, 300 );
    }
    const jsonToDevice = ( json ) => {
	renderDevice(json);		
//		controls.reset();
	if ( json.type === 'basic' ) {
	    isbasic = true;
	    document.getElementById('liveBtn').classList.add('hidden');
	    document.getElementById('saveDeviceBtn').classList.add('disabled');
	    document.getElementById('saveBasicBtn').classList.remove('disabled');
	    document.getElementById( 'DokumenteBtn' ).classList.add('disabled');
	    document.getElementById( 'SzeneBtn' ).classList.add('disabled');
	    document.getElementById( 'RoutingBtn' ).classList.add('disabled');
	    document.getElementById( 'devType' ).innerHTML = 'Basic';
	    document.getElementById( 'devStgHead' ).classList.add('basic');
	    RestoreCamPos( camstartdefault );
	}
	else {
	    isbasic = false;
	    if ( json.camstart ) {
		setCamStart( json.camstart );
		RestoreCamPos( json.camstart );
		console.log('CAMSTART');
	    }
	    document.getElementById('liveBtn').classList.remove('hidden');
	    document.getElementById( 'RoutingBtn' ).classList.remove('disabled');
	    document.getElementById('saveBasicBtn').classList.add('disabled');
	    document.getElementById('saveDeviceBtn').classList.remove('disabled');
	    document.getElementById( 'DokumenteBtn' ).classList.remove('disabled');
	    document.getElementById( 'SzeneBtn' ).classList.remove('disabled');
	    document.getElementById( 'devType' ).innerHTML = 'Twin';
	    document.getElementById( 'devStgHead' ).classList.remove('basic');
	}
	if ( json.mscale ) {
	    document.getElementById('mscale').value = json.mscale;
	    if ( json.munit ) {
		document.getElementById('munit').value = json.munit;
	    }
	}
    }
    const loadDevicePure = ( id ) => {
	const url = '/api/getOne/'+id;
	unsetControls();
	aktdeviceuid = id;
	const xhr = new XMLHttpRequest();
	xhr.open('GET',url,true);
	xhr.setRequestHeader("Content-Type", "application/json");
	xhr.onreadystatechange = function () {
	    if (xhr.readyState === 4 && xhr.status === 200) {
		var json = JSON.parse(xhr.responseText);
		jsonToDevice( json );
		setControls();
		console.log('loaded device',json);
		hideThrobber();
	    }
	};
	xhr.send();
    }
    const quickLoadBasic = ( id ) => {
	showThrobber();
	resetDevice();
	document.querySelector('.deviceNavi .selected')?.classList.remove('selected');
	console.log('quickLoadBasic', id);
	loadDevicePure( id );
    }
    const loadDevice = ( ev ) => {
	resetDevice();
	document.querySelector('.deviceNavi .selected')?.classList.remove('selected');
	showThrobber();
	ev.target.classList.add('selected');
	const devid = ev.target.getAttribute('data-devicedbid');
	const devname = ev.target.getAttribute('data-devicename');
//	const dev = findDevice( name );
	console.log('load Device',devname, devid);
	loadDevicePure( devid );
    }
    if ( location.search ) {
	const pars = location.search.substr(1).split('&');
	for ( let i=0; i<pars.length; i++ ) {
	    const par = pars[i].split('=');
	    if ( par[0] === 'id' ) {
		loadDevicePure( par[1] );
	    }
	}
    }
    const sendDBCreate = ( devdata, cb ) => {
	const url = '/api/post';
	const xhr = new XMLHttpRequest();
	xhr.open('POST',url,true);
	xhr.setRequestHeader("Content-Type", "application/json");
	xhr.onreadystatechange = function () {
	    if (xhr.readyState === 4 && xhr.status === 200) {
		var json = JSON.parse(xhr.responseText);
//		console.log('sendDBCreate',json);
		if ( cb ) cb(json);
	    }
	};
	xhr.send(JSON.stringify(devdata));
    }
    const sendDBconfCreate = ( devdata, cb ) => {
	const url = '/api/confpost';
	const xhr = new XMLHttpRequest();
	xhr.open('POST',url,true);
	xhr.setRequestHeader("Content-Type", "application/json");
	xhr.onreadystatechange = function () {
	    if (xhr.readyState === 4 && xhr.status === 200) {
		var json = JSON.parse(xhr.responseText);
//		console.log('sendDBCreate',json);
		if ( cb ) cb(json);
	    }
	};
	xhr.send(JSON.stringify(devdata));
    }
    const sendDBDokCreate = ( devdata, success, error, progress ) => {
	const url = '/api/dokpost';
	const xhr = new XMLHttpRequest();
	xhr.open('POST',url,true);
	xhr.setRequestHeader("Content-Type", "application/json");
	xhr.onreadystatechange = function () {
	    if (xhr.status === 200) {
		if ( xhr.readyState === 4 ) {
		    var json = JSON.parse(xhr.responseText);
//		    console.log('sendDBDokcreate response',json);
		    if ( success ) success( json );
		}
	    }
	    else if ( error ) error( xhr );
	};
	xhr.onprogress = ( ev ) => {
//	    console.log( 'progress', ev );
	    if ( progress ) {
		progress( ev );
	    }
	}
	xhr.send(JSON.stringify(devdata));
    }
    const sendDBconfUpdate = ( devdata, cb ) => {
	const url = '/api/configupdate';
	const xhr = new XMLHttpRequest();
	xhr.open('PATCH',url,true);
	xhr.setRequestHeader("Content-Type", "application/json");
	xhr.onreadystatechange = function () {
	    if (xhr.readyState === 4 && xhr.status === 200) {
		var json = JSON.parse(xhr.responseText);
//		console.log(json.email + ", " + json.password);
		if ( cb ) cb();
	    }
	};
	xhr.send(JSON.stringify(devdata));
    }
    const sendDBUpdate = ( id, devdata, cb ) => {
	const url = '/api/update/'+id;
	const xhr = new XMLHttpRequest();
	xhr.open('PATCH',url,true);
	xhr.setRequestHeader("Content-Type", "application/json");
	xhr.onreadystatechange = function () {
	    if (xhr.readyState === 4 && xhr.status === 200) {
		var json = JSON.parse(xhr.responseText);
//		console.log(json.email + ", " + json.password);
		if ( cb ) cb();
	    }
	};
	xhr.send(JSON.stringify(devdata));
    }
    const sendDBDelete = ( id, cb ) => {
	const url = '/api/delete/'+id;
	const xhr = new XMLHttpRequest();
	xhr.open('DELETE',url,true);
	xhr.setRequestHeader("Content-Type", "application/json");
	xhr.onreadystatechange = function () {
	    if (xhr.readyState === 4 && xhr.status === 200) {
//		console.log(xhr.responseText);
		if ( cb ) cb();
	    }
	};
	xhr.send();
    }
    const sendDBDokDelete = ( id, cb ) => {
	const url = '/api/dokdelete/'+id;
	const xhr = new XMLHttpRequest();
	xhr.open('DELETE',url,true);
	xhr.setRequestHeader("Content-Type", "application/json");
	xhr.onreadystatechange = function () {
	    if (xhr.readyState === 4 && xhr.status === 200) {
//		console.log(xhr.responseText);
		if ( cb ) cb();
	    }
	};
	xhr.send();
    }
    const getDeviceScene = () => {
	const scenestruct = {
	    ambient : {
		color: document.getElementById('ambientcolor').value,
		intensity: parseFloat( document.getElementById('ambientintensity').value )
	    },
	    lights : []
	};
	for ( let i=1; i<5; i++ ) {
	    scenestruct.lights.push({
		color: document.getElementById('light'+i+'color').value,
		intensity: document.getElementById('light'+i+'intensity').value,
		position: {
		    x: document.getElementById('light'+i+'x').value,
		    y: document.getElementById('light'+i+'y').value,
		    z: document.getElementById('light'+i+'z').value
		}
	    });
	};
	return scenestruct;
    }
    const saveDevice = ( typep ) => {
	const devicenameo = document.getElementById('deviceName');
	const devicecato = document.getElementById('deviceCat');
	const devicedbid = document.querySelector('#dbID span').innerHTML;
	const type = typep || 'bauteil';
	if ( devicenameo.value === '' ) {
	    devicenameo.classList.add('error');
	    return;
	}
	showThrobber();
	const devicename = devicenameo.value;
	const devicecat = devicecato.value;
	const devicemscale = document.getElementById('mscale').value;
	const devicemunit = document.getElementById('munit').value;
	const devicescene = getDeviceScene();
	const devicedoks = [
	    document.getElementById('dok1txt').value,
	    document.getElementById('dok2txt').value,
	    document.getElementById('dok3txt').value
	];
	setCamStart( camera );
	let devdata = { 'name': devicename, 'category': devicecat, 'type': type, 'camstart' : camstart,
			'scene': devicescene, 'doks': devicedoks, 'parts': [], 'signs': [],
			'files' : [], 'links' : [], 'routes' : [] };
	if ( devicemscale && devicemscale != '' ) {
	    devdata.mscale = devicemscale;
	    devdata.munit = devicemunit;
	};
	let basiccount = 0;
	for ( let i=0; i<parts.length; i++ ) {	    
	    let apa = parts[i];	    
	    let partdata;
	    const col = document.querySelector( '#part'+i+' .partcolor' )?.value;
	    if ( apa.origdata?.color ) apa.origdata.color = col;
//	    console.log('save part col',i,col);
	    if ( apa.type === 'basic' ) {
		partdata = {
		    'name' : apa.name,
		    'id' : apa.id,
		    'type' : apa.type,
		    'pins' : apa.pins,
		    'display' : apa.display,
		    'displayheight' : apa.displayheight,
		    'displaymeasures' : apa.displaymeasures,
		    'control3D' : apa.control3D,
		    'modifications' : {
			'position' : { 'x' : apa.mesh.position.x, 'y' : apa.mesh.position.y, 'z' : apa.mesh.position.z },
			'rotation' : { 'x' : apa.mesh.rotation.x, 'y' : apa.mesh.rotation.y, 'z' : apa.mesh.rotation.z },
			'scale' : {	'x' : apa.mesh.scale.x, 'y' : apa.mesh.scale.y, 'z' : apa.mesh.scale.z },
			'ghost' : apa.mesh.material?.opacity<1,
			'depthWrite' : apa.mesh.material?.depthWrite,
			'side' : apa.mesh.material?.side
		    }
		}
//		console.log('saving basic part data', partdata);
		basiccount++;
	    }
	    else {
		partdata = {
		    'name' : apa.name,
		    'fname' : apa.fname,
		    'origdata' : apa.origdata,
		    'pins' : [],
		    'display' : apa.display,
		    'displayheight' : apa.displayheight,
		    'displaymeasures' : apa.displaymeasures,
		    'control3D' : apa.control3D,
		    'modifications' : {
			'position' : { 'x' : apa.mesh.position.x, 'y' : apa.mesh.position.y, 'z' : apa.mesh.position.z },
			'rotation' : { 'x' : apa.mesh.rotation.x, 'y' : apa.mesh.rotation.y, 'z' : apa.mesh.rotation.z },
			'scale' : {	'x' : apa.mesh.scale.x, 'y' : apa.mesh.scale.y, 'z' : apa.mesh.scale.z },
			'ghost' : apa.mesh.material?.opacity<1,
			'depthWrite' : apa.mesh.material?.depthWrite,
			'side' : apa.mesh.material?.side
		    }
		}
	    }
	    const ttpdom = document.getElementById('tooltip'+i);
	    if ( ttpdom ) partdata.tooltip = ttpdom.value;
	    const deviddom = document.querySelector( '#part'+i+' .deviceID' );
	    if ( deviddom ) partdata.deviceid = deviddom.value;
	    const devupdom = document.querySelector( '#part'+i+' .brokerUpMsg' );
	    if ( devupdom ) partdata.brokerupmsg = devupdom.value;
	    
//	    console.log('saveDevice', partdata.deviceid);
	    if ( apa.pins ) for ( let j=0; j<apa.pins.length; j++ ) {
		let api = apa.pins[j];
		if ( api.obj3d && api.label ) {
		    let pindata = {
			'name' : api.name,
			'color' : api.color,
			'index' : api.index,
			'modifications' : {
			    'position' : { 'x' : api.obj3d.position.x, 'y' : api.obj3d.position.y, 'z' : api.obj3d.position.z },
			    'rotation' : { 'x' : api.obj3d.rotation.x, 'y' : api.obj3d.rotation.y, 'z' : api.obj3d.rotation.z },
			    'scale' : { 'x' : api.obj3d.scale.x, 'y' : api.obj3d.scale.y, 'z' : api.obj3d.scale.z }
			},
			'labelmodifications' : {
			    'position' : { 'x' : api.label.position.x, 'y' : api.label.position.y, 'z' : api.label.position.z },
			    'rotation' : { 'x' : api.label.rotation.x, 'y' : api.label.rotation.y, 'z' : api.label.rotation.z }
			}
		    };		    
//		    if ( api.pins[j].trans ) pindata.trans = api.pins[j].trans;
		    if ( partdata.pins[j] ) {
			partdata.pins[j].modifications = {
			    'position' : { 'x' : api.obj3d.position.x, 'y' : api.obj3d.position.y, 'z' : api.obj3d.position.z },
			    'rotation' : { 'x' : api.obj3d.rotation.x, 'y' : api.obj3d.rotation.y, 'z' : api.obj3d.rotation.z }
			};
			partdata.pins[j].labelmodifications = {
			    'position' : { 'x' : api.label.position.x, 'y' : api.label.position.y, 'z' : api.label.position.z },
			    'rotation' : { 'x' : api.label.rotation.x, 'y' : api.label.rotation.y, 'z' : api.label.rotation.z }
			};
			
		    }
		    else {
			partdata.pins.push( pindata );
		    }
		}
	    }
	    devdata.parts.push( partdata );
	}
	if ( typep === 'basic' && basiccount > 0 ) {
//	    console.log('basic with basics: NO GO !!!!');
	    errorDlg('Basics dürfen keine Basics enthalten!');
	    hideThrobber();
	    return;
	}
//	console.log('saveDevice',typep,basiccount);
	for ( let i=0; i<signs.length; i++ ) {
	    let asi = signs[i];
	    let signdata = {
		'img' : asi.img,
		'fname' : asi.fname,
		'index' : asi.index,
		'modifications' : {
		    'position' : { 'x' : asi.mesh.position.x, 'y' : asi.mesh.position.y, 'z' : asi.mesh.position.z },
		    'rotation' : { 'x' : asi.mesh.rotation.x, 'y' : asi.mesh.rotation.y, 'z' : asi.mesh.rotation.z },
		    'scale' : {	'x' : asi.mesh.scale.x, 'y' : asi.mesh.scale.y },
		    'depthWrite' : asi.mesh.material.depthWrite,
		    'ghost' : asi.mesh.material.opacity<1,
		    'side' : asi.mesh.material.side
		}
	    }
	    console.log('savesign',asi);
	    devdata.signs.push( signdata );
	}
	for ( let i=0; i<files.length; i++ ) {
	    const labeldom = document.getElementById('label-'+i);
	    if ( labeldom && labeldom.value ) {
		files[i].label = labeldom.value;
	    }
	    devdata.files.push( files[i] );
	    console.log('saveDevice file', files[i]);
	}
	for ( let i=0; i<links.length; i++ ) {
	    devdata.links.push( links[i] );
//	    console.log('saveDevice file', files[i]);
	}
	for ( let i=0; i<routes.length; i++ ) {
	    const o=routes[i];
	    devdata.routes.push({
		id: o.id,
		hmod: o.hmod,
		dmod: o.dmod||1,
		pin1: {
		    col: o.pin1.col,
		    name: o.pin1.name,
		    trans: o.pin1.trans,
		    part: o.pin1.part
		},
		pin2: {
		    col: o.pin2.col,
		    name: o.pin2.name,
		    trans: o.pin2.trans,
		    part: o.pin2.part
		}
	    });
//	    console.log('saveDevice route', routes[i]);
	}
//	console.log('saving routes',devdata.route);
	if ( devicedbid === 'new' ) {
//	    devices.push( devdata );
//	    const ul = type === 'basic' ? document.querySelector( '#deviceNavi ol' ) : document.querySelector( '#deviceNavi ul' );
//	    ul.classList.add('filled');
//	    ul.insertAdjacentHTML( 'beforeend', '<li id="device-'+devicename+'">'+devicename+'</li>' );
//	    const li = document.getElementById( 'device-'+devicename );
//	    li.onclick = (ev) => {
//		loadDevice( devicename )
//	    }
	    sendDBCreate( devdata, ( res ) => {
		hideThrobber();
		loadAllDevices();
		document.querySelector('#dbID span').innerHTML = res._id;
		aktdeviceuid = res._id;
//		console.log('created new',res._id);
	    });
	}
	else {
	    sendDBUpdate( devicedbid, devdata, () => { hideThrobber(); loadAllDevices();} );
//	    console.log('update',devices);
	}
	console.log('save device', devdata );

    }
    const cloneDevice = () => {
	console.log('clone Device',isbasic);
	const devicenameo = document.getElementById('deviceName');
	devicenameo.value = devicenameo.value+'_copy';
	document.querySelector('#dbID span').innerHTML = 'new';
	if ( isbasic ) saveDevice( 'basic' );
	else saveDevice();
    }
    const initMouseEvents = () => {
	playground.onmousedown = ( ev ) => {
//	    console.log('mousebutton',ev.button);
	    const rect = ev.target.getBoundingClientRect();
	    mouseDown( ev.clientX-rect.left, ev.clientY-rect.top );
//	    mouseDown( ev.clientX-offset.x, ev.clientY-offset.y,ev.button );
	};
	playground.onmouseup = ( ev ) => {
	    const rect = ev.target.getBoundingClientRect();
	    mouseUp( ev.clientX-rect.left, ev.clientY-rect.top );
//	    mouseUp( ev.clientX-offset.x, ev.clientY-offset.y );
	};
	playground.onmouseleave = ( ev ) => {
	    const rect = ev.target.getBoundingClientRect();
	    mouseUp( ev.clientX-rect.left, ev.clientY-rect.top );
//	    mouseUp( ev.clientX-offset.x, ev.clientY-offset.y );
	};
	playground.onmousemove = ( ev ) => {
	    const rect = ev.target.getBoundingClientRect();
	    mouseMove( ev.clientX-rect.left, ev.clientY-rect.top );
	};
/*	playground.addEventListener( 'wheel', event => {
	    const delta = Math.sign(event.deltaY);
	    camera.position.z += delta * Math.abs(camera.position.z) / 30;
	});
*/
    }
    initMouseEvents();
    const modalDlg = ( text, okcb, nokcb ) => {
	document.body.insertAdjacentHTML('beforeend','<div id="modalOuter"><div id="modalInner">' +
					 text + '<button id="modalYes">Ja</button>' +
					 '<button id="modalNo">Nein</button>' );
	const mdlout = document.getElementById('modalOuter');
	const mdlinn = document.getElementById('modalInner');
	const mdlyes = document.getElementById('modalYes');
	const mdlno = document.getElementById('modalNo');
	const delayedRemove = () => {
	    mdlout.classList.add('hide');
	    window.setTimeout( () => {
		mdlout.parentNode.removeChild(mdlout);
	    }, 300 );
	}
	mdlyes.onclick = ( ev ) => {
	    okcb();
	    delayedRemove();
	};
	mdlno.onclick = ( ev ) => {
	    nokcb();
	    delayedRemove();
	};
    }
    const errorDlg = ( text ) => {
	document.body.insertAdjacentHTML('beforeend','<div id="modalOuter"><div id="modalInner">' +
					 text + '<button id="modalYes">OK</button>' );
	const mdlout = document.getElementById('modalOuter');
	const mdlinn = document.getElementById('modalInner');
	const mdlyes = document.getElementById('modalYes');
	const delayedRemove = () => {
	    mdlout.classList.add('hide');
	    window.setTimeout( () => {
		mdlout.parentNode.removeChild(mdlout);
	    }, 300 );
	}
	mdlyes.onclick = ( ev ) => {
	    delayedRemove();
	};
    }
    const translateLabels = ( basic ) => {
	if ( !basic.pins ) return;
	for ( let i=0; i<basic.pins.length; i++ ) {
	    const o=basic.pins[i];
	    let f=null;
	    for (let j=0; j<basic.parts.length; j++ ) {
		for ( let k=0; k<basic.parts[j].pins.length; k++ ) {
//		    console.log('basicpin',basic.parts[j].pins[k].name, o.name);
		    if ( basic.parts[j].pins[k].name === o.name ) {
			f = basic.parts[j].pins[k];
			break;
		    }
		}
	    }
//	    console.log('basicpin found', f);
	    if ( f && f.obj3d ) {
		if ( o.trans === '' ) f.obj3d.visible = false;
		else {
		    f.obj3d.visible = true;
		    f.label.material.map.dispose();
		    f.label.material.map = getTextureFromText( o.trans );
		}
	    }
//	    console.log('basicpin',o.trans, o.part, f);
	}
//	console.log('translate labels',basic.parts,basic);
    }
    const CheckOpenCount = () => {
	if ( loadopencount < 1 && loadclosefuncs.length > 0 ) {
	    loadclosefuncs.forEach( ( o,i ) => {
		o();
	    });
	    loadclosefuncs.splice( 0 );
	    renderRoutes( routespre );
	}
    }
    const replaceBasic = ( dobj, nid ) => {
	const oldid = dobj.parentNode.querySelector('c').getAttribute('data-id');
	const dev = findDevice( oldid );
	const url = '/api/getOne/'+nid;
	const xhr = new XMLHttpRequest();
	xhr.open('GET',url,true);
	xhr.setRequestHeader("Content-Type", "application/json");
	xhr.onreadystatechange = function () {
	    if (xhr.readyState === 4 && xhr.status === 200) {
		var json = JSON.parse(xhr.responseText);
		console.log( 'replaceBasic', dobj, oldid, nid, dev, json );
	    }
	}
	xhr.send();
    }
    const loadBasic = ( basic, noloadopen ) => {
	const url = '/api/getOne/'+basic.id;
	const xhr = new XMLHttpRequest();
	if ( !noloadopen ) loadopencount++;
	xhr.open('GET',url,true);
	xhr.setRequestHeader("Content-Type", "application/json");
	xhr.onreadystatechange = function () {
	    if (xhr.readyState === 4 && xhr.status === 200) {
		var json = JSON.parse(xhr.responseText);
		basic.parts = json.parts;
		const o3=renderDevice(json,basic);
		const index = parts.length-1;
		o3.userData.index = index;
		o3.userData.type = 'basic';
		basic.name=json.name;
		if ( basic.modifications ) applyModifications( o3, basic.modifications );
		mainmesh.add(o3);
		if ( noloadopen ) {
		    translateLabels(basic);
		    addBasicPart( basic, o3 );
		}
		else {
		    loadclosefuncs.push( () => {
			//		    window.setTimeout( () => {
			translateLabels(basic);
			addBasicPart( basic, o3 );
			//		    }, 200 );
		    });
		    loadopencount--;
		    CheckOpenCount();
		}
		
	    }
	};
	xhr.send();
    }
    const selectBasic = ( id ) => {
	const dev = findDevice( id );
	loadBasic( dev, true );
//	console.log('selecting',dev);
    }
    const getBasics = ( dobj ) => {
	const ret = [];
	const cont = document.getElementById('basicselect');
	
	cont.innerHTML = '';
	const x = document.createElement('div');
	x.classList.add('basicselcls');
	x.innerHTML = 'X';
	x.onclick = ( ev ) => {
	    cont.classList.remove('show');
	    cont.replaceChildren();
	}
	cont.appendChild(x);
	devices.forEach( ( o, i ) => {
	    if ( o.type === 'basic' ) {
		const n = document.createElement('div');
		n.classList.add('basic');
		n.setAttribute( 'devid', o.id );
		n.innerHTML = o.name;
		n.onclick = ( ev ) => {
		    if ( dobj ) {
			replaceBasic( dobj, o.id );
		    }
		    else {
			selectBasic(o.id);
		    }
		    cont.classList.remove('show');
		}
		cont.appendChild(n);
	    }
	});
	cont.classList.add('show');
	return ret;
    };
    const onWindowResize = () => {
	const drect = document.getElementById('playground').getBoundingClientRect();
	
	console.log( 'displaysize', drect.width,drect.height );
	const SCREEN_HEIGHT = drect.height;
	const SCREEN_WIDTH = drect.width;

	camera.aspect = SCREEN_WIDTH / SCREEN_HEIGHT;
	camera.updateProjectionMatrix();

	renderer.setSize( SCREEN_WIDTH, SCREEN_HEIGHT );
	
//	composer.setSize( SCREEN_WIDTH, SCREEN_HEIGHT );

    }
    const showAddDisplay = () => {
	const dlg = document.getElementById('editDisplayDlg');
	dlg.insertAdjacentHTML( 'beforeend', '<h3>Display</h3>' );
	dlg.classList.add('vis');
    }
    const initButtonEvents = () => {
	document.getElementById( 'createDeviceBtn').onclick = ( ev ) => {
	    modalDlg( 'Dies wird ihre aktuellen Bearbeitungen löschen! Wollen Sie wirklich ein neuen Twin anlegen?',
		      () => { // ok callback
			  resetDevice();
		      },
		      () => { // nok callback
		      } );
	};
	document.getElementById( 'createBasicBtn').onclick = ( ev ) => {
	    modalDlg( 'Dies wird ihre aktuellen Bearbeitungen löschen! Wollen Sie wirklich ein neues Basic anlegen?',
		      () => { // ok callback
			  resetDevice( 'basic' );
		      },
		      () => { // nok callback
		      } );
	};
	document.getElementById( 'saveDeviceBtn').onclick = ( ev ) => {
	    saveDevice();
	};
	document.getElementById( 'exportLink').onclick = ( ev ) => {
	    const id = document.querySelector('#dbID span').innerHTML;
	    if ( id !== 'new' ) {
		console.log('export id',id);
		window.open('/api/getOne/'+id);
	    }
	    
	};
	document.getElementById( 'dynamic' ).onclick = ( ev ) => {
	    dynscroll = !dynscroll;
	    if ( !dynscroll ) document.getElementById( 'dynamic' ).classList.add( 'fixed' );
	    else document.getElementById( 'dynamic' ).classList.remove( 'fixed' );
	};
	document.getElementById( 'dupDeviceBtn').onclick = ( ev ) => {
	    cloneDevice();
	};
	document.getElementById( 'saveBasicBtn').onclick = ( ev ) => {
	    saveDevice( 'basic' );
	};
	document.getElementById( 'globalSettings').onclick = ( ev ) => {
	    showGlobalDlg();
	};
	document.getElementById( 'globalCancel').onclick = ( ev ) => {
	    hideGlobalDlg();
	};
	document.getElementById( 'globalConfirm').onclick = ( ev ) => {
	    saveGlobals();
	    hideGlobalDlg();
	};
	document.getElementById( 'dummySender').onclick = ( ev ) => {
	    showDummySenderDlg();
	};
	document.getElementById( 'dummySenderClose').onclick = ( ev ) => {
	    hideDummySenderDlg();
	};
	document.getElementById( 'iotManagerBtn').onclick = ( ev ) => {
	    showIOTManagerDlg();
	};
	// document.getElementById( 'iotMngrTabBroker').onclick = ( ev ) => {
	//     if ( ev.target.classList.contains( 'active' ) ) return;
	//     ev.target.parentNode.parentNode.querySelectorAll( '.active' ).forEach( ( o, i ) => {
	// 	o.classList.remove('active');
	//     });
	//     ev.target.classList.add('active');
	//     document.getElementById('iotMngrList').classList.add('active');
	// };
	// document.getElementById( 'iotMngrTabPipeguy').onclick = ( ev ) => {
	//     if ( ev.target.classList.contains( 'active' ) ) return;
	//     ev.target.parentNode.parentNode.querySelectorAll( '.active' ).forEach( ( o, i ) => {
	// 	o.classList.remove('active');
	//     });
	//     ev.target.classList.add('active');
	//     document.getElementById('iotMngrListPipeguy').classList.add('active');
	// };
	document.getElementById( 'iotManagerClose').onclick = ( ev ) => {
	    hideIOTManagerDlg();
	};
	document.getElementById( 'newgroup').onclick = ( ev ) => {
	    if ( ev.target.classList.contains('disabled') ) return;
	    const basics = getBasics();
	};
	document.getElementById( 'newgroup').onclick = ( ev ) => {
	    if ( ev.target.classList.contains('disabled') ) return;
	    const basics = getBasics();
	};
	document.getElementById( 'display' ).onclick = ( ev ) => {
	    if ( ev.target.classList.contains('disabled') ) return;
	    showAddDisplay();
	};
	const importHandler = ( finput ) => {
	    const fname = finput.files[0].name;
	    const ext = fname.substr(fname.lastIndexOf('.')+1);
	    resetDevice();
	    console.log('import twin:',finput.files[0].name,ext);
	    if ( ext === 'json' ) {
		console.log('import json');
		const reader = new FileReader();
		reader.onload = (e) => {
		    const rawfile = e.target.result;
		    const parsed = JSON.parse(rawfile);
		    parsed._id = 'new';
		    jsonToDevice( parsed );
		    console.log('loading JSON:',parsed);
		};
		reader.readAsText(finput.files[0]);
	    }
	}
	document.getElementById( 'importTwin' ).onchange = ( ev ) => {
	    const finput = ev.target;
	    importHandler( finput );
	};
	document.getElementById( 'importBasic' ).onchange = ( ev ) => {
	    const finput = ev.target;
	    importHandler( finput );
	};

	window.addEventListener( 'resize', onWindowResize );
    }
    initButtonEvents();
    const setEditValuesFromForm = ( fo ) => {
//	editaction = fo.elements.editmode.value;
//	editaxis = fo.elements.editaxis.value
    }
    const setDeviceId = ( id, selbox ) => {
	const boxcont = selbox.parentNode;
	const partcont = boxcont.parentNode;
	const index = parseInt(partcont.getAttribute('data-index'));
	const inp = boxcont.querySelector( '.deviceID' );
	const out = boxcont.querySelector( '.sensorout' );
//	console.log('set device id',partcont,id,selbox,inp, index);
	if ( parts[index] && parts[index].deviceid ) {
	    parts[index].deviceid = id;
	}
	if ( inp ) inp.value=id;
	if ( broker.devices[id] ) {
	    aktdevice = id;
	    aktsensorout = out;
	    out.classList.add('show');
	}
	else {
	    out.classList.remove('show');
	}
	
	/*
	  document.getElementById( 'deviceID' ).value = id;
	const outbox = document.getElementById( 'sensorout' );
	outbox.innerHTML='';
	    */
    };
    
    const fillDisplayMeasures = ( dspBox, part, prefill ) => {
	const dispmsrdiv = dspBox.querySelector('.dispsensmsr');
	const id = dspBox.querySelector('.deviceID').value;
	if ( !broker.devices[id] || !broker.devices[id].meta ) return;
	dispmsrdiv.replaceChildren();
	const msrs = broker.devices[id].meta.payloadStructure;
	for ( let i=0; i<msrs.length; i++ ) {
//	    console.log('fillDisplayMeasures',part,prefill,msrs[i]);
	    const nc = document.createElement('input');
	    nc.type = 'checkbox';
	    nc.classList.add('dispmsrinp');
	    if ( prefill ) for ( let j=0; j<prefill.length; j++ ) {
		if ( prefill[j].name === msrs[i].name ) {
//		    console.log('found measure',prefill[j].name, msrs[i].name);
		    nc.checked = 'checked';
		}
	    };
	    nc.onchange = ( ev ) => {
		console.log('dispmeasure change',Displays,part);
		if ( ev.target.checked ) {
		    if ( ! part.displaymeasures ) part.displaymeasures = [];
		    part.displaymeasures.push( msrs[i] );
		    console.log('add measure',msrs[i],part.displaymeasures);
		}
		else {
		    const ii = part.displaymeasures.indexOf(msrs[i])
		    part.displaymeasures.splice(ii,1);
		    console.log('remove measure',msrs[i],part.displaymeasures);
		}
	    }
	    dispmsrdiv.appendChild( nc );
	    dispmsrdiv.insertAdjacentHTML( 'beforeend',msrs[i].name );
	}
//	console.log('fill Display',id,dispmsrdiv,msrs,part.display);
	//	selbox.replaceChildren();
    }
    const deleteDisplayMeasures = ( dspBox ) => {
	const dispmsrdiv = dspBox.querySelector('.dispsensmsr');
	dispmsrdiv.replaceChildren();
	const dispchkdiv = dspBox.querySelector('.displaysensorcheck');
	dispchkdiv.checked=false;
	
	console.log('delete Display',dspBox);
//	selbox.replaceChildren();
    }
    const deleteDisplay = ( id ) => {
	for ( let i=0; i<Displays.length; i++ ) {
	    console.log('delete Display',id,Displays[i].id);
	    if ( Displays[i].id === id ) {
		Displays.splice(i,1);
		break;
	    }
	}
	const disp = document.getElementById( 'display'+id );
	if ( disp ) disp.parentNode.removeChild(disp);
    }
    const devInUse = ( id ) => {
	const devsInUse = document.querySelectorAll('.part .deviceID');
	console.log('devsInUse',devsInUse);
	for ( let i=0; i<devsInUse.length; i++ ) {
	    console.log('found devinuse?',id,devsInUse[i].value);
	    if ( devsInUse[i].value === id ) {
		console.log('found ');
		return true;
	    }
	};
	return false;
    }
    const fillBrokerSelect = ( selbox ) => {
//	const selbox = document.getElementById( 'brokeridselect' );
	selbox.replaceChildren();
//	console.log('broker devices',broker.devices);
	const keysarr = Object.keys(broker.devices);	
	const partnode = selbox.parentNode.parentNode;
	const nodev = document.createElement( 'div' );
	nodev.innerHTML = '--';
	const deviceIdClick = ( k ) => {
	    const oldid = partnode.querySelector('.deviceID').value;
	    setDeviceId(k, selbox );
	    selbox.classList.remove('show');
	    deleteDisplay( oldid );
	    deleteDisplayMeasures( partnode );
	    console.log(k);
	}
	const deviceIdBlank = () => {
	    const oldid = partnode.querySelector('.deviceID').value;
	}
	nodev.onclick = ( ev ) => {
	    deviceIdClick('--');
	}
	selbox.appendChild(nodev);
	for ( let i=0; i<keysarr.length; i++ ) {
	    const k = keysarr[i];
	    const o = broker.devices[k];
//	    console.log('device',i,k,o);
	    const devlabel = document.createElement( 'div' );
	    devlabel.innerHTML = k;
	    if ( devInUse( k ) ) {
		devlabel.classList.add('inactive');
	    }
	    else {
		devlabel.onclick = ( ev ) => {
		    deviceIdClick( k );
		}
	    }
	    selbox.appendChild(devlabel);
//	    selbox.insertAdjacentHTML( 'beforeend',
//				       '<div>'+k+'</div>' );
	};
	selbox.classList.add('show');
    }
    const ROUTEHEIGHT = 5;
    const add3DRoute = ( ro ) => {
//	console.log('adding 3D route',ro);
	const rtmsh = new THREE.Object3D();
	const pinoffs = { 'x':0, 'y':0,'z':-1 };
	const routeh = ROUTEHEIGHT + (ro.hmod?ro.hmod:0) + routes.length;
	// start end points
	let hv1 = new THREE.Vector3();
	ro.pin1.obj3d.getWorldPosition(hv1);
	let hv2 = new THREE.Vector3();
	ro.pin2.obj3d.getWorldPosition(hv2);

	// first point, just up
	let hv11 = hv1.clone();
	hv11.z += routeh;
	// second point half way y to target
	let hv12 = hv11.clone();
	const min= Math.min( hv12.y, hv2.y );
	const max= Math.max( hv12.y, hv2.y );
	let dist = ( max - min ) / 2;
	hv12.y = min + dist;
	// third point, move x to target x
	let hv13 = hv12.clone();
	hv13.x = hv2.x;
	// last point, over target, z is first point z
	let hv21 = hv2.clone();
	hv21.z = hv11.z;
//	console.log('pin hmod',ro.hmod);

	const material = new THREE.LineBasicMaterial({
	    color: ro.pin1.col,
	    linewidth: 500
	});

	const points = [ hv1, hv11, hv12, hv13, hv21, hv2 ];

	const geometry = new THREE.BufferGeometry().setFromPoints( points );
	//	    geometry.computeBoundingSphere();
	const line = new THREE.Line( geometry, material );
	rtmsh.add( line );
	const halfpi = Math.PI / 2;
	const rtcylrots = [
	    { x: halfpi, y: 0, z: 0 },
	    { x: 0, y: halfpi, z: 0 },
	    { x: 0, y: 0, z: halfpi },
	    { x: 0, y: halfpi, z: 0 },
	    { x: halfpi, y: 0, z: 0 }
	]
	const calcHeight = ( p1, p2 ) => {
	    const h1 = Math.abs( p1.x - p2.x );
	    const h2 = Math.abs( p1.y - p2.y );
	    const h3 = Math.abs( p1.z - p2.z );
	    return Math.max( h1, h2, h3 );
	}
	const calcPosition = ( p1, p2 ) => {
	    const rp = { x:0,y:0,z:0 };
	    const dx = ( p2.x - p1.x ) / 2;
	    rp.x = p1.x + dx;
	    const dy = ( p2.y - p1.y ) / 2;
	    rp.y = p1.y + dy;
	    const dz = ( p2.z - p1.z ) / 2;
	    rp.z = p1.z + dz;
	    return rp;
	}
	const addRTCylinder = ( p1, p2, h, d, rot, col ) => {
	    const cylg = new THREE.CylinderGeometry( 0.1 * d, 0.1 * d, h + 0.1, 8 );
	    //		const cylm = new THREE.MeshBasicMaterial( { color: 0xffffff } );
	    const cylm = new THREE.MeshBasicMaterial( { color: col } );
	    const cyl = new THREE.Mesh( cylg, cylm );
	    cyl.rotation.set( rot.x, rot.y, rot.z );
	    const pos = calcPosition( p1, p2 );
	    cyl.position.set( pos.x, pos.y, pos.z );
	    rtmsh.add(cyl);
	};
	for ( let i=0; i<points.length-1; i++ ) {
	    const h = calcHeight( points[i], points[i+1] );
	    addRTCylinder( points[i], points[i+1], h, ro.dmod, rtcylrots[i], ro.pin1.col );
	}
	routemesh.add( rtmsh );
	ro.obj3d = rtmsh;
	//	    console.log('add 3D Route',pos1arr,pos2arr,pinoffs);
    }
    const idify = ( name ) => {
	return name.replace( /\ /g, '_' );
    }
    const hideRoutingPinDlg = () => {
	const rpd = document.getElementById('routingPinDlg');
	rpd.replaceChildren();
	rpd.classList.remove('vis');
    }
    const addRPin = ( o, h, d ) => {
	const cont = document.getElementById('routelist');
	const rpd = document.getElementById('routingPinDlg');
	d=d||1;
	if ( cont.classList.contains('target') ) {
	    cont.classList.remove('target');
	    aktroute.pin2 = o; aktroute.state = 2;
	    const routeo = cont.querySelector('.route.active');
	    routeo.insertAdjacentHTML( 'beforeend', '<div class="rpin secondpin"><i>'+shortenPartName(o.part)+'</i><b>'+o.name+'</b></div>' );
	    const db = document.createElement( 'div' );
	    db.classList.add('delbtn');
	    db.onclick = ( ev ) => {
		let i=routes.length;
		for ( ;i>=0;i-- ) {
		    if ( routes[i] && routes[i].id && routes[i].id === routeo.id ) break;
		}
		let ar = routes[i];
//		console.log('delete route click',ar);
		removeMeshes( ar.obj3d );
//		ar.obj3d.geometry.dispose();
//		ar.obj3d.material.dispose();
		ar.obj3d.parent.remove(ar.obj3d);
		routes.splice( i,1);
		routeo.remove();
	    };
	    routeo.appendChild(db);
	    routeo.classList.remove('active');
	    routeo.id=idify(aktroute.pin1.name+'-'+o.name);
	    aktroute.id=routeo.id;
	    rpd.classList.remove('pin2');
	    rpd.classList.remove('vis');
	    add3DRoute(aktroute);
//	    console.log('route second pin');
	    // set second pin
	}
	else {
	    const route = {
		'pin1' : o,
		'hmod' : h?h:0,
		'dmod' : d?d:1,
		'state' : 1
	    }
	    aktroute = route;
	    routes.push( route );
	    cont.classList.add('target');
	    rpd.classList.add('pin2');
	    cont.insertAdjacentHTML( 'beforeend', '<div class="route active"><div class="rpin firstpin"><i>'+shortenPartName(o.part)+'</i><b>'+o.name+'</b> </div> <div class="rmid"><b style="color:'+(o.col||'#ffff00')+'"></b><br />H <input class="rhmod" id="rhmod'+routes.length+'" value="'+(h?h:0)+'" /> D <input class="rhmod" id="rdmod'+routes.length+'" value="'+(d?d:0)+'" /></div> </div>' );
	    const hinp = document.getElementById('rhmod'+routes.length);
	    hinp.onblur = ( ev ) => {
		route.hmod = parseInt(hinp.value);
//		console.log('route hmod',route)
	    }
	    const dinp = document.getElementById('rdmod'+routes.length);
	    dinp.onblur = ( ev ) => {
		route.dmod = parseInt(dinp.value);
//		console.log('route hmod',route)
	    }
	    cont.scrollTo({
		top: cont.scrollHeight,
		left: 0,
		behavior: 'smooth'
	    })
	    // set first pin
	}
//	console.log('adding RPin',o);
    }
    const addDevicePins = ( cont ) => {
	const dp = [];
	for ( let i=0; i<parts.length; i++ ) {
	    const akt = parts[i];
	    if ( akt.pins.length > 0 ) {
		akt.pins.forEach( ( o, i ) => {
		    console.log('akt pin',o.name,o.trans,o.obj3d);
		    let pname = o.name;
		    if ( o.trans !== '' ) pname = o.trans;
		    dp.push( o );
		    const x=document.createElement( 'div' );
		    x.id=('selpin'+i);
		    x.classList.add('selpin');
		    x.innerHTML='<i>'+o.part+'</i> -&gt; <b>'+pname+'</b>';
		    x.onclick = ( ev ) => { addRPin( o ); }
		    cont.appendChild(x);
		});
	    };
	}
	//	    console.log('getDevicePins',dp);
	return dp;
    }
    const initEditEvents = () => {
//	const fo=document.getElementById( 'editForm' );
/*	fo.onchange = ( ev ) => {
	    setEditValuesFromForm(fo);
	    console.log('editformchange',fo.elements.editmode.value,fo.elements.editaxis.value);
	}
*/
	document.getElementById('DokumenteBtn').onclick = ( ev ) => {
	    if ( ev.target.classList.contains('disabled') ) return;
	    showDokumenteDlg();
	}
	document.getElementById('ambientcolor').onchange = ( ev ) => {
	    console.log('change ambient color',ev.target.value);
	}
	document.getElementById('ambientintensity').onchange = ( ev ) => {
	    console.log('change ambient intensity',ev.target.value,ambientLight.intensity);
	}
	document.getElementById('SzeneBtn').onclick = ( ev ) => {
	    if ( ev.target.classList.contains('disabled') ) return;
	    showSzeneDlg();
	}
	document.getElementById('RoutingBtn').onclick = ( ev ) => {
	    if ( ev.target.classList.contains('disabled') ) return;
	    const routinglyr = document.getElementById('routingDlg');
	    document.body.classList.add('modalmode');
	    if ( routinglyr.classList.contains( 'vis' ) ) {
		routinglyr.classList.remove( 'vis' );
	    }
	    else {
		routinglyr.classList.add( 'vis' );
	    }
	}
	document.getElementById('liveBtn').onclick = ( ev ) => {
	    const id = document.querySelector('#dbID span').innerHTML;
	    if ( id !== 'new' )
		location.href='/?id='+id;
	    console.log('livebtn',id);
	}
	document.getElementById('dokDlgCls').onclick = ( ev ) => {
	    hideDokumenteDlg();
	}
	document.getElementById('sznDlgCls').onclick = ( ev ) => {
	    hideSzeneDlg();
	}
	document.getElementById('deldokdo').onclick = ( ev ) => {
	    const maintlyr = document.getElementById('dokdbmaint');
	    const dbid = document.getElementById('deldokid').value;
	    sendDBDokDelete(dbid, () => {
		document.getElementById('deldokid').value='';
		maintlyr.insertAdjacentHTML('beforeend', '<div>'+dbid+' gelöscht!</div>' );
	    });
	}
	document.getElementById('dbmaintbtn').onclick = ( ev ) => {
	    const maintlyr = document.getElementById('dokdbmaint');
	    if ( maintlyr.classList.contains('active') ) {
		maintlyr.classList.remove('active');
	    }
	    else {
		maintlyr.classList.add('active');
	    }
	}
	const deleteMarkedFiles = () => {
	    for ( let i=files.length-1; i>=0; i-- ) {
		if ( files[i].name === '' ) {
		    sendDBDokDelete(files[i].dbid);
		    files.splice( i, 1 );
		}
	    }
	    document.querySelectorAll('#filelist .filedesc.deleted').forEach( (o,i) => {
		o.remove();
	    })
	}
	const deleteMarkedLinks = () => {
	    for ( let i=links.length-1; i>=0; i-- ) {
		if ( links[i].url === '' ) {
		    links.splice( i, 1 );
		}
	    }
	    document.querySelectorAll('#linklist .link.deleted').forEach( (o,i) => {
		o.remove();
	    })
	}
	document.getElementById('dokDlgSave').onclick = ( ev ) => {
	    const filebox = document.getElementById('newfilebox');
	    const items = filebox.querySelectorAll( '.fileitem' );
	    items.forEach( ( o, i ) => {
		const fname = o.querySelector( 'b' ).innerHTML;
		const label = o.querySelector( '.filedesc' ).value;
		if ( o.classList.contains('deleted') || o.classList.contains('ready') ) {
		    console.log('deleted || ready',fname);
		    return;
		}
		const fsize = o.querySelector( 'i' ).innerHTML;
		o.querySelector('.delNewFile').remove();
		createFile( newraws[i], newfiles[i], label, o );
		console.log('found newfile',fname, fsize, newfiles[i], newraws[i]);
	    });
	    if ( items.length === 0 ) {
		showThrobber();
		deleteMarkedFiles();
		deleteMarkedLinks();
		saveDevice();
		hideDokumenteDlg();
		document.body.classList.remove('modalmode');
	    }
	}
	document.getElementById('routingclose').onclick = ( ev ) => {
	    hideRoutingPinDlg();
	    document.getElementById('routingDlg').classList.remove( 'vis' );
	    document.body.classList.remove('modalmode');
	}
	const addRouteDecoration = () => {
	    const cont = document.getElementById('routingPinDlg');
	    cont.replaceChildren();
	    cont.insertAdjacentHTML( 'beforeend', '<h3>Wählen Sie einen Pin:</h3>');
	    const cls = document.createElement( 'div' );
	    cls.classList.add('routingPinDlgCls');
	    cls.innerHTML = 'X';
	    cls.onclick = ( ev ) => {
		hideRoutingPinDlg();
	    }
	    cont.appendChild(cls);
	}
	document.getElementById('newroute').onclick = ( ev ) => {
	    const cont = document.getElementById('routingPinDlg');
	    addRouteDecoration();
	    cont.classList.add('vis');
	    const devicepins = addDevicePins(cont);
	    
	}
	document.getElementById('reroute').onclick = ( ev ) => {
	    removeMeshes( routemesh );
	    const reroutes = JSON.parse(JSON.stringify(routes));
	    routes.splice(0);
	    document.getElementById('routelist').replaceChildren();
	    renderRoutes( reroutes );
	    console.log('reroute', reroutes);
	}
	document.getElementById('newlink').onclick = ( ev ) => {
	    document.getElementById('newlinktargeturl').value='';
	    document.getElementById('newlinktext').value='';
	    document.getElementById('newlinktooltip').value='';
	    document.getElementById('editlinkdlg').classList.add('active');
	}
	document.getElementById('linkclsbtn').onclick = ( ev ) => {
	    document.getElementById('editlinkdlg').classList.remove('active');
	}
	document.getElementById('linkaddbtn').onclick = ( ev ) => {
	    const urld = document.getElementById('newlinktargeturl');
	    const url = urld.value;
	    const linktextd = document.getElementById('newlinktext');
	    const linktext = linktextd.value;
	    const tooltip = document.getElementById('newlinktooltip').value;
	    let err=false;
	    if ( linktext === '' ) {
		linktextd.classList.add('err');
		err=true;
	    }
	    else {
		linktextd.classList.remove('err');
	    }
	    if ( url === '' ) {
		urld.classList.add('err');
		err=true;
	    }
	    else {
		urld.classList.remove('err');
	    }
	    if ( err ) return;
	    const nld=createLinkEntry( links.length, url, linktext, tooltip );
	    document.getElementById('linklist').appendChild(nld);
	    
	    const newlink = { 'url' : url, 'linktext' : linktext, 'tooltip' : tooltip };
	    links.push(newlink);
	    document.getElementById('editlinkdlg').classList.remove('active');
	    console.log('add link',url,linktext,tooltip);
	    //	    document.getElementById('editlinkdlg').classList.remove('active');
	}


	

	
	document.getElementById('glass').onclick = ( ev ) => {
	    const texture = aktmesh.material.map;
	    const col = aktmesh.material.color;
	    console.log('glassclick',ev.target.checked);
	    if ( ev.target.checked ) {
		const material = new THREE.MeshPhysicalMaterial( {
		    map: texture,
		    side: THREE.DoubleSide,
		    metalness: 0,
		    roughness: 0,
		    transmission: 1,
		    thickness: 0.5,
		    color: col, flatShading: true
		})
		aktmesh.material = material;
	    }
	    else {
		const material = new THREE.MeshStandardMaterial( {
		    map: texture,
		    transparent: true,
		    side: THREE.DoubleSide,
		    color: col, flatShading: true
		})
		aktmesh.material = material;
	    }

	}
	document.getElementById('depthwrite').onclick = ( ev ) => {
	    console.log('depthwrite click',ev.target.checked,aktmesh);
	    if ( ev.target.checked ) {
		aktmesh.material.depthWrite = true;
		console.log('depthwrite click on', aktmesh);
	    }
	    else {
		aktmesh.material.depthWrite = false;
		console.log('depthwrite click off', aktmesh);
	    }

	}
	document.getElementById('ghost').onclick = ( ev ) => {
	    if ( ev.target.checked ) {
		if ( ! aktmesh.material.transparent ) aktmesh.material.transparent=true;
		aktmesh.material.opacity = ghosttransp;
		aktmesh.visible = false;
		console.log('ghost click on', aktmesh);
	    }
	    else {
		aktmesh.material.opacity = 1;
		aktmesh.visible = true;
		console.log('ghost click off', aktmesh);
	    }
	    console.log('making ghost',aktmesh);
	}
	document.getElementById('frontside').onclick = ( ev ) => {
	    console.log('frontside click',ev.target.checked,aktmesh.material);
	    aktmesh.material.side = THREE.FrontSide;
	}
	document.getElementById('backside').onclick = ( ev ) => {
	    console.log('backside click',ev.target.checked,aktmesh.material);
	    aktmesh.material.side = THREE.BackSide;
	}
	document.getElementById('doubleside').onclick = ( ev ) => {
	    console.log('doubleside click',ev.target.checked,aktmesh.material);
	    aktmesh.material.side = THREE.DoubleSide;
	}
	document.getElementById('labelrotxhs').onclick = ( ev ) => {
	    aktpin.label.rotation.x+=Math.PI/2;
	    if ( aktpin.label.rotation.x > Math.PI ) aktpin.label.rotation.x=-Math.PI/2;
	    ev.preventDefault();
	    aktPinCoords();
	};
	document.getElementById('labelrotyhs').onclick = ( ev ) => {
	    aktpin.label.rotation.y+=Math.PI/2;
	    if ( aktpin.label.rotation.y > Math.PI ) aktpin.label.rotation.y=-Math.PI/2;
	    ev.preventDefault();
	    aktPinCoords();
	};
	document.getElementById('labelrotzhs').onclick = ( ev ) => {
	    aktpin.label.rotation.z+=Math.PI/2;
	    if ( aktpin.label.rotation.z > Math.PI ) aktpin.label.rotation.z=-Math.PI/2;
	    ev.preventDefault();
	    aktPinCoords();
	};
	document.getElementById('pinrotxhs').onclick = ( ev ) => {
	    aktpin.obj3d.rotation.x+=Math.PI/2;
	    if ( aktpin.obj3d.rotation.x > Math.PI ) aktpin.obj3d.rotation.x=-Math.PI/2;
//	    ev.preventDefault();
	    aktPinCoords();
	};
	document.getElementById('pinrotyhs').onclick = ( ev ) => {
	    aktpin.obj3d.rotation.y+=Math.PI/2;
	    if ( aktpin.obj3d.rotation.y > Math.PI ) aktpin.obj3d.rotation.y=-Math.PI/2;
	    ev.preventDefault();
	    aktPinCoords();
	};
	document.getElementById('pinrotzhs').onclick = ( ev ) => {
	    aktpin.obj3d.rotation.z+=Math.PI/2;
	    if ( aktpin.obj3d.rotation.z > Math.PI ) aktpin.obj3d.rotation.z=-Math.PI/2;
	    ev.preventDefault();
	    aktPinCoords();
	};
	document.getElementById('partrotxhs').onclick = ( ev ) => {
	    aktmesh.rotation.x+=Math.PI/2;
	    if ( aktmesh.rotation.x > Math.PI ) aktmesh.rotation.x=-Math.PI/2;
	    ev.preventDefault();
	    aktEditCoords();
	};
	document.getElementById('partrotyhs').onclick = ( ev ) => {
	    aktmesh.rotation.y+=Math.PI/2;
	    if ( aktmesh.rotation.y > Math.PI ) aktmesh.rotation.y=-Math.PI/2;
	    ev.preventDefault();
	    aktEditCoords();
	};
	document.getElementById('partrotzhs').onclick = ( ev ) => {
	    aktmesh.rotation.z+=Math.PI/2;
	    if ( aktmesh.rotation.z > Math.PI ) aktmesh.rotation.z=-Math.PI/2;
	    ev.preventDefault();
	    aktEditCoords();
	};
	document.getElementById('editCancel').onclick = ( ev ) => {
	    editmode = false;
	    document.body.classList.remove('modalmode');
	    restoreBackup(aktmesh);
	    const dlgdom = document.getElementById('editDlg');
	    dlgdom.className = '';
	    if ( edithlp ) {
		edithlp.geometry.dispose();
		edithlp.material.dispose();
		scene.remove( edithlp );
	    };
	    ev.preventDefault();
	};
	document.getElementById('pinCancel').onclick = ( ev ) => {
//	    editmode = false;
	    restoreBackup(aktpin.obj3d);
	    restoreLabelBackup(aktpin.label);
	    document.getElementById('pinDlg').classList.remove('vis');
	    if ( hlp ) {
		hlp.geometry.dispose();
		hlp.material.dispose();
		scene.remove( hlp );
	    };
	    document.body.classList.remove('modalmode');
	    ev.preventDefault();
	};
	document.getElementById('editCopy').onclick = ( ev ) => {
	    editCopy();
	};
	document.getElementById('editPaste').onclick = ( ev ) => {
	    editPaste();
	    console.log('editPaste');	    
	};
	document.getElementById('editConfirm').onclick = ( ev ) => {
	    editmode = false;
	    savePositionUserData(aktmesh);
	    if ( edithlp ) {
		edithlp.geometry.dispose();
		edithlp.material.dispose();
		scene.remove( edithlp );
	    };
	    document.getElementById('editDlg').className = '';
	    document.body.classList.remove('modalmode');
	    ev.preventDefault();
	};
	document.getElementById('pinname').onblur = ( ev ) => {
	    aktpin.name = ev.target.value;
//	    console.log('pinname',aktpin,ev.target.value);
	};
	document.getElementById('pinCopy').onclick = ( ev ) => {
	    pinCopy();
	};
	document.getElementById('pinPaste').onclick = ( ev ) => {
	    pinPaste();
	};
	document.getElementById('pinConfirm').onclick = ( ev ) => {
//	    editmode = false;
	    if ( hlp ) {
		hlp.geometry.dispose();
		hlp.material.dispose();
		scene.remove( hlp );
	    };
	    aktpin.name = document.getElementById('pinname').value;
	    const aktpartindex = document.getElementById('formPartIndex').value;
	    let DOMO = document.querySelector( '#pin'+aktpartindex+'-'+aktpin.index+' span' );
	    aktpin.label.material.map.dispose();
	    aktpin.label.material.map = getTextureFromText( aktpin.name );
	    console.log('save pin',aktpin,DOMO);
	    DOMO.textContent = aktpin.name;
	    document.getElementById('pinDlg').classList.remove('vis');
	    ev.preventDefault();
	    document.body.classList.remove('modalmode');
	};
/*	document.getElementById('pincapture').onclick = ( ev ) => {
	    if ( ev.target.classList.contains('hot') ) {
		capturemode = false;
		ev.target.classList.remove('hot');
	    }
	    else {
		capturemode = true;
		ev.target.classList.add('hot');
	    }
	};
*/
	document.getElementById('deviceName').onblur = ( ev ) => {
	    if ( ev.target.value !== '' ) ev.target.classList.remove('error');
	};
	document.getElementById('deftwinName').onfocus = ( ev ) => {
	    document.getElementById('deftwinSel').classList.add('show');
	    //	    if ( ev.target.value !== '' ) ev.target.classList.remove('error');
	};
	document.getElementById('deftwinName').onblur = ( ev ) => {
	    window.setTimeout( () => {
		document.getElementById('deftwinSel').classList.remove('show');
	    }, 200 );
//	    if ( ev.target.value !== '' ) ev.target.classList.remove('error');
	};
	document.getElementById('deviceCat').onfocus = ( ev ) => {
	    const type = isbasic ? 'bas' : 'dev';
	    showCatSelect( type );
	    console.log('deviceCat focus');
	};
	document.getElementById('deviceCat').onblur = ( ev ) => {
	    const type = isbasic ? 'bas' : 'dev';
	    window.setTimeout( () => {
		hideCatSelect( type );
	    }, 200 );
	    console.log('deviceCat blur');
	};
	// Coord Number Fields
	document.querySelectorAll( '.coord,.lightstrength' ).forEach( ( o,i ) => {
	    o.onblur = ( ev ) => {
		if ( ev.target.value && ev.target.value.indexOf(',')>-1) {
		    ev.target.value = ev.target.value.replace( ',', '.' );
		}
		let v = parseFloat(ev.target.value).toFixed(4);
		o.value=v;
		console.log( 'value', ev.target.value,v,o,o.value );
		if ( ev.target.id === 'posx' ) aktmesh.position.x = v;
		else if ( ev.target.id === 'posy' ) aktmesh.position.y = v;
		else if ( ev.target.id === 'posz' ) aktmesh.position.z = v;
		else if ( ev.target.id === 'rotx' ) aktmesh.rotation.x = v;
		else if ( ev.target.id === 'roty' ) aktmesh.rotation.y = v;
		else if ( ev.target.id === 'rotz' ) aktmesh.rotation.z = v;
		else if ( ev.target.id === 'width' ) aktmesh.scale.x = v;
		else if ( ev.target.id === 'height' ) aktmesh.scale.y = v;
		else if ( ev.target.id === 'sclx' ) aktmesh.scale.x = v;
		else if ( ev.target.id === 'scly' ) aktmesh.scale.y = v;
		else if ( ev.target.id === 'sclz' ) aktmesh.scale.z = v;
		else if ( ev.target.id === 'pinx' ) aktpin.obj3d.position.x = v;
		else if ( ev.target.id === 'piny' ) aktpin.obj3d.position.y = v;
		else if ( ev.target.id === 'pinz' ) aktpin.obj3d.position.z = v;
		else if ( ev.target.id === 'pinsclx' ) aktpin.obj3d.scale.x = v;
		else if ( ev.target.id === 'pinscly' ) aktpin.obj3d.scale.y = v;
		else if ( ev.target.id === 'pinsclz' ) aktpin.obj3d.scale.z = v;
		else if ( ev.target.id === 'pinrotx' ) aktpin.obj3d.rotation.x = v;
		else if ( ev.target.id === 'pinroty' ) aktpin.obj3d.rotation.y = v;
		else if ( ev.target.id === 'pinrotz' ) aktpin.obj3d.rotation.z = v;
		else if ( ev.target.id === 'labelposx' ) aktpin.label.position.x = v;
		else if ( ev.target.id === 'labelposy' ) aktpin.label.position.y = v;
		else if ( ev.target.id === 'labelposz' ) aktpin.label.position.z = v;
		else if ( ev.target.id === 'ambientintensity' ) ambientLight.intensity = v;
		else if ( ev.target.id === 'light1intensity' ) light1.intensity = v;
		else if ( ev.target.id === 'light1x' ) light1.position.x = v;
		else if ( ev.target.id === 'light1y' ) light1.position.y = v;
		else if ( ev.target.id === 'light1z' ) light1.position.z = v;
		else if ( ev.target.id === 'light2intensity' ) light2.intensity = v;
		else if ( ev.target.id === 'light2x' ) light2.position.x = v;
		else if ( ev.target.id === 'light2y' ) light2.position.y = v;
		else if ( ev.target.id === 'light2z' ) light2.position.z = v;
		else if ( ev.target.id === 'light3intensity' ) light3.intensity = v;
		else if ( ev.target.id === 'light3x' ) light3.position.x = v;
		else if ( ev.target.id === 'light3y' ) light3.position.y = v;
		else if ( ev.target.id === 'light3z' ) light3.position.z = v;
		else if ( ev.target.id === 'light4intensity' ) light4.intensity = v;
		else if ( ev.target.id === 'light4x' ) light4.position.x = v;
		else if ( ev.target.id === 'light4y' ) light4.position.y = v;
		else if ( ev.target.id === 'light4z' ) light4.position.z = v;
		aktPinCoords();
		aktEditCoords();
		console.log('changed coord',ev.target.id);
	    };
	});

	// Coord Number Hotspots
	document.querySelectorAll( '.hotspot' ).forEach( ( o,i ) => {
	    o.onmousedown = ( ev ) => {
		dragmode = true;
		dragtarget = ev.target;
		draginp = document.getElementById( ev.target.id.replace('hs','' ) );
		dragstartval = parseFloat(draginp.value);
		dragmousestart = ev.clientY;
		if ( ev.target.getAttribute( 'data-factor' ) )
		    dragfactor = parseFloat( ev.target.getAttribute( 'data-factor' ) );
//		console.log('Enter Dragmode',dragmousestart,dragstartval,draginp);
	    };
	});
	window.onmouseup = ( ev ) => {
	    if ( dragmode ) {
		dragmode = false;
		dragfactor = 0.1;
		aktPinCoords();
		aktEditCoords();
		console.log('Leave Dragmode',dragtarget);
	    };
	};
	window.onmouseleave = ( ev ) => {
	    if ( dragmode ) {
		dragmode = false;
		dragfactor = 0.1;
		aktPinCoords();
		aktEditCoords();
		console.log('Leave Dragmode',dragtarget);
	    };
	};
	window.onmousemove = ( ev ) => {
	    if ( dragmode ) {
		const fact = dragfactor;//0.1;
		let diff = (  dragmousestart - ev.clientY );
		diff = diff * Math.abs(diff) * fact / 20;
		const newv = dragstartval + diff;
		draginp.value = newv.toFixed(4);
		let cobj=null;
		if ( dragtarget.id === 'posxhs' ) aktmesh.position.x = newv;
		else if ( dragtarget.id === 'posyhs' ) aktmesh.position.y = newv;
		else if ( dragtarget.id === 'poszhs' ) aktmesh.position.z = newv;
		else if ( dragtarget.id === 'rotxhs' ) aktmesh.rotation.x = newv;
		else if ( dragtarget.id === 'rotyhs' ) aktmesh.rotation.y = newv;
		else if ( dragtarget.id === 'rotzhs' ) aktmesh.rotation.z = newv;
		else if ( dragtarget.id === 'widthhs' ) aktmesh.scale.x = newv;
		else if ( dragtarget.id === 'heighths' ) aktmesh.scale.y = newv;
		else if ( dragtarget.id === 'sclxhs' ) aktmesh.scale.x = newv;
		else if ( dragtarget.id === 'sclyhs' ) aktmesh.scale.y = newv;
		else if ( dragtarget.id === 'sclzhs' ) aktmesh.scale.z = newv;
		else if ( dragtarget.id === 'pinxhs' ) aktpin.obj3d.position.x = newv;
		else if ( dragtarget.id === 'pinyhs' ) aktpin.obj3d.position.y = newv;
		else if ( dragtarget.id === 'pinzhs' ) aktpin.obj3d.position.z = newv;
		else if ( dragtarget.id === 'pinsclxhs' ) aktpin.obj3d.scale.x = newv;
		else if ( dragtarget.id === 'pinsclyhs' ) aktpin.obj3d.scale.y = newv;
		else if ( dragtarget.id === 'pinsclzhs' ) aktpin.obj3d.scale.z = newv;
		else if ( dragtarget.id === 'labelposxhs' ) aktpin.label.position.x = newv;
		else if ( dragtarget.id === 'labelposyhs' ) aktpin.label.position.y = newv;
		else if ( dragtarget.id === 'labelposzhs' ) aktpin.label.position.z = newv;
		else if ( dragtarget.id === 'ambientintensityhs' ) ambientLight.intensity = newv;
		else if ( dragtarget.id === 'light1xhs' ) { light1.position.x = newv; cobj = light1; }
		else if ( dragtarget.id === 'light1yhs' ) { light1.position.y = newv; cobj = light1; }
		else if ( dragtarget.id === 'light1zhs' ) { light1.position.z = newv; cobj = light1; }
		else if ( dragtarget.id === 'light2xhs' ) { light2.position.x = newv; cobj = light2; }
		else if ( dragtarget.id === 'light2yhs' ) { light2.position.y = newv; cobj = light2; }
		else if ( dragtarget.id === 'light2zhs' ) { light2.position.z = newv; cobj = light2; }
		else if ( dragtarget.id === 'light3xhs' ) { light3.position.x = newv; cobj = light3; }
		else if ( dragtarget.id === 'light3yhs' ) { light3.position.y = newv; cobj = light3; }
		else if ( dragtarget.id === 'light3zhs' ) { light3.position.z = newv; cobj = light3; }
		else if ( dragtarget.id === 'light4xhs' ) { light4.position.x = newv; cobj = light4; }
		else if ( dragtarget.id === 'light4yhs' ) { light4.position.y = newv; cobj = light4; }
		else if ( dragtarget.id === 'light4zhs' ) { light4.position.z = newv; cobj = light4; }
		else if ( dragtarget.id === 'light1intensityhs' || dragtarget.id === 'light1intensity' ) {
		    light1.intensity = newv; cobj = light1; }
		else if ( dragtarget.id === 'light2intensityhs' || dragtarget.id === 'light2intensity' ) {
		    light2.intensity = newv; cobj = light2; }
		else if ( dragtarget.id === 'light3intensityhs' || dragtarget.id === 'light3intensity' ) {
		    light3.intensity = newv; cobj = light3; }
		else if ( dragtarget.id === 'light4intensityhs' || dragtarget.id === 'light4intensity' ) {
		    light4.intensity = newv; cobj = light4; }
		if ( cobj && cobj.userData.helper ) {
		    cobj.userData.helper.update();		    
		}
		if ( hlp ) hlp.update();
	    };
	};
	
	// Keyboard Events
	window.onkeydown = ( ev ) => {
	    if ( ev.keyCode === 16 ) { // shift
		if ( SHIFTPRESSED ) return;
		SHIFTPRESSED = true;
	    }
	    else if ( ev.keyCode === 17 ) { // strg
	    }
	    else if ( ev.keyCode === 82 ) { // r
	    }
	    else if ( ev.keyCode === 77 ) { // m
	    }
	    else if ( ev.keyCode === 83 ) { // s
	    }	    
	}
	window.onkeyup = ( ev ) => {
	    if ( ev.keyCode === 16 ) { // shift
		SHIFTPRESSED = false;
	    }
	}
    }
    initEditEvents();

    // FH-Header
    const fhheader = document.querySelector('header');
    fhheader.onmouseenter = () => {
//	console.log('enter fhheader');
	fhheader.classList.remove('hidden');
    }
    fhheader.onmouseleave = () => {
//	console.log('leave fhheader');
	fhheader.classList.add('hidden');
    }
    window.setTimeout( () => {
	fhheader.classList.add('hidden');
    }, 2000 );

    HTMLready = true;
};
