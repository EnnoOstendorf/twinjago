import * as THREE from 'three';
import { ArcballControls } from 'three/addons/controls/ArcballControls.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

console.log('Welcome to the IOT-System-Frontend of FH Münster');
const scene = new THREE.Scene();
let playground = null;
let aktdevice = null;
let lastdevice = null;
let HTMLready = false;
const HEADER_HIDE_AFTER = 20000; // time until header is hidden

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

const MSGBUFFERLINES = 4;

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

const aktMeter = ( vals ) => {
    const meterdom = document.getElementById('sensormeters');
    let htmlbuf = '';
    for ( let i=0; i<vals.length; i++ ) {
	htmlbuf += '<div class="meterroot"><span>'+vals[i].value+'</span><h4>'+vals[i].measure+'</h4></div>';
    }
    meterdom.innerHTML = htmlbuf;
//    console.log( 'aktMeter', vals, meterdom );
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
	broker.devices[id].datacount++;
	let message = '';
	const outcontainer = document.getElementById( 'sensorout' );
	const devidcontainer = document.getElementById( 'sensorid' );
	if ( !broker.devices[id].meta || !broker.devices[id].meta.payloadStructure ) {
	    // Devices wich do net send a payload Structure on the meta channel could not be handled atm
	    // nothing will be written to influx
	    //	    console.log('no payloadStructure for id '+id+', no writePoint(',msg,')');
	    return;
	};
	const meterdom = document.getElementById('sensormeters');
	const meters = [];
	for( let i=0; i<broker.devices[id].meta.payloadStructure.length; i++ ) {
	    const o = broker.devices[id].meta.payloadStructure[i];
	    message += o.name + ': ' + msg[i] + '  ';
	    meters.push( { 'measure' : o.name, 'value' : msg[i] } );
	    //	    writePoint( broker.devices[id].meta.payloadStructure[i].name,id,msg[i] );
//	    console.log('writePoint(',devices[id].meta.payloadStructure[i].name,id,msg[i],')');
	};
	broker.devices[id].lastdata.push( message );
	while ( broker.devices[id].lastdata.length > MSGBUFFERLINES ) {
	    broker.devices[id].lastdata.shift();
	}
	if ( aktdevice && aktdevice === id ) {
	    if ( outcontainer ) outcontainer.innerHTML = broker.devices[id].lastdata.join('<br />');
	    aktMeter( meters );
	}
	if ( !aktdevice || aktdevice !== lastdevice ) {
	    if ( devidcontainer ) devidcontainer.innerHTML = aktdevice;
	    if ( outcontainer ) outcontainer.innerHTML = '';	    
	    if ( meterdom ) meterdom.innerHTML = '';	    
	    lastdevice = aktdevice;
	}

    }
    else if ( type === 'beacon' ) {
	broker.devices[id].beaconcount++;
//	console.log('beacon',msg);
    }
};


    // Receive messages
client.on('message', function (topic, message) {
  // message is Buffer
//    console.log('MSG:',topic,message.toString())
    let msg = message.toString();
    let json = [];
    try {
	json = JSON.parse(msg);
    }
    catch {
	json = msg.split( /\ /g );
    }
	
    parseMessage( topic, json );
    //    client.end()
})


// fetch devices from the pipe service
let pipedevs = [];
const loadAllPipedDevices = () => {
    const url = 'https://freetwin.de:3459/getAll';
    const xhr = new XMLHttpRequest();
    xhr.open('get',url,true);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.onreadystatechange = function () {
	if (xhr.readyState === 4 && xhr.status === 200) {
	    var json = JSON.parse(xhr.responseText);
	    pipedevs=json;
	    document.getElementById( 'influximport' ).classList.add('ready');
	    console.log('loaded all piped devices',json);
	}
    };
    xhr.send();
}
loadAllPipedDevices();

window.onload = ( loadev ) => {
    const palette = ['#101010','#808080','#800000','#FF0000','#008000','#00FF00','#808000','#FFFF00','#000080','#0000FF','#800080','#FF00FF','#008080','#00FFFF','#C0C0C0','#FFFFFF'];
    
    playground = document.getElementById('playground');
    var width = playground.offsetWidth;
    var height = playground.offsetHeight;
    const ghosttransp = 0;
    const labeloffset = {
	x: 0, y: 0.35, z: 3.55
    }
    let aktsign = null;
    let aktroute = null;
    let aktmesh = null;
    let aktpin = null;
    
    let hiobj = null;
    let loadopencount = 0;
    let loadclosefuncs = [];
    let datapinned = false;

    // Hide header after some time
    window.setTimeout( () => {
	document.getElementById('header').classList.add('small');
    }, HEADER_HIDE_AFTER );

    scene.background = new THREE.Color( '#000000' );

    const camera = new THREE.PerspectiveCamera( 27, width/height, 1, 3500 );
    camera.position.z = 200;
    camera.position.x = 200;
    camera.position.y = 100;
    camera.rotation.z = Math.PI/4;

    const renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setSize( width, height );
    renderer.setAnimationLoop( animation );
    playground.appendChild( renderer.domElement );

    
    let controls;/* = new ArcballControls( camera, renderer.domElement, scene );
    controls.target.set( 0, 0, 0 );
    controls.setGizmosVisible( false );
//    controls.enableGrid = true;
    controls.rotateSpeed = 1.0;
    controls.zoomSpeed = 1.2;
    controls.panSpeed = 0.8;

    controls.noZoom = false;
    controls.noPan = false;
    
    controls.staticMoving = false;
    controls.dynamicDampingFactor = 0.15;
    
    controls.saveState();
    controls.keys = [ 65, 83, 68 ];
*/

    const ambientLight = new THREE.AmbientLight( 0x111111 );
    scene.add( ambientLight );

    const light1 = new THREE.DirectionalLight( 0xffffff, 2.5 );
    light1.position.set( 2000, 500, 3000 );
    scene.add( light1 );
    
    const light2 = new THREE.DirectionalLight( 0xffffff, 0.01 );
    light2.position.set( -2000, -1700, -3000 );
    scene.add( light2 );

    const light3 = new THREE.DirectionalLight( 0xffffff, 2.5 );
    light3.position.set( -1500, -3500, 1500 );
    scene.add( light3 );

    const light4 = new THREE.DirectionalLight( 0xffffff, 0.01 );
    light4.position.set( 1500, 4500, -1500 );
    scene.add( light4 );

    let mainmesh=new THREE.Group();
    mainmesh.userData.id="main";
    let routemesh=new THREE.Group();
    routemesh.userData.id="routes";
    let signmesh=new THREE.Group();
    signmesh.userData.id="signs";
    let hlp = null;
    let axishelp = new THREE.AxesHelper( 6 );
    mainmesh.add( axishelp );
    mainmesh.add( routemesh );
    
    let devices = [];
    let parts = [];
    let signs = [];
    let doks = [];
    let files = [];
    let links = [];
    let routes = [];


    const flattenVerts = ( verts ) => {
	let target = [];
	for ( let i=0; i<verts.length; i++ ) {
	    for ( let j=0; j<verts[i].length; j++ ) {
		target.push(verts[i][j]);
	    }
	}
	return target;
    }
    const populateDevlist = ( devs ) => {
	const devnaviDom = document.querySelector('.deviceNavi');
	const devlistDom = devnaviDom.querySelector('.deviceNavi ul');
//	const basiclistDom = document.querySelector('.deviceNavi ol');
	if ( devs.length > 0 ) {
	    devlistDom.classList.add('filled');
	    devnaviDom.classList.add('filled');
//	    basiclistDom.classList.add('filled');
	}
	devices.splice(0);
	devlistDom.innerHTML = '<li class="nodevs"></li>';
//	basiclistDom.innerHTML = '<li class="nodevs"></li>';
//	console.log('devices[]',devlistDom.innerHTML);
	devs.forEach( ( o, i ) => {
	    if ( o.type ===  'basic' ) return;
	    const aktDom = devlistDom;
	    aktDom.insertAdjacentHTML( 'beforeend',
					   '<li id="device-'+o.id+'" title="'+o.name
					   +'  Anzahl Teile: '+o.parts+'  Anzahl Schilder: '
					   +o.signs+'" data-devicedbid="'+o.id+'" data-devicename="'+o.name+'">'+o.name
					   +' ('+o.parts+'/'+o.signs+')</li>'
					 );
	    const it = document.getElementById( 'device-'+o.id );
	    devices.push(o);
	    it.onclick = loadDevice;
	});
	document.getElementById('header').classList.add('small');
//	console.log('devices[]',devices);
//	console.log('devlist',devs,devlistDom);
    }
    const loadAllDevices = () => {
	const deviceDom = document.querySelector('.deviceNavi ul');
	deviceDom.innerHTML = '<img src="imgs/throbber.gif" /> lade Twins';
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
    const createSign = ( raw, modifications, nocreateDom ) => {
	const img = new Image();
	img.src = raw;
	const index = signs.length;
	const sign3D = new THREE.PlaneGeometry( 10, 10 );
	const texture = new THREE.TextureLoader().load( raw );
	texture.wrapS = THREE.ClampToEdgeWrapping;
	texture.wrapT = THREE.ClampToEdgeWrapping;
//	texture.magFilter = THREE.NearestFilter;
	texture.magFilter = THREE.LinearFilter;
//	texture.minFilter = THREE.NearestMipmapLinearFilter;
//	texture.minFilter = THREE.NearestMipmapNearestFilter;
//	texture.minFilter = THREE.LinearMipmapNearestFilter;
//	texture.minFilter = THREE.LinearMipmapLineaerFilter;
	texture.colorSpace = THREE.SRGBColorSpace;
	texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
	const material = new THREE.MeshStandardMaterial( {
	    map: texture,
//	    color: 0xffffff,
	    transparent: true,
	    side: THREE.FrontSide,
	    roughness: 0.0,
	    fog: false,
//	    depthMode: THREE.GreaterDepth,
//	    depthWrite: false,
	    flatShading: true
	});
	const mesh = new THREE.Mesh( sign3D, material );
	mesh.origcolor = 0xffffff;
	mesh.userData.type = nocreateDom ? 'basicsign' : 'sign';
	mesh.userData.index = index;
	if ( modifications ) applyModifications( mesh, modifications );
	if ( ! nocreateDom ) {
	    signs.push({ 'index':index, 'img': raw, 'mesh': mesh });
	    signmesh.add( mesh );
	}
//	console.log('Create Sign', img );
	return mesh;
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
    const addPin = ( index, cont3d, pinname, pincol, pinmods, pinlabelmods, isbasic, ppinindex ) => {
	const col = pincol || 0xffff00;
	let pname = pinname || 'Pin';
	let pinindex;
	if ( !isbasic ) {
	    pname = pinname || 'Pin'+pinindex;
	    const ind = pinindex || ppinindex;
	}
	else {
	    pinindex = ppinindex;
	}
	const pin3D = new THREE.CylinderGeometry( 0.5, 0.5, 2.5 );
	const material = new THREE.MeshStandardMaterial({
	    color: col,
	    side: THREE.DoubleSide,
	    flatShading: true
	});
	const mesh = new THREE.Mesh( pin3D, material );
	mesh.userData.type='pin';
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
	mesh.add(nmesh);


	if ( !isbasic ) {
	    let newpin = { 'name': pname, 'obj3d' : mesh, 'index':pinindex, 'label': nmesh, 'color' : col }
	    parts[index].pins.push(newpin);
	}
	else {
	    isbasic.parts[index].pins[pinindex].obj3d = mesh;
	    isbasic.parts[index].pins[pinindex].label = nmesh;
//	    console.log('addPin isbasic',isbasic.parts[index].pins, pinindex);
	}
    }
    const addPart = ( namep, meshp, fnamep, deviceidp, tooltipp, origdata, rebuild ) => {
	let index=0;
	if ( ! rebuild ) {
	    parts.push({ 'name' : namep, 'fname': fnamep, 'mesh': meshp, 'deviceid': deviceidp, 'tooltip': tooltipp, 'origdata' : origdata, 'pins':[] });
	    index = parts.length-1;
	}
	else {
	    index = rebuild - 1;
	}
	meshp.userData.index = index;
    }
    const shortenPartName = ( name ) => {
	return name;//shortname;
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
    const addBasicPart = ( basic, meshp, rebuild ) => {
	// save pins

	let index=0;
	let pinarr;
	let pincount =0;
	if ( ! rebuild ) {
	    pinarr = [];
	    for ( let i=0; i<basic.parts.length; i++ ) {
		const o=basic.parts[i];
//		console.log( 'add basic part part', o );
		for ( let j=0; j<o.pins.length; j++ ) {
		    pinarr.push({
			'part':o.name,
			'name':o.pins[j].name,
			'trans':basic.pins[pincount].trans||'',
			'col':o.pins[j].color,
			'obj3d':o.pins[j].obj3d,
			'label':o.pins[j].label
			
		    });
		    pincount++;
//		    console.log('pinarr',o);
		}
	    }
	    parts.push({ 'name' : basic.name, 'type' : 'basic', 'id' : basic.id, 'deviceid': basic.deviceid, 'tooltip' : basic.tooltip, 'mesh': meshp, 'pins' : pinarr });
	
	    const pl = document.getElementById('partlist');
	    pl.insertAdjacentHTML( 'beforeend',
				   '<div class="listpart">\n'+
				   '  <h3>'+basic.name+'</h3>\n'+
				   '  <h4>('+basic.tooltip+')</h4>\n'+
				   '</div>' );
	    index = parts.length-1;
	}
	else {
	    index = rebuild - 1;
	    pinarr = basic.pins;
	}
	meshp.userData.index = index;
    }

    const create3DFromGlb = ( glb, fname, data, deviceid, tooltip, mods, isbasicp ) => {
	const col = data.color || '#ffffff';
	const oname = data.name || fname;
	const mesh = glb.scene;
	mesh.scale.set(500,500,500);
	mesh.userData.type = isbasicp ? 'basicpart' : 'part';
	mesh.userData.tooltip = tooltip;
	if ( !isbasicp ) {
	    addPart(oname, mesh, fname, deviceid, tooltip, data);
	    mainmesh.add( mesh );
	    console.log('adding glb',mainmesh);
	}
	return mesh;
    };

    const create3DFromGeom = ( geom, fname, data, deviceid, tooltip, mods, isbasicp ) => {
	let material;
	const col = data.color || '#ffffff';
	const oname = data.name || fname;
	if ( mods && mods.ghost ) {
	    console.log('ghost part', mods);
	    material = new THREE.MeshStandardMaterial({
		transparent: true,
		opacity: ghosttransp, flatShading: true
	    });
	}
	else {
	    material = new THREE.MeshPhongMaterial( { color: col, fog: false, flatShading: true } );
	}
	const mesh = new THREE.Mesh( geom, material );
	mesh.origcolor = col;
	mesh.userData.type = isbasicp ? 'basicpart' : 'part';
	mesh.userData.tooltip = tooltip;
	if ( mods && mods.ghost ) {
	    mesh.visible = false;
	}
	if ( !isbasicp ) {
	    addPart(oname, mesh, fname, deviceid, tooltip, data);
	    mainmesh.add( mesh );
	}
	return mesh;
    };

    const create3D = ( data, fname, deviceid, tooltip, mods, isbasic ) => {
	const geometry = new THREE.BufferGeometry();
	const verts = flattenVerts( data.vertices );
	const inds = flattenVerts( data.facets );
	const norms = data.normals;
	const col = data.color;
	const oname = data.name;
	geometry.setIndex( inds );
	geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( verts, 3 ) );
	geometry.setAttribute( 'normal', new THREE.Float32BufferAttribute( norms, 3 ) );
	geometry.computeBoundingSphere();
	return create3DFromGeom( geometry, fname, data, deviceid, tooltip, mods, isbasic );
    }
    console.log('loaded threejs',THREE);
    scene.add(mainmesh);
    scene.add(signmesh);
// animation

    function animation( time ) {

	if ( mainmesh ) {
//	    mainmesh.rotation.x = time / 2000;
//	    mainmesh.rotation.y = time / 1000;
	}
	renderer.render( scene, camera );

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
    const hilightPart = ( obj ) => {
//	obj.userData.origcol = obj.material.color;
	obj.material.color.set( '#aaaa00' );
	hiobj = obj;
    }
    const hilightBasic = ( obj ) => {
//	obj.userData.origcol = obj.material.color;
	for ( let i=0; i<obj.children.length; i++ ) {	    
	    const obj2 = obj.children[i];
	    obj2.material.color.set( '#aaaa00' );
	}
	hiobj = obj;
    }
    const lolightParts = ( par ) => {
//	console.log('lolight',hiobj.material.color,hiobj.userData.origcol);
	if ( ! par ) par = mainmesh;
	par.children.forEach( ( o, i ) => {
	    if ( ( o.userData.type === 'part' || o.userData.type === 'basicpart' ) && o.origcolor ) {
		o.material.color.set( o.origcolor );
	    }
	    else if ( o.userData.type === 'basic' ) {
		lolightParts( o );
	    }
	});
	hideTooltip();
	//	obj.userData.origcol = obj.material.color;
//	if ( hiobj && hiobj.material ) hiobj.material.color.set( hiobj.origcolor );
//	console.log('lolight')
    }
    const stopCapture = () => {
	capturemode = false;
	document.querySelector('#pincapture').classList.remove('hot');
    }
    const showTooltip = ( x, y, text ) => {
	const ttpdom = document.getElementById( 'tooltip' );
	ttpdom.innerHTML = text;
	ttpdom.style.left = ( x + 20 ) + 'px';
	ttpdom.style.top = ( y ) + 'px';
	ttpdom.classList.add('show');
	const ttcontainer = document.getElementById( 'sensortooltip' );
	ttcontainer.innerHTML = text;
	document.getElementById('liveData').classList.add('show');
//	console.log('show tooltip');
    }
    const hideTooltip = () => {
	const ttpdom = document.getElementById( 'tooltip' );
	ttpdom.classList.remove('show');
	document.getElementById( 'sensortooltip' ).replaceChildren();
	document.getElementById( 'sensormeters' ).style.display='block';
	document.getElementById( 'sensorout' ).style.display='block';
	document.getElementById( 'grafana' ).replaceChildren();
	document.getElementById( 'grafana' ).style.display='none';
	const livetab = document.querySelector('#liveData h2.act');
	if ( livetab && livetab.classList ) livetab.classList.remove('act');
	document.getElementById( 'livetab' ).classList.add('act');
	document.getElementById('liveData').classList.remove('show');
    }
    const mouseOver3D = ( xp, yp ) => {
	const raycaster = new THREE.Raycaster();
	const pointer = new THREE.Vector2();
	pointer.x = (xp/width)*2-1; pointer.y = - (yp/height)*2+1;
	raycaster.setFromCamera( pointer, camera );
	const intersects = raycaster.intersectObjects( mainmesh.children );
	if ( intersects.length > 0 ) {
	    if ( intersects[0].object.type !== 'AxesHelper'  ) {
		const o3 = intersects[0].object;
		lolightParts();
//		console.log('intersects',xp,yp,o3.userData);
		if ( o3.userData.type ) {
//		    console.log('highlight part', o3.userData.type)
		    if ( o3.userData.type === 'part' ) {
			hilightPart( o3 );
			const ind = o3.userData.index;
			if ( parts[ind] ) {
			    if ( parts[ind].tooltip && parts[ind].tooltip != '' ) {
//				showTooltip( xp, yp, parts[ind].tooltip );
				showTooltip( xp, yp, o3.userData.tooltip );
			    }
			    if ( parts[ind].deviceid && parts[ind].deviceid != '' ) {
				aktdevice = parts[ind].deviceid;
			    }
			    
			}
		    }
		    else if ( o3.userData.type === 'basic' ) {
			const ind = o3.userData.index;
//			console.log('highlight basic', ind)
		    }
		    else if ( o3.userData.type === 'basicpart' || o3.userData.type === 'basicsign' ) {
			const ind = o3.parent.userData.index;
//			console.log('highlight basicpart', o3)
			if ( o3.userData.type === 'basicpart' ) hilightPart( o3 );
			if ( parts[ind] && parts[ind].tooltip && parts[ind].tooltip != '' ) {
			    let label = '<b>'+parts[ind].tooltip+'</b>';
			    if ( o3.userData.tooltip && o3.userData.tooltip != '' ) {
				label += '<br/>'+o3.userData.tooltip;
			    }
			    showTooltip( xp, yp, label );
			}

			if ( parts[ind] && parts[ind].deviceid && parts[ind].deviceid != '' ) {
			    aktdevice = parts[ind].deviceid;
			}
		    }
		    else {
//			console.log('highlight nothing', o3)
			lolightParts();
			aktdevice = '';
			hideTooltip();
			document.getElementById('sensorid').innerHTML = '';
			document.getElementById('sensorout').innerHTML = '';
		    }
		}
	    // 	     intersects[0].object.userData.type !== 'pin' &&
	    // 	     intersects[0].object.userData.type !== 'pinlabel' ) {
	    // 	    lolightParts();
	    // 	    hilightPart( intersects[0].object );
	    // 	}
	    }
	}
	else {
	    lolightParts();
	    aktdevice = '';
	    hideTooltip();
	    document.getElementById('sensorid').innerHTML = '';
	    document.getElementById('sensorout').innerHTML = '';
	}
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
	    else if ( am.type === "Line" ) {
		am.geometry.dispose();
		am.material.dispose();
		am.parent.remove(am);
	    }
	    else if ( am.type === "Object3D" ) {
		removeMeshes( am );
		am.parent.remove(am);
	    }
	    else if ( am.type === "Group" && am.userData.id !== 'routes' ) {
		console.log('remove group',am);
		removeMeshes( am );
		am.parent.remove(am);
	    };
	}
    }
    const resetDevice = () => {	
	aktsign = null;
	aktroute = null;
	aktmesh = null;
	aktpin = null;
	aktdevice = null;
	parts.splice( 0 );
	routes.splice( 0 );
	signs.splice( 0 );
	files.splice( 0 );
	links.splice( 0 );
	removeMeshes( mainmesh );
	removeMeshes( signmesh );
	removeMeshes( routemesh );
	hideTooltip();
	datapinned = false;
	document.body.classList.remove('datapinned');
	document.getElementById('sensorid').replaceChildren();
	document.getElementById('sensorout').replaceChildren();
	document.getElementById('dokLyr').replaceChildren();
	document.getElementById('dokLyr').classList.remove('show');
	document.getElementById('partlist').replaceChildren();
	document.getElementById('routelist').replaceChildren();
	document.getElementById('dokDatLyr').classList.remove('show');
	document.getElementById('deviceTabs').querySelector('.akt')?.classList.remove('akt');
//	document.getElementById('linklist').replaceChildren();
	console.log('reset device', mainmesh, signmesh);
    }
    const findDevice = ( id ) => {
	for ( let i=0; i<devices.length; i++ ) {
	    if ( devices[i].id === id ) return devices[i];
	}
	return null;
    }
    const applyModifications = ( o, mods ) => {
	o.position.x = mods.position.x || 0; o.position.y = mods.position.y || 0;
	o.position.z = mods.position.z || 0;
	o.rotation.x = mods.rotation.x || 0; o.rotation.y = mods.rotation.y || 0;
	o.rotation.z = mods.rotation.z || 0;
	o.scale.x = mods.scale?.x || 1; o.scale.y = mods.scale?.y || 1;
	if ( mods.hasOwnProperty('depthWrite') ) o.material.depthWrite = mods.depthWrite;
	if ( mods.hasOwnProperty('side') ) o.material.side = mods.side;

    }
    const findPinObject = ( pin ) => {
	for ( let i=0; i<parts.length; i++ ) {
	    if ( pin.part === parts[i].name ) {
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
	dra.forEach( ( o, i ) => {
	    const po1 = findPinObject( o.pin1 );
	    const po2 = findPinObject( o.pin2 );
	    if ( !po1 || !po2 ) {
		o.broken = true;		
	    }
	    else {
		addRPin( po1,o.hmod );
		addRPin( po2,o.hmod );
	    }
	});
//	console.log( 'render routes', dra );
    }
    const renderDevice = ( devdata, isbasic ) => {
	let target;
	if ( isbasic ) target = new THREE.Object3D();
//	console.log('render device', devdata, isbasic, target);
	if ( !isbasic ) {
	    document.getElementById('deviceName').innerHTML = devdata.name;
	    document.querySelector('#dbID span').innerHTML = devdata._id;
	    if ( devdata.doks.length > 0 ) {
		doks = devdata.doks;
	    }
	    if ( devdata.files.length > 0 ) {
		files = devdata.files;
//		console.log( 'render files', files );
	    }
	    if ( devdata.links.length > 0 ) {
//		console.log( 'render links', devdata.links );
		links = devdata.links;
	    }
	}
	devdata.parts.forEach( ( o, i ) => {
	    if ( o.type === 'basic' ) {
		loadBasic( o );
	    }
	    else {
		let o3;
		if ( o.origdata.type && o.origdata.type === 'stl' ) {
		    const stlloader = new STLLoader();
		    stlloader.load( o.origdata.file, ( geometry ) => {
			o3 = create3DFromGeom( geometry, o.fname, o.origdata, o.deviceid, o.tooltip, o.modifications, isbasic );
			if ( o.modifications ) applyModifications( o3, o.modifications );
			console.log('loaded stl',geometry,o3);
			o.pins.forEach( ( p, j ) => {
			    //		    console.log('add pin',p);
			    addPin( i, o3, p.name, p.color, p.modifications, p.labelmodifications, isbasic, j );
			});
			if ( isbasic && target ) target.add(o3);
		    });
		}
		else if ( o.origdata.type && o.origdata.type === 'glb' ) {
		    const gltfloader = new GLTFLoader();
	    	    gltfloader.load( o.origdata.file, ( glb ) => {
			o3=create3DFromGlb( glb, o.fname, o.origdata, o.deviceid, o.tooltip, o.modifications, isbasic );
			applyModifications( o3, o.modifications );
			console.log('loaded glb',glb,o3);
			o.pins.forEach( ( p, j ) => {
			    //		    console.log('add pin',p);
			    addPin( i, o3, p.name, p.color, p.modifications, p.labelmodifications, isbasic, j );
			});
			if ( isbasic && target ) target.add(o3);
			console.log('loaded glb',glb,o3);
		    });
		}
		else {
		    o3 = create3D( o.origdata, o.fname, o.deviceid, o.tooltip, o.modifications, isbasic );
		    if ( o.modifications ) applyModifications( o3, o.modifications );
		    o.pins.forEach( ( p, j ) => {
			const pinscont = document.querySelector('#part'+i+' .pins');
			//		    console.log('add pin',p);
			addPin( i, o3, p.name, p.color, p.modifications, p.labelmodifications, isbasic, j );
		    });
		    if ( isbasic && target ) target.add(o3);
		}
	    }
	});
	devdata.signs.forEach( ( o, i ) => {
	    const o3=createSign( o.img, o.modifications, isbasic );
	    if ( isbasic && target ) target.add(o3);
//	    console.log( 'render sign', o, i );
	});
	if ( devdata.routes && devdata.routes.length > 0 ) {
	    loadclosefuncs.push( () => {
		renderRoutes(devdata.routes);
		if ( devdata.camstart ) {
		    RestoreCamPos( devdata.camstart );
		    console.log( 'camstart loaclosefuncs', devdata.camstart );
		}
	    });
	}
	if ( isbasic && target ) return target;
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
	controls.target.set( 0, 0, 0 );
	controls.setGizmosVisible( false );
	//    controls.enableGrid = true;
	controls.rotateSpeed = 1.0;
	controls.zoomSpeed = 1.2;
	controls.panSpeed = 0.8;
	
	controls.noZoom = false;
	controls.noPan = false;
	
	controls.staticMoving = false;
	controls.dynamicDampingFactor = 0.15;
    
//	controls.saveState();
	controls.keys = [ 65, 83, 68 ];
	RestoreCamPos(ocampo);
//	controls.update();
    }
    const unsetControls = () => {
	if ( controls ) controls.dispose();
    }
    const RestoreCamPos = ( akt ) => {	
//	console.log('restorecampos',akt, camera);
	camera.position.x = akt.position.x;
	camera.position.y = akt.position.y;
	camera.position.z = akt.position.z;
//	camera.lookAt(controls.target);
	camera.rotation.x = akt.rotation.x;
	camera.rotation.y = akt.rotation.y;
	camera.rotation.z = akt.rotation.z;
	camera.updateProjectionMatrix();
	//	controls.update();
//	constrols.saveState();
	console.log('restorecampos',camera.rotation);
    };
    const loadDevicePure = ( id ) => {
	const url = '/api/getOne/'+id;
	const xhr = new XMLHttpRequest();
	unsetControls();
	xhr.open('GET',url,true);
	xhr.setRequestHeader("Content-Type", "application/json");
	xhr.onreadystatechange = function () {
	    if (xhr.readyState === 4 && xhr.status === 200) {
		var json = JSON.parse(xhr.responseText);
		renderDevice(json);		
		document.getElementById('header').classList.add('small');
		document.getElementById('deviceNavi').classList.remove('open');
		//		console.log('files',files);
//		controls.reset();
		if ( json.camstart ) {
		    RestoreCamPos( json.camstart );
		    console.log( 'delay camstart', json.camstart );
		    setControls();
		    //		    controls.update();
		}
		hideThrobber();
	    }
	};
	xhr.send();
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
    const loadDevice = ( ev ) => {
	resetDevice();
	document.querySelector('.deviceNavi .selected')?.classList.remove('selected');
	showThrobber();
	ev.target.classList.add('selected');
	const devid = ev.target.getAttribute('data-devicedbid');
	const devname = ev.target.getAttribute('data-devicename');
//	const dev = findDevice( name );
//	console.log('load Device',devname, devid);
	loadDevicePure( devid );
    }
    const sendDBCreate = ( devdata, cb ) => {
	const url = '/api/post';
	const xhr = new XMLHttpRequest();
	xhr.open('POST',url,true);
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
    const pinData = () => {
//	console.log('pindevice',aktdevice);
	if ( !aktdevice || aktdevice === '' ) return;
	if ( datapinned ) {
	    datapinned = false;
	    document.body.classList.remove('datapinned');
	    document.getElementById('liveData').classList.remove('show');
	}
	else {
	    datapinned = true;
	    document.body.classList.add('datapinned');
	    showGrafana();
	}
    }
    const initMouseEvents = () => {
	playground.onmousemove = ( ev ) => {
	    if ( datapinned ) return;
	    const rect = ev.target.getBoundingClientRect();
	    const x = ev.clientX - rect.left; //x position within the element.
	    const y = ev.clientY - rect.top;  //y position within the element.
//	    console.log('mousemove',x,y);
	    mouseOver3D( x, y );
	};
	playground.onclick = ( ev ) => {
	    pinData();
	};

	/*	playground.onmousedown = ( ev ) => {
	    console.log('mousebutton',ev.button);
	    mouseDown( ev.clientX-offset.x, ev.clientY-offset.y,ev.button );
	};
	playground.onmouseup = ( ev ) => {
	    mouseUp( ev.clientX-offset.x, ev.clientY-offset.y );
	};
	playground.onmouseleave = ( ev ) => {
	    mouseUp( ev.clientX-offset.x, ev.clientY-offset.y );
	};
	playground.addEventListener( 'wheel', event => {
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
		    if ( basic.parts[j].pins[k].name === o.name ) {
			f = basic.parts[j].pins[k];
			break;
		    }
		}
	    }
	    if ( f ) {
		if ( o.trans === '' ) f.obj3d.visible = false;
		else {
		    f.obj3d.visible = true;
		    f.label.material.map.dispose();
		    f.label.material.map = getTextureFromText( o.trans );
		}
	    }
//	    console.log('pin',o.trans, o.part, f);
	}
//	console.log('translate labels',basic.parts,basic);
    }
    const CheckOpenCount = () => {
	if ( loadopencount < 1 && loadclosefuncs.length > 0 ) {
	    loadclosefuncs.forEach( ( o,i ) => {
		o();
	    });
	    loadclosefuncs.splice( 0 );
	}
    }
    const loadBasic = ( basic ) => {
	const url = '/api/getOne/'+basic.id;
	const xhr = new XMLHttpRequest();
	loadopencount++;
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
		translateLabels(basic);
//		console.log('loaded Basic',basic);
		if ( basic.modifications ) applyModifications( o3, basic.modifications );
		mainmesh.add(o3);
		addBasicPart( basic, o3 );
		loadopencount--;
		CheckOpenCount();
	    }
	};
	xhr.send();
    }
    const createFilesEntry = ( i ) => {
//	console.log('creating File Entry',i,files[i].name,files[i].size,files[i].dbid);
	const nl = document.createElement( 'div' );
	nl.id='file'+i;
	nl.classList.add('filedesc');
	nl.innerHTML = '<h3>'+(files[i].label||files[i].name)+'</h3><a href="/api/download/'+files[i].dbid+'">'+files[i].name + '</a> (<i>' + files[i].size + 'b</i>)';
	return nl;
    }
    const createLinksEntry = ( i ) => {
//	console.log('creating links Entry',i,links[i].url,links[i].linktext,links[i].tooltip);
	const nl = document.createElement( 'div' );
	nl.id='link'+i;
	nl.classList.add('link');
	nl.innerHTML = '<a href="'+links[i].url+'" title="'+links[i].tooltip+'" target="_blank">'+links[i].linktext+'</a>';
	return nl;
    }
    const getGrafanaData = ( id ) => {
	for ( let i=0; i<pipedevs.length; i++ ) {
	    const o = pipedevs[i];
	    if ( o && o.id && o.id === id ) {
		return o.data;
	    }
	}
    }
    const renderGrafana = () => {
	if ( !aktdevice ) return;
	const grdom = document.getElementById('grafana');
	const grdata = getGrafanaData( aktdevice );
//	const grurl = grdata.grafana.url;
	const grurl = '/public-dashboards/'+grdata.grafana.pubtoken;
	grdom.insertAdjacentHTML( 'beforeend', '<iframe width="100%" height="480" src="https://freetwin.de:3000'+grurl+'?kiosk" />' );
//	console.log('renderGrafana',aktdevice,grdata);
    }
    const showLivedata = () => {
	document.querySelector('#liveData h2.act').classList.remove('act');
	document.getElementById('livetab').classList.add('act');
	document.getElementById('sensormeters').style.display='block';
	document.getElementById('sensorout').style.display='block';
//	document.getElementById('grafana').replaceChildren();
	document.getElementById('grafana').style.display='none';
    }
    const showGrafana = () => {
	document.querySelector('#liveData h2.act').classList.remove('act');
	document.getElementById('histtab').classList.add('act');
	document.getElementById('sensormeters').style.display='none';
	document.getElementById('sensorout').style.display='none';
	const grdom = document.getElementById('grafana');
	grdom.style.display='block';
	if ( grdom.innerHTML === '' ) renderGrafana();
    }

    const onWindowResize = () => {

	const SCREEN_HEIGHT = window.innerHeight;
	const SCREEN_WIDTH = window.innerWidth;

	width = SCREEN_WIDTH;
	height = SCREEN_HEIGHT;
	camera.aspect = SCREEN_WIDTH / SCREEN_HEIGHT;
	camera.updateProjectionMatrix();

	renderer.setSize( SCREEN_WIDTH, SCREEN_HEIGHT );
//	composer.setSize( SCREEN_WIDTH, SCREEN_HEIGHT );

    }
    const initButtonEvents = () => {
	document.getElementById( 'edtBtn' ).onclick = ( ev ) => {
	    if ( ev.target.classList.contains('akt') ) return;
	    document.querySelectorAll('#deviceTabs button.akt').forEach( ( o,i ) => {
		o.classList.remove('akt');
	    });
	    ev.target.classList.add('akt');
	    const id = document.querySelector('#dbID span').innerHTML;
	    if ( id !== 'new' )
		location.href='/admin?id='+id;
//	    console.log('edit',id);
	};
	document.getElementById( 'datapin' ).onclick = ( ev ) => {
	    pinData();
	};
	document.getElementById( 'dokBtn' ).onclick = ( ev ) => {
	    const dbtn = document.getElementById( 'dokBtn' );
	    if ( dbtn.classList.contains('akt') ) {
		const doklyr = document.getElementById( 'dokLyr' );
		const dokdatlyr = document.getElementById( 'dokDatLyr' );
		if ( doklyr ) {
		    doklyr.classList.remove('show');
		}
		if ( dokdatlyr ) {
		    dokdatlyr.classList.remove('show');
		}
		document.getElementById( 'dokSuper' ).classList.remove('show');
		dbtn.classList.remove('akt');
		return;
	    }
	    dbtn.classList.add('akt');
	    const id = document.querySelector('#dbID span').innerHTML;
	    const doklyr = document.getElementById( 'dokLyr' );
	    if ( doklyr ) {
		doklyr.innerHTML = '<div class="dok">' + doks.join( '</div><div class="dok">' ) + '</div>';
		if ( files.length > 0 ) {
		    doklyr.insertAdjacentHTML( 'beforeend', '<h3>Dateien</h3>' );
		    const listcont = document.createElement('div');
		    listcont.classList.add('filelist');
		    for ( let i=0; i<files.length; i++ ) {
			listcont.appendChild( createFilesEntry( i ) );
		    }
		    doklyr.appendChild( listcont );
		}
		if ( links.length > 0 ) {
		    doklyr.insertAdjacentHTML( 'beforeend', '<h3>weiterführende Links</h3>' );
		    const listcont = document.createElement('div');
		    listcont.classList.add('linklist');
		    for ( let i=0; i<links.length; i++ ) {
			listcont.appendChild( createLinksEntry( i ) );
		    }
		    doklyr.appendChild( listcont );
		}
//		doklyr.classList.add('show');
	    }
	    const dokdatlyr = document.getElementById( 'dokDatLyr' );
//	    dokdatlyr.classList.add('show');
	    document.getElementById( 'dokSuper' ).classList.add('show');
	    //	    console.log('dok',id, doks);
	};
	document.getElementById( 'wireBtn' ).onclick = ( ev ) => {
	    const domo = ev.target;
	    if ( domo.classList.contains( 'off' ) ) {
		domo.classList.remove('off');
		routemesh.visible = true;
	    }
	    else {
		domo.classList.add('off');		
		routemesh.visible = false;
	    }
	};
	document.getElementById( 'livetab' ).onclick = ( ev ) => {
	    if ( ev.target.classList.contains('act') ) return;
	    showLivedata();
	};
	document.getElementById( 'histtab' ).onclick = ( ev ) => {
	    if ( ev.target.classList.contains('act') ) return;
	    showGrafana();
	};
	document.getElementById( 'burger' ).onclick = ( ev ) => {
	    const d=document.getElementById( 'deviceNavi' );
	    if ( d.classList.contains( 'open' ) ) d.classList.remove('open');
	    else d.classList.add( 'open' );
	};
	
	window.addEventListener( 'resize', onWindowResize );
    }
    initButtonEvents();

    const ROUTEHEIGHT = 5;
    const add3DRoute = ( ro ) => {
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
//	console.log('pin pos',hv1,hv11,hv12,hv21,hv2);
//	console.log('pin col',ro.pin1.col);

	const material = new THREE.LineBasicMaterial({
	    color: ro.pin1.col,
	    linewidth: 500
	});

	const points = [ hv1, hv11, hv12, hv13, hv21, hv2 ];

	const geometry = new THREE.BufferGeometry().setFromPoints( points );
	//	    geometry.computeBoundingSphere();
//	const line = new THREE.Line( geometry, material );
//	rtmsh.add( line );
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
	const addRTCylinder = ( p1, p2, h, rot, col ) => {
	    const cylg = new THREE.CylinderGeometry( 0.3, 0.3, h + 0.1, 4 );
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
	    addRTCylinder( points[i], points[i+1], h, rtcylrots[i], ro.pin1.col );
	}
	routemesh.add( rtmsh );
	ro.obj3d = rtmsh;
	//	    console.log('add 3D Route',pos1arr,pos2arr,pinoffs);
    }
    const idify = ( name ) => {
	return name.replace( /\ /g, '_' );
    }
    const addRPin = ( o, h ) => {
	const cont = document.getElementById('routelist');
	if ( cont.classList.contains('target') ) {
	    cont.classList.remove('target');
	    aktroute.pin2 = o; aktroute.state = 2;
	    const routeo = cont.querySelector('.route.active');
	    routeo.insertAdjacentHTML( 'beforeend', '<div class="rpin secondpin"><i>'+shortenPartName(o.part)+'</i><b>'+o.name+'</b></div>' );
	    routeo.classList.remove('active');
	    routeo.id=idify(aktroute.pin1.name+'-'+o.name);
	    aktroute.id=routeo.id;
	    add3DRoute(aktroute);
//	    console.log('route second pin');
	    // set second pin
	}
	else {
	    const route = {
		'pin1' : o,
		'hmod' : h?h:0,
		'state' : 1
	    }
	    aktroute = route;
	    routes.push( route );
	    cont.classList.add('target');
	    cont.insertAdjacentHTML( 'beforeend', '<div class="route active"><div class="rpin firstpin"><i>'+shortenPartName(o.part)+'</i><b>'+o.name+'</b> </div> <b style="color:'+o.col+'"></b> </div>' );
	    // set first pin
	}
//	console.log('adding RPin',o);
    }

    HTMLready = true;
};
