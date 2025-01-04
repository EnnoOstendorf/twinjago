console.log('welcome to wilco');

let status;
let filter =0;
let cat = 0;

const renderDaily = () => {
    const plg = document.getElementById('playground');
    plg.replaceChildren();
    status.daily.forEach( ( o, i ) => {
	if ( filter === 0 || o.includes( filter ) )
	    plg.insertAdjacentHTML( 'beforeend', '<a href="/archive/daily/'+o+'">'+o+'</a>' );
    });
    document.getElementById('hourlybtn').removeAttribute('disabled');
    document.getElementById('dailybtn').setAttribute('disabled','disabled');
    console.log('renderDaily');
}

const renderHourly = () => {
    const plg = document.getElementById('playground');
    plg.replaceChildren();
    status.files.forEach( ( o, i ) => {
	if ( filter === 0 || o.includes( filter ) )
	    plg.insertAdjacentHTML( 'beforeend', '<a href="/archive/'+o+'">'+o+'</a>' );
    });
    document.getElementById('dailybtn').removeAttribute('disabled');
    document.getElementById('hourlybtn').setAttribute('disabled','disabled');
    console.log('renderHourly');
}

const fillDeviceSelect = () => {
    const sel = document.getElementById('deviceselect');
    sel.replaceChildren();
    sel.insertAdjacentHTML( 'beforeend', '<option value="*">*</option>' );
    status.devices.forEach( ( o, i ) => {
	const val=o.id;
	sel.insertAdjacentHTML( 'beforeend', '<option value="'+val+'"'+(val===filter?' selected':'')+'>'+val+'</option>' );
    });
}

const initEventHandlers = () => {
    document.getElementById('deviceselect').onchange = ( ev ) => {
	if ( ev.target.value === '*' ) filter = 0;
	else filter = ev.target.value;
	if ( cat === 0 ) renderDaily();
	else renderHourly();
	console.log('change deviceselect', ev.target.value );
    };
    document.getElementById('dailybtn').onclick = ( ev ) => {
	cat=0;
	renderDaily();
	console.log('select daily', ev.target.value );
    };
    document.getElementById('hourlybtn').onclick = ( ev ) => {
	cat=1;
	renderHourly();
	console.log('select hourly', ev.target.value );
    };
}

const parseURLParams = () => {
    const params = location.search.substr(1).split( '&' );
    params.forEach( ( o, i ) => {
	vals = o.split('=');
	if ( vals[0] === 'filter' ) filter = vals[1];
	else if ( vals[0] === 'cat' ) cat = vals[1]==='hourly'?1:0;
	console.log('found param',vals, filter);	
    });
}

const initStatus = () => {
    parseURLParams();
    const plg = document.getElementById('playground');
    if ( cat === 1 ) renderHourly();
    else renderDaily();
    fillDeviceSelect();
    initEventHandlers();
    console.log('initDevices',status,location.search);
//    devices.devices.
}

const loadStatus = () => {
    const url = 'https://freetwin.de:3211/status';
    const xhr = new XMLHttpRequest();
    xhr.open('get',url,true);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.onreadystatechange = function () {
	if (xhr.readyState === 4 && xhr.status === 200) {
	    var json = JSON.parse(xhr.responseText);
	    status=json;
//	    document.getElementById( 'influximport' ).classList.add('ready');
	    initStatus();
	    console.log('loaded status', status );
	}
    };
    xhr.send();
}


loadStatus();
