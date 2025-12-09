import * as THREE from 'three';
import { ArcballControls } from 'three/addons/controls/ArcballControls.js';
import { TWEEN } from 'three/addons/libs/tween.module.min.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Sensors } from './sensors.js';
import { Space } from './space.js';
import { Stories } from './stories.js';

console.log('Welcome to the IOT-System-Frontend of FH Münster', location.search.substr(1).split('='));
console.log('loaded stories',Stories);

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

const DUMMYSENDERURL = 'https://'+hostname+':3457/artificial_Devices.html';


const genControls = ( camera, renderer ) => {
    controls = new ArcballControls( camera, renderer.domElement, space.scene );
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
    const stories = new Stories();
    const sensors = new Sensors();
    const space = new Space();
    sensors.loadAllPipedDevices( hostname );
    console.log('Sensor Displays:',sensors.Displays);
    const palette = ['#202020','#808080','#800000','#FF0000','#008000','#00FF00','#808000','#FFFF00','#000080','#0000FF','#800080','#FF00FF','#008080','#00FFFF','#C0C0C0','#FFFFFF'];
    
    const devcats = [];
    const devcattree = [];
    const basiccats = [];
    const basiccattree = [];
    
    playground = document.getElementById('playground');
    const width = playground.offsetWidth;
    const height = playground.offsetHeight;
    let dynscroll = true;
    let saved = true;
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
    
    const showEditDlg = ( mode ) => {
	const edithlp = new THREE.BoxHelper(aktmesh, 0x00ffff);
	space.scene.add(edithlp);
	window.setTimeout( () => {
	    space.backupCoords( aktmesh );
	    space.restoreBackup( aktmesh );
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
	    sensors.loadAllPipedDevices( hostname, () => {
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
			    sensors.loadAllPipedDevices( hostname, () => {
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
			    sensors.loadAllPipedDevices( hostname, () => {
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
	    const keysarr = Object.keys(sensors.broker.devices);	
	    console.log('fillIOTManager');
	    for ( let i=0; i<keysarr.length; i++ ) {
		const k = keysarr[i];
		const o = sensors.broker.devices[k];
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
	sensors.loadAllPipedDevices( hostname, () => {
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
	space.scene.add(hlp);
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
	    space.backupCoords( mesh );
	    space.backupLabelCoords( aktpin.label );
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
    const addPin = ( index, cont3d, pinscont, pin3D, pinname, pincol, pinmods, pinlabelmods, isbasicp, ppinindex ) => {
	let pinindex = parts[index]?parts[index].pins.length:0;
	let pname = pinname || 'Pin';
	const col = pincol || '#ffff00';
	const partname = parts[index]?parts[index].name:'unknown';
	if ( isbasicp ) {
	    pinindex = ppinindex;
	}
	if ( !isbasicp ) {
	    const pinDOM = document.getElementById('pin'+index+'-'+pinindex);
	    let newpin = { 'name': pname, 'objDOM': pinDOM, 'part' : partname, 'obj3d' : pin3D.obj3d, 'index':pinindex, 'label': pin3D.label, 'color' : col }
	    parts[index].pins.push(newpin);
//	    console.log('add Pin', pinindex, index);
	    pname = pinname || 'Pin '+pinindex;
	    addPinDOM( index, pinindex, pname, mesh );
//	    console.log('addPin',parts[index].pins);
	}
	else {
	    isbasicp.parts[index].pins[pinindex].obj3d = pin3D.obj3d;
	    isbasicp.parts[index].pins[pinindex].label = pin3D.label;
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
	    const pin3d = space.addPin3D( index, space.meshp, pinscont );
	    addPin( index, meshp, pinscont, pin3d );
	};
	DOMObj.querySelector( 'i' ).onclick = ( ev ) => {
//	    console.log( 'edit part' );
	    editmode = true;
	    aktmesh = meshp;
	    aktsign = DOMObj;
	    space.backupCoords( meshp );
//	    console.log( 'EDitbak', editbackup );
	    showEditDlg( 'part' );
	};
	DOMObj.querySelector('s').onclick = ( ev ) => {	    
	    meshp.geometry?.dispose();
	    meshp.material?.dispose();
	    space.mainmesh.remove(meshp);
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
    const addSignDOM = ( index, fname, raw, mesh ) => {
	const img = new Image();
	img.src = raw;
	signs.push({ 'index':index, 'fname': fname, 'img': raw, 'mesh': mesh, 'settings' : {} });
	const signlist = document.getElementById( 'signsinner' );
	signlist.insertAdjacentHTML( 'beforeend', '<span class="sign" id="sign'+index+'" title="'+fname+'"><i></i><s></s><b>('+clipString(fname,15)+')</b></span>' );
	const sign = document.getElementById( 'sign'+index );
	sign.appendChild( img );
	sign.querySelector('i').onclick = ( ev ) => {
	    editmode = true;
	    aktsign = sign;
	    aktmesh = mesh;
	    space.backupCoords( mesh );
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
    }
    const addPartDOM = ( namep, fnamep, deviceidp, brokerupmsg, tooltipp, origdata, rebuild ) => {
	console.log('adding part DOM', namep, fnamep, origdata);
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
	console.log('adding part Mesh', parts, index, meshp, datap);
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
	    space.ambientLight.color.set( event.detail.color );
	    console.log( 'ambient light color',event.detail.color,space.ambientLight);
	}
	else if ( event.detail.currentEl.id === 'light1color' ) {
	    space.light1.color.set( event.detail.color );
	    space.light1.userData.helper.update();
	    console.log( 'light1 light color',event.detail.color);
	}
	else if ( event.detail.currentEl.id === 'light2color' ) {
	    space.light2.color.set( event.detail.color );
	    space.light2.userData.helper.update();
	    console.log( 'light2 light color',event.detail.color);
	}
	else if ( event.detail.currentEl.id === 'light3color' ) {
	    space.light3.color.set( event.detail.color );
	    space.light3.userData.helper.update();
	    console.log( 'light3 light color',event.detail.color);
	}
	else if ( event.detail.currentEl.id === 'light4color' ) {
	    space.light4.color.set( event.detail.color );
	    space.light4.userData.helper.update();
	    console.log( 'light4 light color',event.detail.color);
	}
//	console.log('New Color', event.detail.currentEl.id);
    });
    const DISPWIDTHHALF = DISPWIDTH / 2;
    const DISPBOTTOMOFFSET = 5;
    const checkDisplays = (delta) => {
	for ( let i=0; i<sensors.displays.length; i++ ) {
	    const v = new THREE.Vector3();
	    const obj=sensors.displays[i].mesh;
	    v.copy( obj.position );
	    v.project( space.camera );
	    let left = Math.round((v.x+1)*width/2)-DISPWIDTHHALF;
	    let top = Math.round((-v.y+1)*height/2);
	    let bottom = height - top + DISPBOTTOMOFFSET + sensors.displays[i].height;
	    let hinview=false;
	    let vinview=false;
	    if ( left < -30 ) left = -30;
	    else if ( left > width -100) left = width -70;
	    else hinview = true;
	    if ( top < 0 ) top = 0;
	    else if ( top > height -20) top = height-20;
	    else vinview = true;
	    if ( hinview && vinview && !space.checkFrustum(obj) ) {
		left=width/2 -DISPWIDTHHALF;
		bottom=DISPBOTTOMOFFSET;
		//	    console.log('falsely visible marker');
	    }
	    sensors.displays[i].dispdom.style.left = left + 'px';
//	    Displays[i].dispdom.style.top = top + 'px';
	    sensors.displays[i].dispdom.style.bottom = bottom + 'px';
	    //	console.log('Marker',i,markers[i].object);
	}
    }
    const fillDisplayMeasures = ( dspBox, part, prefill ) => {
	const dispmsrdiv = dspBox.querySelector('.dispsensmsr');
	const id = dspBox.querySelector('.deviceID').value;
	if ( !sensors.broker.devices[id] || !sensors.broker.devices[id].meta ) return;
	dispmsrdiv.replaceChildren();
	const msrs = sensors.broker.devices[id].meta.payloadStructure;
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
		console.log('dispmeasure change',sensors.displays,part);
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
	sensors.displays.push( { 'id' : id, 'mesh' : mesh, 'measures' : measures, 'dispdom' : sensdiv, 'height' : height||0 } );
//	console.log('add Display',id,sensors.displays);
	return sensors.displays.length-1;
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
	    space.backupCoords( meshp );
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
		    sensors.displays[dispind].height = va;
		    console.log('Display height change',sensors.displays[dispind]);
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
		sensors.attachSensor3D( DOMObj.querySelector( '.deviceID' ).value, meshp );
		console.log('sensor 3D control on',partobj,parts,index);
	    }
	    else {
		partobj.control3D = false;
		sensors.detachSensor3D( DOMObj.querySelector( '.deviceID' ).value, meshp );
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
			pinarr[i].label.material.map = space.getTextureFromText( val );
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
		    pinarr[i].label.material.map = space.getTextureFromText( pinarr[i].name );
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
	    space.mainmesh.remove(meshp);
	    DOMObj.remove();
	    parts.splice(index,1);
	    rebuildPartsDom();
//	    console.log( 'clicked delete button', parts, index, parts[index] );
	};
	if ( basic.deviceid && basic.control3D ) {
	    console.log('sensors.broker.deviceids',sensors.broker.deviceids);
	    sensors.attachSensor3D( basic.deviceid, meshp );
	}
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
		const o3=space.create3D( index, parsed.objects[0], fname );
		addPartMesh(o3, parsed.objects[0], index);

	    };
	    reader.readAsText(finput.files[0]);
	}
	else if ( ext == 'stl' ) {
	    reader.onload = (e) => {
		const stlloader = new STLLoader();
		console.log('loading stl',e.target);
	    	stlloader.load( e.target.result, ( geometry ) => {
		    console.log('loading STL:',e);
		    const d={ type: 'stl', color: '#888888', file: e.target.result, name: fname.replace('.stl','') };
		    const mesh=space.create3DFromGeom( index, geometry, fname, d );
		    addPartMesh(mesh, d, index);
//		    console.log('loaded stl',geometry);
		});
	    };
	    reader.readAsDataURL(finput.files[0]);
	}
	else if ( ext == 'glb' ) {
	    reader.onload = (e) => {
		const gltfloader = new GLTFLoader();
	    	gltfloader.load( e.target.result, ( glb ) => {
		    console.log('loading glb',e.target);
		    
		    const d={ type: 'glb', color: '#888888', file: e.target.result, name: fname.replace('.gltf','') }
		    const mesh = space.create3DFromGlb( index, glb, fname, d );
		    addPartMesh(mesh, d, index);

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
	    const index = signs.length;
	    const fname = filedata.name;
	    const mesh = space.createSign( index, rawfile, fname );
	    addSignDOM( index, fname, rawfile, mesh );	
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
    const logodeldom = document.getElementById('branddelete');
    const logodom = document.getElementById('brandlogo');
    logodeldom.onclick = () => {
	logodom.removeAttribute('src');
	logodeldom.classList.remove('show');
    }
    const addLogo = ( files ) => {
	console.log('addLogo',files);
	for ( let i=0; i<files.length; i++ ) {
	    const reader = new FileReader();
	    reader.onload = (e) => {		
		const rawfile = e.target.result;
		logodom.src = rawfile;
		logodeldom.classList.add('show');
		console.log('read logo file',e, files[i].name, files[i].size);
	    };
	    reader.readAsDataURL(files[i]);
	}
    }
    const finput4 = document.getElementById('logouploadfile');
    finput4.onchange = ( ev ) => {
	addLogo( finput4.files );
	finput4.value='';
    }
//    console.log('loaded threejs',THREE);
    space.scene.add(space.mainmesh);
    space.scene.add(space.signmesh);

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
    const hilightPart = ( obj, overwrite ) => {
	if ( editmode ) return;
	if ( !obj ) return;
	const ind = obj.userData.index;
	const type = obj.userData.type;
	let part = document.getElementById('part'+ind);
//	console.log('hilight part',type);
	if ( type === 'part' ) {
	    Mark( part );
	    Jump( part, overwrite );
	    space.boxObj( obj, 0xbbbbbb );
//	    console.log('hilight part');
	    if ( obj.material?.color ) 
		obj.material.color.set( '#33aa88' );
	}
	else if ( type === 'basicpart' || type === 'basicsign' ) {
	    let t = obj;
	    while ( t != space.mainmesh && !t.userData || !t.userData.type || t.userData.type != 'basic' )
		t = t.parent;
	    part = document.getElementById('part'+t.userData.index);
	    Mark( part );
	    Jump( part, overwrite );
	    space.boxObj( t, 0xbbbbbb );
//	    console.log('hilight basicsign|basicpart',type);

	}
	else if ( type === 'basic' ) {
//	    console.log('hilight basic',part);
	    Mark( part );
	    Jump( part, overwrite );
	    space.boxObj( obj, 0xbbbbbb );
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
	space.unBox();
	if ( hiparts ) hiparts.classList.remove('over');
	for ( let i=0; i<space.mainmesh.children.length; i++ ) {
	    const a=space.mainmesh.children[i];
	    if ( a && a.material ) a.material.color.set( a.origcolor );
	}
	for ( let i=0; i<space.signmesh.children.length; i++ ) {
	    const a=space.signmesh.children[i];
	    if ( a && a.material ) a.material.color.set( a.origcolor );
	}
    }
    const stopCapture = () => {
	capturemode = false;
	document.querySelector('#pincapture').classList.remove('hot');
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
	buf.width = document.getElementById('width').value;
	buf.height = document.getElementById('height').value;
	let lsitem = 'twinjago.edit.buffer';
	if ( document.getElementById('editDlg').classList.contains('sign') ) lsitem = 'twinjago.editsign.buffer';
	localStorage.setItem(lsitem, JSON.stringify(buf));
	console.log('editCopy',buf);
    }
    const editPaste = () => {
	let lsitem = 'twinjago.edit.buffer';
	if ( document.getElementById('editDlg').classList.contains('sign') ) lsitem = 'twinjago.editsign.buffer';
	const buf=JSON.parse(localStorage.getItem(lsitem));
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
	if ( buf.width && !isNaN(parseFloat(buf.width.replace(',','.')))) {
	    document.getElementById('width').value=buf.width;
	    aktmesh.scale.x = parseFloat(buf.width.replace(',','.'));
	}
	if ( buf.height && !isNaN(parseFloat(buf.height.replace(',','.')))) {
	    document.getElementById('height').value=buf.height;
	    aktmesh.scale.x = parseFloat(buf.height.replace(',','.'));
	}
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
	    const mo = space.mouseOver3D(xp,yp,aktpin,capturemode);
	    if ( capturemode ) aktPinCoords();
	    else {
		lolightParts();
		hilightPart( mo );
	    }
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
	    document.getElementById( 'StoriesBtn' ).classList.add('disabled');
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
	    document.getElementById( 'StoriesBtn' ).classList.remove('disabled');
	    document.getElementById('filelist').replaceChildren();
	    document.getElementById('linklist').replaceChildren();
	    document.getElementById('newfilelist').replaceChildren();
	    document.getElementById('routelist').replaceChildren();
	    document.getElementById('routingPinDlg').replaceChildren();
	    document.getElementById('newgroup').classList.remove('disabled');
	    document.getElementById( 'devType' ).innerHTML = 'Twin';
	    space.resetSceneData();
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
	sensors.displays.splice(0);
	document.getElementById('plgOvl').replaceChildren();
	document.getElementById('partsinner').replaceChildren();
	document.getElementById('signsinner').replaceChildren();
	document.getElementById('deviceName').value = '';
	document.getElementById('mscale').value = '';
	document.getElementById('munit').value = 'Meter';
	
	//	document.getElementById('deviceID').value = '';
	document.getElementById('brandlogo').removeAttribute('src');
	document.getElementById('branddelete').classList.remove('show');
	document.getElementById('dok1txt').value = '';
	document.getElementById('dok2txt').value = '';
	document.getElementById('dok3txt').value = '';
//	document.getElementById('sensorout').innerHTML = '';
//	document.getElementById('sensorout').classList.remove('show');
	document.querySelector('#dbID span').innerHTML = 'new';
	space.removeMeshes( space.mainmesh );
	space.removeMeshes( space.signmesh );
	space.removeMeshes( space.routemesh );
	document.body.classList.remove('modalmode');

    }
    const findDevice = ( id ) => {
	for ( let i=0; i<devices.length; i++ ) {
	    if ( devices[i].id === id ) return devices[i];
	}
	return null;
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
	routes.splice(0);
	document.getElementById('routelist').replaceChildren();
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
    const renderDevice = ( devdata, isbasicp, fin ) => {
	let target;
	if ( isbasicp ) target = new THREE.Object3D();
//	console.log('render device X', devdata.name, isbasicp);
	if ( !isbasicp ) {
	    document.getElementById('deviceName').value = devdata.name;
	    document.getElementById('deviceCat').value = devdata.category || '';
	    document.querySelector('#dbID span').innerHTML = devdata._id;
//	    console.log('render device !isbasic',devdata.type);
	    if ( devdata.type === 'basic' ) {
		document.getElementById( 'newgroup' ).classList.add('disabled');
		document.getElementById( 'DokumenteBtn' ).classList.add('disabled');
		document.getElementById( 'SzeneBtn' ).classList.add('disabled');
		document.getElementById( 'StoriesBtn' ).classList.add('disabled');
		document.getElementById('newpart').classList.remove('disabled');
	    }
	    else {
		document.getElementById('newpart').classList.add('disabled');
		document.getElementById( 'newgroup' ).classList.remove('disabled');
		document.getElementById( 'DokumenteBtn' ).classList.remove('disabled');
		document.getElementById( 'SzeneBtn' ).classList.remove('disabled');
		document.getElementById( 'StoriesBtn' ).classList.remove('disabled');
	    }
	    if ( devdata.scene ) {
		space.renderSceneData( devdata.scene );
		if ( devdata.scene.logo ) {
		    document.getElementById('brandlogo').src = devdata.scene.logo;
		    document.getElementById('branddelete').classList.add('show');
		}
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
	    console.log('resetting stories');
	    if ( devdata.storybook ) stories.reStories( devdata.storybook );
	    else stories.resetStories();
	}
//	for ( let i=0; i<devdata.parts.length; i++ ) {
	devdata.parts.forEach( ( o, i ) => {
//	    const o = devdata.parts[i];
//	    console.log('render part',o.type,o,i,isbasicp,!isbasicp);
	    if ( o.type === 'basic' ) {
		loadBasic( o );
	    }
	    else {
//		console.log('render part not basic',isbasicp,!isbasicp);
		let o3;
		if ( !isbasicp ) addPartDOM( o.name, o.fname, o.deviceid, o.brokerupmsg, o.tooltip, o.origdata );
		if ( o.origdata && o.origdata.type && o.origdata.type === 'stl' ) {
		    const stlloader = new STLLoader();
		    loadopencount++;
		    stlloader.load( o.origdata.file, ( geometry ) => {
			o3 = space.create3DFromGeom( i, geometry, o.fname, o.origdata, o.deviceid, o.brokerupmsg, o.tooltip, o.modifications, isbasicp );
//			console.log('loaded stl',geometry,o3);
			if ( !isbasicp ) addPartMesh(o3, o.origdata, i);
			space.applyModifications( o3, o.modifications );
			o.pins.forEach( ( p, j ) => {
			    const pinscont = document.querySelector('#part'+i+' .pins');
//			    console.log('add pin',p,pinscont);
			    const pin3D = space.addPin3D( i, o3, pinscont, p.name, p.color, p.modifications, p.labelmodifications, isbasicp, j );
			    addPin( i, o3, pinscont, pin3D, p.name, p.color, p.modifications, p.labelmodifications, isbasicp, j );
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
			o3=space.create3DFromGlb( i, glb, o.fname, o.origdata, o.deviceid, o.brokerupmsg, o.tooltip, o.modifications, isbasicp );
			space.applyModifications( o3, o.modifications );
			if ( !isbasicp ) addPartMesh(o3, o.origdata, i);
//			console.log('loaded glb',glb,o3);
			o.pins.forEach( ( p, j ) => {
			    const pinscont = document.querySelector('#part'+i+' .pins');
//			    console.log('add pin',p,pinscont);
			    const pin3D = space.addPin3D( i, o3, pinscont, p.name, p.color, p.modifications, p.labelmodifications, isbasicp, j );
			    addPin( i, o3, pinscont, pin3D, p.name, p.color, p.modifications, p.labelmodifications, isbasicp, j );
			});
			if ( isbasicp && target ) target.add(o3);
			loadopencount--;
			CheckOpenCount();			
//			console.log('loaded glb',glb);
		    });
		}
		else {
		    o3 = space.create3D( i, o.origdata, o.fname, o.deviceid, o.brokerupmsg, o.tooltip, o.modifications, isbasicp );
		    space.applyModifications( o3, o.modifications );
		    if ( !isbasicp ) addPartMesh(o3, o.origdata, i);
		    o.pins.forEach( ( p, j ) => {
			const pinscont = document.querySelector('#part'+i+' .pins');
//			console.log('add pin json',i,p,pinscont,document.getElementById('partsinner').innerHTML);
			const pin3D = space.addPin3D( i, o3, pinscont, p.name, p.color, p.modifications, p.labelmodifications, isbasicp, j );
			addPin( i, o3, pinscont, pin3D, p.name, p.color, p.modifications, p.labelmodifications, isbasicp, j );
		    });
		    if ( isbasicp && target ) target.add(o3);
		}
	    }
	});
	devdata.signs.forEach( ( o, i ) => {
	    const o3=space.createSign( i, o.img, o.fname || 'noname', o.modifications, isbasicp );
	    if ( !isbasicp ) addSignDOM( i, o.fname || 'noname', o.img, o3 );
	    if ( isbasicp && target ) {		
		target.add(o3);
		console.log( 'render sign', o, i, isbasicp, target );
	    }
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
    const setControls = () => {
	const ocampo = {
	    'position' : {
		'x' : space.camera.position.x,
		'y' : space.camera.position.y,
		'z' : space.camera.position.z
	    },
	    'rotation' : {
		'x' : space.camera.rotation.x,
		'y' : space.camera.rotation.y,
		'z' : space.camera.rotation.z
	    }
	}
	controls = new ArcballControls( space.camera, space.renderer.domElement, space.scene );
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
	space.RestoreCamPos(ocampo);
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
	    document.getElementById( 'StoriesBtn' ).classList.add('disabled');
	    document.getElementById( 'RoutingBtn' ).classList.add('disabled');
	    document.getElementById( 'devType' ).innerHTML = 'Basic';
	    document.getElementById( 'devStgHead' ).classList.add('basic');
	    space.RestoreCamPos( );
	}
	else {
	    isbasic = false;
	    if ( json.camstart ) {
		space.setCamStart( json.camstart );
		space.RestoreCamPos( json.camstart );
		console.log('CAMSTART');
	    }
	    document.getElementById('liveBtn').classList.remove('hidden');
	    document.getElementById( 'RoutingBtn' ).classList.remove('disabled');
	    document.getElementById('saveBasicBtn').classList.add('disabled');
	    document.getElementById('saveDeviceBtn').classList.remove('disabled');
	    document.getElementById( 'DokumenteBtn' ).classList.remove('disabled');
	    document.getElementById( 'SzeneBtn' ).classList.remove('disabled');
	    document.getElementById( 'StoriesBtn' ).classList.remove('disabled');
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
	const devicelogo = document.getElementById('brandlogo').src;
	if ( devicelogo && devicelogo != '' ) devicescene.logo = devicelogo;
	else if ( devicescene.logo ) {
	    delete devicescene.logo;
	    console.log('deleting logo');
	}
	
	space.setCamStart( space.camera );
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
	    const mods = {
		position: {
		    x: apa.mesh.userData.opos ? apa.mesh.userData.opos.x : apa.mesh.position.x,
		    y: apa.mesh.userData.opos ? apa.mesh.userData.opos.y : apa.mesh.position.y,
		    z: apa.mesh.userData.opos ? apa.mesh.userData.opos.z : apa.mesh.position.z
		},
		rotation: {
		    x: apa.mesh.userData.orot ? apa.mesh.userData.orot.x : apa.mesh.rotation.x,
		    y: apa.mesh.userData.orot ? apa.mesh.userData.orot.y : apa.mesh.rotation.y,
		    z: apa.mesh.userData.orot ? apa.mesh.userData.orot.z : apa.mesh.rotation.z
		},
		scale: {
		    x: apa.mesh.userData.oscl ? apa.mesh.userData.oscl.x : apa.mesh.scale.x,
		    y: apa.mesh.userData.oscl ? apa.mesh.userData.oscl.y : apa.mesh.scale.y,
		    z: apa.mesh.userData.oscl ? apa.mesh.userData.oscl.z : apa.mesh.scale.z
		}
	    }
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
			'position' : { 'x' : mods.position.x, 'y' : mods.position.y, 'z' : mods.position.z },
			'rotation' : { 'x' : mods.rotation.x, 'y' : mods.rotation.y, 'z' : mods.rotation.z },
			'scale' : {	'x' : mods.scale.x, 'y' : mods.scale.y, 'z' : mods.scale.z },
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
			'position' : { 'x' : mods.position.x, 'y' : mods.position.y, 'z' : mods.position.z },
			'rotation' : { 'x' : mods.rotation.x, 'y' : mods.rotation.y, 'z' : mods.rotation.z },
			'scale' : {	'x' : mods.scale.x, 'y' : mods.scale.y, 'z' : mods.scale.z },
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
		    }		}
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
	if ( stories.stories.length > 0 ) {
	    devdata.storybook = stories.dumpStories();	    
	    console.log('save stories',stories.dumpStories());
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
	    space.mouseDown( ev.clientX-rect.left, ev.clientY-rect.top );
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
		    f.label.material.map = space.getTextureFromText( o.trans );
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
		if ( !json ) {
		    loadopencount--;
		    CheckOpenCount();
		    return;
		}
		basic.parts = json.parts;
		const o3=renderDevice(json,basic);
		const index = parts.length-1;
		o3.userData.index = index;
		o3.userData.type = 'basic';
		basic.name=json.name;
		if ( basic.modifications ) space.applyModifications( o3, basic.modifications );
		space.mainmesh.add(o3);
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

	space.camera.aspect = SCREEN_WIDTH / SCREEN_HEIGHT;
	space.camera.updateProjectionMatrix();

	space.renderer.setSize( SCREEN_WIDTH, SCREEN_HEIGHT );
	
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
	if ( sensors.broker.devices[id] ) {
	    sensors.aktdevice = id;
	    sensors.aktsensorout = out;
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
    
    const deleteDisplay = ( id ) => {
	for ( let i=0; i<sensors.displays.length; i++ ) {
	    console.log('delete Display',id,sensors.displays[i].id);
	    if ( sensors.displays[i].id === id ) {
		sensors.displays.splice(i,1);
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
//	console.log('broker devices',sensors.broker.devices);
	const keysarr = Object.keys(sensors.broker.devices);	
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
	    const o = sensors.broker.devices[k];
//	    console.log('device',i,k,o);
	    const devlabel = document.createElement( 'div' );
	    devlabel.innerHTML = k;
//	    if ( devInUse( k ) ) {
//		devlabel.classList.add('inactive');
//	    }
//	    else {
		devlabel.onclick = ( ev ) => {
		    deviceIdClick( k );
		}
//	    }
	    selbox.appendChild(devlabel);
//	    selbox.insertAdjacentHTML( 'beforeend',
//				       '<div>'+k+'</div>' );
	};
	selbox.classList.add('show');
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
		space.removeMeshes( ar.obj3d );
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
	    space.add3DRoute(aktroute,routes.length);
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
	    console.log('change ambient intensity',ev.target.value,space.ambientLight.intensity);
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
	    space.removeMeshes( routemesh );
	    const reroutes = JSON.parse(JSON.stringify(routes));
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
	    space.restoreBackup(aktmesh);
	    const dlgdom = document.getElementById('editDlg');
	    dlgdom.className = '';
	    if ( space.edithlp ) {
		space.edithlp.geometry.dispose();
		space.edithlp.material.dispose();
		space.scene.remove( edithlp );
	    };
	    ev.preventDefault();
	    return false;
	};
	document.getElementById('pinCancel').onclick = ( ev ) => {
//	    editmode = false;
	    space.restoreBackup(aktpin.obj3d);
	    space.restoreLabelBackup(aktpin.label);
	    document.getElementById('pinDlg').classList.remove('vis');
	    if ( hlp ) {
		hlp.geometry.dispose();
		hlp.material.dispose();
		space.scene.remove( hlp );
	    };
	    document.body.classList.remove('modalmode');
	    ev.preventDefault();
	    return false;
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
	    space.savePositionUserData(aktmesh);
	    if ( space.edithlp ) {
		space.edithlp.geometry.dispose();
		space.edithlp.material.dispose();
		space.scene.remove( edithlp );
	    };
	    document.getElementById('editDlg').className = '';
	    document.body.classList.remove('modalmode');
	    ev.preventDefault();
	    return false;
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
		space.scene.remove( hlp );
	    };
	    aktpin.name = document.getElementById('pinname').value;
	    const aktpartindex = document.getElementById('formPartIndex').value;
	    let DOMO = document.querySelector( '#pin'+aktpartindex+'-'+aktpin.index+' span' );
	    aktpin.label.material.map.dispose();
	    aktpin.label.material.map = space.getTextureFromText( aktpin.name );
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
		let v = parseFloat(ev.target.value);
		const v4=v.toFixed(4);
		o.value=v4;
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
		else if ( ev.target.id === 'ambientintensity' ) space.ambientLight.intensity = v;
		else if ( ev.target.id === 'light1intensity' ) space.light1.intensity = v;
		else if ( ev.target.id === 'light1x' ) space.light1.position.x = v;
		else if ( ev.target.id === 'light1y' ) space.light1.position.y = v;
		else if ( ev.target.id === 'light1z' ) space.light1.position.z = v;
		else if ( ev.target.id === 'light2intensity' ) space.light2.intensity = v;
		else if ( ev.target.id === 'light2x' ) space.light2.position.x = v;
		else if ( ev.target.id === 'light2y' ) space.light2.position.y = v;
		else if ( ev.target.id === 'light2z' ) space.light2.position.z = v;
		else if ( ev.target.id === 'light3intensity' ) space.light3.intensity = v;
		else if ( ev.target.id === 'light3x' ) space.light3.position.x = v;
		else if ( ev.target.id === 'light3y' ) space.light3.position.y = v;
		else if ( ev.target.id === 'light3z' ) space.light3.position.z = v;
		else if ( ev.target.id === 'light4intensity' ) space.light4.intensity = v;
		else if ( ev.target.id === 'light4x' ) space.light4.position.x = v;
		else if ( ev.target.id === 'light4y' ) space.light4.position.y = v;
		else if ( ev.target.id === 'light4z' ) space.light4.position.z = v;
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
		else if ( dragtarget.id === 'ambientintensityhs' ) space.ambientLight.intensity = newv;
		else if ( dragtarget.id === 'light1xhs' ) { space.light1.position.x = newv; cobj = space.light1; }
		else if ( dragtarget.id === 'light1yhs' ) { space.light1.position.y = newv; cobj = space.light1; }
		else if ( dragtarget.id === 'light1zhs' ) { space.light1.position.z = newv; cobj = space.light1; }
		else if ( dragtarget.id === 'light2xhs' ) { space.light2.position.x = newv; cobj = space.light2; }
		else if ( dragtarget.id === 'light2yhs' ) { space.light2.position.y = newv; cobj = space.light2; }
		else if ( dragtarget.id === 'light2zhs' ) { space.light2.position.z = newv; cobj = space.light2; }
		else if ( dragtarget.id === 'light3xhs' ) { space.light3.position.x = newv; cobj = space.light3; }
		else if ( dragtarget.id === 'light3yhs' ) { space.light3.position.y = newv; cobj = space.light3; }
		else if ( dragtarget.id === 'light3zhs' ) { space.light3.position.z = newv; cobj = space.light3; }
		else if ( dragtarget.id === 'light4xhs' ) { space.light4.position.x = newv; cobj = space.light4; }
		else if ( dragtarget.id === 'light4yhs' ) { space.light4.position.y = newv; cobj = space.light4; }
		else if ( dragtarget.id === 'light4zhs' ) { space.light4.position.z = newv; cobj = space.light4; }
		else if ( dragtarget.id === 'light1intensityhs' || dragtarget.id === 'light1intensity' ) {
		    space.light1.intensity = newv; cobj = space.light1; }
		else if ( dragtarget.id === 'light2intensityhs' || dragtarget.id === 'light2intensity' ) {
		    space.light2.intensity = newv; cobj = space.light2; }
		else if ( dragtarget.id === 'light3intensityhs' || dragtarget.id === 'light3intensity' ) {
		    space.light3.intensity = newv; cobj = space.light3; }
		else if ( dragtarget.id === 'light4intensityhs' || dragtarget.id === 'light4intensity' ) {
		    space.light4.intensity = newv; cobj = space.light4; }
		if ( cobj && cobj.userData.helper ) {
		    cobj.userData.helper.update();		    
		}
		if ( space.hlp ) space.hlp.update();
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

    space.addAnimFunc( ( time ) => {
	if ( space.mainmesh ) {
	    checkDisplays( time );
	}
    });

    HTMLready = true;
};
