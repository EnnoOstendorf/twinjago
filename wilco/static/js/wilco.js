console.log('welcome to wilco');

let status;
let filter =0;
let cat = 0;
const sniffsoundfiles = [ 'sniff-01.mp3','sniff-02.mp3','sniff-03.mp3','sniff-04.mp3','sniff-05.mp3','sniff-06.mp3','sniff-07.mp3','sniff-08.mp3','sniff-09.mp3','sniff-10.mp3'];
const barkfile = 'bark.mp3';
const houlfile = 'houl.mp3';
const sniffsounds = [];
let barksound, houlsound;

const playSniff = ( count ) => {
    if ( !count ) count = 0;
    if ( count > sniffsounds.length ) return;
    const i = Math.round( Math.random() * sniffsounds.length );   
    if ( sniffsounds[i] ) {
/*	if ( ! sniffsounds[i].paused ) {
	    playSniff( count + 1 );
	    return;
	    }
	    */
	sniffsounds[i].volume = Math.random()/4;
	sniffsounds[i].play();	
    }
}

const playBark = () => {
    barksound.play();
}

const playHoul = () => {
    houlsound.volume =  Math.random()/4;
    houlsound.play();
}

const renderFiles = ( files, filter, mode ) => {
    const plg = document.getElementById('playground');
    plg.replaceChildren();
    var t = '<div class="col">';
    const sumstatus = [];
    files.forEach( ( o, i ) => {
	if ( filter === 0 || o.includes( filter ) )
	    sumstatus.push(o);
    });
    sumstatus.sort();
    const brk = Math.ceil(sumstatus.length / 3); 
    sumstatus.forEach( ( o, i ) => {
	const p = mode?'daily/'+o:o;
	t += '<a href="/archive/'+p+'">'+o+'</a>';
	
	if ( i % brk === brk - 1 )
	    t += '</div><div class="col">'
    });
    t += '</div>';
    plg.insertAdjacentHTML( 'beforeend', t );
    alllinks = document.querySelectorAll( '#playground .col a');
    alllinks.forEach( ( o, i ) => {
	o.onmouseenter = ( ev ) => {
	    playSniff();
	};
	o.onclick = ( ev ) => {
	    playBark();
	};
    });
}

const renderDaily = () => {
    renderFiles( status.daily, filter, true );
    document.getElementById('hourlybtn').removeAttribute('disabled');
    document.getElementById('dailybtn').setAttribute('disabled','disabled');
    console.log('renderHourly');
}

const renderHourly = () => {
    renderFiles( status.files, filter );
/*    const plg = document.getElementById('playground');
    plg.replaceChildren();
    var t = '<div class="col">';
    const sumstatus = [];
    status.files.forEach( ( o, i ) => {
	if ( filter === 0 || o.includes( filter ) )
	    sumstatus.push(o);
//	    t += '<a href="/archive/'+o+'">'+o+'</a>';
    });
    const brk = Math.ceil(sumstatus.length / 3); 
    sumstatus.forEach( ( o, i ) => {
	t += '<a href="/archive/'+o+'">'+o+'</a>';
	
	if ( i % brk === brk - 1 )
	    t += '</div><div class="col">'
    });
    t += '</div>';
    plg.insertAdjacentHTML( 'beforeend', t );
*/
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
	else {
	    filter = ev.target.value;
//	    activatePlots( ev.target.value )
	}
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
    document.getElementById('plotbtn').onclick = ( ev ) => {
	const pll = document.getElementById('plotslayer');
	const pli = pll.querySelector('iframe');
	pli.src = '/temporary_plots/'+filter+'.html';
	pll.classList.add('show');
	playHoul();
    };
    document.getElementById('plotslyrcls').onclick = ( ev ) => {
	const pll = document.getElementById('plotslayer');
	const pli = pll.querySelector('iframe');
	pli.src = '';
	pll.classList.remove('show');
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
    const url = 'https://'+location.host+'/status';
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

const loadSounds = () => {
    sniffsoundfiles.forEach( (o,i) => {
	const snd = document.createElement( 'audio' );
	snd.src = 'sound/'+o;
	sniffsounds.push(snd);
    });
    barksound = document.createElement( 'audio' );
    barksound.src = 'sound/'+barkfile;
    houlsound = document.createElement( 'audio' );;
    houlsound.src = 'sound/'+houlfile;
}

loadSounds();
