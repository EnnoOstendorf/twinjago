import * as THREE from 'three';
import { ArcballControls } from 'three/addons/controls/ArcballControls.js';
import { TWEEN } from 'three/addons/libs/tween.module.min.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

function Space() {
    const scene = new THREE.Scene();
    const playground = document.getElementById('playground');
    const width = playground.offsetWidth;
    const height = playground.offsetHeight;
    const ghosttransp = 0.7;   
    const offset = {
	x: playground.offsetLeft,
	y: playground.offsetTop
    }
    let boxedObj = null;   
    let lastBoxedObjID = 0;   
    const animfuncs = [];   
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

    const flattenVerts = ( verts ) => {
	let target = [];
	for ( let i=0; i<verts.length; i++ ) {
	    for ( let j=0; j<verts[i].length; j++ ) {
		target.push(verts[i][j]);
	    }
	}
	return target;
    }
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

    const createSign = ( index, raw, fname, modifications, nocreateDom ) => {
	console.log('creating Sign',index,fname);
	const img = new Image();
	img.src = raw;
//	const index = signs.length;//document.querySelectorAll('.sign').length;//signlist.children.length;
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
	const mesh = new THREE.Mesh( sign3D, material );
	mesh.origcolor = 0xffffff;
	mesh.userData.type = nocreateDom ? 'basicsign' : 'sign';
	mesh.userData.index = index;
	if ( modifications ) applyModifications( mesh, modifications );
//	console.log('Create Sign', img );
	signmesh.add( mesh );
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

    const addPin3D = ( index, cont3d, pinscont, pinname, pincol, pinmods, pinlabelmods, isbasicp, ppinindex ) => {
//	console.log('addPin',index,cont3d);
	const col = pincol || '#ffff00';
	let pname = pinname || 'Pin';
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
	return { 'obj3d' : mesh, 'label' : nmesh };
    }
    const create3DFromGlb = ( index, glb, fname, data, deviceid, brokerupmsg, tooltip, mods, isbasicp ) => {
	const col = data.color || '#ffffff';
	const oname = data.name || fname;
	const mesh = glb.scene;
	mesh.scale.set(50,50,50);
	mesh.userData.type = isbasicp ? 'basicpart' : 'part';
	if ( !isbasicp ) {
//	    addPartDOM(oname, fname, deviceid, brokerupmsg, tooltip, data);
//	    addPartMesh(mesh, data, index);
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
// animation
    const addAnimFunc = ( fn ) => {
	console.log('adding Anim Function', typeof fn);
	if ( typeof fn === 'function' ) animfuncs.push( fn );
    }
    
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


    function animation( time ) {
	animfuncs.forEach( ( o ) => {
	    o( time );
	});
	renderer.render( scene, camera );
	TWEEN.update();
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
    const mouseOver3D = ( xp, yp, aktpin, capturemode ) => {
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

		    return o3;
		}
		else if ( o3.userData.type && o3.userData.type === 'basicsign' ) {
		    while ( o3.parent && o3.userData.type !== 'basic' ) {
			o3 = o3.parent;
		    }
		    return o3;
//		    lolightParts();
//		    hilightPart( o3 );
		}
		else {
		    return;
//		    lolightParts();
//		    console.log('intersect unknown', o3.userData);
		}
	    }
	}
	else return;
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
    const resetSceneData = () => {
	renderSceneData(iniscenedata);
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
    const setCamStart = ( nc ) => {
	camstart.position.x = nc.position.x;
	camstart.position.y = nc.position.y;
	camstart.position.z = nc.position.z;
	camstart.rotation.x = nc.rotation.x;
	camstart.rotation.y = nc.rotation.y;
	camstart.rotation.z = nc.rotation.z;
    }
    const RestoreCamPos = ( akt ) => {	
	if ( ! akt ) akt = camstartdefault;
	camera.position.x = akt.position.x;
	camera.position.y = akt.position.y;
	camera.position.z = akt.position.z;
	camera.rotation.x = akt.rotation.x;
	camera.rotation.y = akt.rotation.y;
	camera.rotation.z = akt.rotation.z;
	camera.updateProjectionMatrix();
	console.log('RestoerCamPos',akt);
    };
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
    const ROUTEHEIGHT = 5;
    const add3DRoute = ( ro, ind ) => {
//	console.log('adding 3D route',ro);
	const rtmsh = new THREE.Object3D();
	const pinoffs = { 'x':0, 'y':0,'z':-1 };
	const routeh = ROUTEHEIGHT + (ro.hmod?ro.hmod:0) + ind;
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



    return {
	scene: scene,
	camera: camera,
	renderer: renderer,
	mouseOver3D: mouseOver3D,
	mouseDown: mouseDown,
	RestoreCamPos: RestoreCamPos,
	setCamStart: setCamStart,
	restoreBackup: restoreBackup,
	backupCoords: backupCoords,
	savePositionUserData: savePositionUserData,
	backupLabelCoords: backupLabelCoords,
	restoreLabelBackup: restoreLabelBackup,
	renderSceneData: renderSceneData,
	resetSceneData: resetSceneData,
	removeMeshes: removeMeshes,
	createSign: createSign,
	create3DFromGlb: create3DFromGlb,
	create3D: create3D,
	create3DFromGeom: create3DFromGeom,
	add3DRoute: add3DRoute,
	addPin3D: addPin3D,
	boxObj: boxObj,
	unBox: unBox,
	getTextureFromText: getTextureFromText,
	applyModifications: applyModifications,
	addAnimFunc: addAnimFunc,
	checkFrustum: checkFrustum,
	width: width,
	height: height,
	edithlp: edithlp,
	hlp: hlp,
	ambientLight: ambientLight,
	light1: light1,
	light2: light2,
	light3: light3,
	light4: light4,
	mainmesh: mainmesh,
	signmesh: signmesh,
	routemesh: routemesh
    }
}

export { Space }
