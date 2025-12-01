const showStoriesDlg = () => {
    const sznDlg = document.getElementById('storiesDlg');
    document.body.classList.add('modalmode');
    document.body.classList.add('storymode');
    //	showSceneHelpers();
    sznDlg.classList.add('vis');
    //	console.log( 'clicked dokumente button' );
}

const hideStoriesDlg = () => {
    const sznDlg = document.getElementById('storiesDlg');
    document.body.classList.remove('modalmode');
    document.body.classList.remove('storymode');
    document.body.classList.remove('storyselmode');
    //	hideSceneHelpers();
    
    sznDlg.classList.remove('vis');
    //	console.log( 'clicked dokumente button' );
}   


function Stories() {
    const pool = [];
    const stories = [];
    let selmode = false;
    let actstory = null;
    let actchapter = null;
    let actchapdiv = null;
    
    const chapterExists = ( name, story ) => {
	console.log('chapterExists?',story);

	let found = false;
	if ( story.chapters ) story.chapters.forEach( ( o, i ) => {
	    if ( o.name === name ) found=true;
	});
	return found;
    }
    const addPartHTML = ( name, bid, index ) => {
	const partsdiv = actchapdiv.querySelector('.strparts');
	const ndiv = document.createElement( 'div' );
	ndiv.classList.add('strpart');
	ndiv.setAttribute( 'data-name', name );
	ndiv.setAttribute( 'data-bid', bid );
	ndiv.setAttribute('data-index', index );
	ndiv.innerHTML =  '<h5>'+name+'</h5>';
	ndiv.onclick = ( ev ) => {
	    console.log('clicked on part', name );
	}
	partsdiv.appendChild( ndiv );
	actchapdiv.classList.add('hasparts');
	actchapdiv.classList.add('open');
	console.log('actchapdiv',actchapdiv);
	return ndiv;
    }
    const saveSelection = ( ) => {
	const partsdiv = actchapdiv.querySelector('.strparts');
	partsdiv.replaceChildren();
	actchapter.parts.splice( 0 );
	const selpartdivs = document.getElementById('StorySelParts').querySelectorAll('.selpart'); 
	selpartdivs.forEach( ( o, i ) => {
	    const name = o.getAttribute('data-name');
	    const bid = o.getAttribute('data-bid');
	    const index = o.getAttribute('data-index');
	    const part = addPartHTML( name, bid, index );
	    actchapter.parts.push({'name':name,'index':index,'id':bid, 'partdiv':part });
//	    console.log('found part',name);
	});
	console.log('saving selection',actstory,actchapter);
    }
    const removePartSel = ( partovl, chapter ) => {
	partovl.classList.remove('selected');
	const part = partovl.parentNode;
	const name = part.querySelector('strong').innerHTML;
	const id = part.querySelector('c').getAttribute('data-id');
	const index = parseInt(part.id.substr(4));
	const seldiv = document.getElementById('StorySelParts');
	const x = seldiv.querySelector('#selpart'+id);
	seldiv.removeChild(x);
//	chapter.parts.forEach( ( o,i ) => { chapter.parts.splice( i, 1 ); } );
	console.log('removing part', name, id, index, x, chapter );
    }
    const addPartSel = ( partovl, chapter ) => {
	partovl.classList.add('selected');
	const part = partovl.parentNode;
	const name = part.querySelector('strong').innerHTML;
	const id = part.querySelector('c').getAttribute('data-id');
	const index = parseInt(part.id.substr(4));
	const seldiv = document.getElementById('StorySelParts');
	const x = document.createElement('div');
	x.classList.add('selpart');
	x.id='selpart'+id;
	x.setAttribute('data-bid',id);
	x.setAttribute('data-index',index);
	x.setAttribute('data-name',name);
	x.innerHTML = '<b>'+name+'</b><button class="seldelpart">X</button>';
	const btn = x.querySelector('.seldelpart');
	btn.onclick = ( ev ) => {
	    removePartSel( partovl, chapter );
	}
	seldiv.appendChild(x);
	console.log('adding part', name, id, index, chapter );
    }
    const hasPart = ( parts, partid ) => {
	for ( let i=0; i< parts.length; i++ ) {
	    if (parts[i].id === partid ) {
		return true;
		break;
	    }
	};
	return false;
    }
    const findPartOvl = ( partid ) => {	
	let po=null;
	document.querySelectorAll('#partsinner .part').forEach( ( o, i ) => {	    
	    const pid = o.querySelector( 'c' ).getAttribute('data-id');
	    if ( partid === pid ) po = 0;
	});
	return po;
    }
    const enterSelmode = ( btn, story, chapter ) => {
	selmode = true;
	btn.classList.add('chosen');
	const seldiv = document.getElementById('StorySelParts');
	seldiv.replaceChildren();
	console.log('enterSelMode',story,btn.parentNode.parentNode);
	document.getElementById('StorySelChap').innerHTML = chapter.name;
	document.getElementById('StorySelStr').innerHTML = story.name;
	document.body.classList.add('storyselmode');
	actstory = story;
	actchapter = chapter;	
	actchapdiv =btn.parentNode.parentNode;
	document.querySelectorAll('#partsinner .part').forEach( ( o, i ) => {	    
	    const pid = o.querySelector( 'c' ).getAttribute('data-id');
	    console.log('selmode part',);
	    const x=document.createElement('div'); x.classList.add('strSelOvl');
	    x.id = 'ovl'+pid;
	    if ( hasPart( chapter.parts, pid ) ) x.classList.selected;
	    x.onclick= (ev) => {
		if ( x.classList.contains('selected') ) {
		    removePartSel( x, chapter );
		}
		else {
		    addPartSel( x, chapter );
		}
	    }
	    o.appendChild(x);
	});
	chapter.parts.forEach( ( o ) => {
	    console.log('adding part',o);
	    addPartSel( document.getElementById('ovl'+o.id), chapter );
	});
    }
    const leaveSelmode = () => {
	selmode = false;
	actstory = null;
	actchapter = null;
	actchapdiv = null;
	document.querySelectorAll( '.selpartbtn.chosen').forEach( ( o ) => { o.classList.remove('chosen'); } );
	document.body.classList.remove('storyselmode');
	document.querySelectorAll('#partsinner .part').forEach( ( o, i ) => {
	    const x=o.querySelector('.strSelOvl');
	    o.removeChild(x);
	});
    }
    
    const addChapter = ( story, name, container ) => {
	if ( name === '' || chapterExists( name, story ) ) {
	    console.log('chapter already exists in story',story,name);
	    return;
	};
	// the chapter div
	const x = document.createElement('div');
	x.classList.add('chapter');
	x.innerHTML = '<h4><c>+</c><b>-</b>'+name+'<button id="story_'+story.name+'_'+name+'_part" data-story-name="'+story.name+'_'+name+'" '+
	    'title="Teile auswählen" class="selpartbtn">Teile</button></h4>'+
	    '<div class="strparts"></div>';
	const chapter = { 'name': name, 'parts' : [], 'chapterdiv' : x };
	// event handlers
	const selbtn = x.querySelector('.selpartbtn');
	selbtn.onclick = ( ev ) => {
	    if ( selmode ) leaveSelmode( ev.target );
	    else enterSelmode( ev.target, story, chapter );
	};
	const foldin = x.querySelector('h4 > b');
	const foldout = x.querySelector('h4 > c');
	foldin.onclick = ( ev ) => {
	    const cnt = ev.target.parentNode.parentNode;
	    if ( !cnt.classList.contains( 'hasparts' ) ) return;
	    if ( cnt.classList.contains( 'open' ) ) {
		cnt.classList.remove('open');
	    }
	    else {
		cnt.classList.add('open');
	    }
	    console.log('newsecfoldin click', cnt);
	}
	const chaplist = container.querySelector( '.chapters' );
	container.classList.add('haschaps');
	container.classList.add('open');
	chaplist.appendChild(x);
	actchapdiv = x;
	console.log('adding chapter ',name,' to story ',story.chapters,'container',container);
	story.chapters.push( chapter );
	return chapter;
    }
    const createStoryDiv = ( name, story ) => {
	// the story div
	const x = document.createElement('div');
	x.classList.add('story');
	x.innerHTML = '<h4><c>+</c><b>-</b>'+name+'<button id="story_'+name+'_newbtn" data-story-name="'+name+'" title="neues Kapitel anlegen" class="newsecbtn">+Kapitel</button></h4>'+
	    '<div class="newsecbox"><input id="story_'+name+'_newinp" placeholder="neues Kapitel" class="newsecinp" />'+
	    '<button id="story_'+name+'_newinpcreate" class="newsecinpcreate">anlegen</button></div>'+
	    '<div class="chapters"></div>';

	// event handlers
	const newsecbox = x.querySelector('.newsecbox');
	const newsecbtn = x.querySelector('.newsecbtn');
	const newsecinp = x.querySelector('.newsecinp');
	const newsecfoldin = x.querySelector('h4 > b');
	const newsecfoldout = x.querySelector('h4 > c');
	const newseccrt = x.querySelector('.newsecinpcreate');
	const _st = story;
	newsecbtn.onclick = ( ev ) => {
	    if ( newsecbox.classList.contains('show') ) newsecbox.classList.remove('show')
	    else {
		document.getElementById('newStoryBox').classList.remove('show');
		document.getElementById('StoriesList').querySelectorAll('.show').forEach( ( o, i ) => { o.classList.remove('show'); } );
		newsecbox.classList.add('show');
	    }
	}
	newseccrt.onclick = (ev) => {
	    addChapter( _st, newsecinp.value, x );
	};
	newsecinp.onkeyup = ( ev ) => {
	    if ( ev.keyCode === 13 ) addChapter( _st, newsecinp.value, x );
	    else return;
	}
	newsecfoldin.onclick = ( ev ) => {
	    const cnt = ev.target.parentNode.parentNode;
	    if ( !cnt.classList.contains( 'haschaps' ) ) return;
	    if ( cnt.classList.contains( 'open' ) ) {
		cnt.classList.remove('open');
	    }
	    else {
		cnt.classList.add('open');
	    }
	    console.log('newsecfoldin click', cnt);
	}
	newsecfoldout.onclick = ( ev ) => {
	    console.log('newfoldout click');
	}
	document.getElementById('StoriesList').appendChild(x);
	story.storydiv = x;
	return x;
    }

    const storyExists = ( name ) => {
	let found = false;
	stories.forEach( ( o, i ) => {
	    if ( o.name === name ) found=true;
	});
	return found;
    }
    
    const addStory = ( name ) => {
	if ( name === '' || storyExists( name ) ) {
	    console.log('story already exists',name);
	    return;
	};
	const story = { 'name': name, 'chapters' : [], 'storydiv' : null };
	createStoryDiv( name, story );
	console.log('creating story',story);

	stories.push( story );
	return story;
    }
    const resetStories = () => {
	stories.splice(0);
	actstory=actchapter=null;
	document.getElementById('StoriesList').replaceChildren();
    }
    const closeAllStories = () => {
	document.getElementById('StoriesList').querySelectorAll('.open').forEach( (o, i) => {
	    o.classList.remove('open');
	});
    }
    
    const reStories = ( book ) => {
	resetStories();
	book.stories.forEach( ( o, i ) => {
	    const x = addStory( o.name );
	    if ( o.chapters.length > 0 )
		o.chapters.forEach( ( p, j ) => {
		    const y = addChapter( x, p.name, x.storydiv );
		    p.parts.forEach( ( q, k ) => {
			const part = addPartHTML( q.name, q.id, q.index );
			y.parts.push( q );
			console.log( 'adding part',q);
		    });
		    console.log('adding chapter',p,y);
		});
	});
	closeAllStories(); // if we don't do this, all stories are initially open, which is ugly
	console.log('reStories',book);
    }

    const dumpStories = () => {
	const json = { stories: [] };
	stories.forEach( ( o, i ) => {
	    json.stories.push({ name : o.name, chapters: o.chapters });
	});
	return json;
    }
    
    const initEvents = () => {
	document.getElementById('StoriesBtn').onclick = ( ev ) => {
	    if ( ev.target.classList.contains('disabled') ) return;
	    document.getElementById('storiesTwin').innerHTML = document.getElementById('deviceName').value;
	    showStoriesDlg();
	}
	document.getElementById('strDlgCls').onclick = ( ev ) => {
	    hideStoriesDlg();
	}
	document.getElementById('StoriesAddBtn').onclick = ( ev ) => {
	    const t = document.getElementById('newStoryBox');
	    if ( t.classList.contains('show') ) t.classList.remove('show');
	    else t.classList.add('show');
	}
	document.getElementById('newstorybtn').onclick = ( ev ) => {
	    addStory( document.getElementById('newstoryname').value );
	}
	document.getElementById('newstoryname').onkeyup = ( ev ) => {
	    if ( ev.keyCode === 13 ) {
		addStory( document.getElementById('newstoryname').value );
	    };
	}
	document.getElementById('StorySelClose').onclick = ( ev ) => {
	    leaveSelmode();
	};
	document.getElementById('StorySelSave').onclick = ( ev ) => {
	    // TODO
	    saveSelection();
	    leaveSelmode();
	};
    }
    initEvents();


    return {
	pool: pool,
	stories: stories,
	reStories: reStories,
	resetStories: resetStories,
	dumpStories: dumpStories
    };
}

export { Stories }
