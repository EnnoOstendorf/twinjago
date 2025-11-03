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
    
    const chapterExists = ( name, story ) => {
	console.log('chapterExists?',story);

	let found = false;
	if ( story.chapters ) story.chapters.forEach( ( o, i ) => {
	    if ( o.name === name ) found=true;
	});
	return found;
    }
    const removePart = ( partovl, chapter ) => {
	partovl.classList.remove('selected');
	const part = partovl.parentNode;
	const name = part.querySelector('strong').innerHTML;
	const id = part.querySelector('c').getAttribute('data-id');
	const index = parseInt(part.id.substr(4));
	const seldiv = document.getElementById('StorySelParts');
	const x = seldiv.querySelector('#selpart'+id);
	seldiv.removeChild(x);
	chapter.parts.forEach( ( o,i ) => { chapter.parts.splice( i, 1 ); } );
	console.log('removing part', name, id, index, x, chapter );
    }
    const addPart = ( partovl, chapter ) => {
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
	    removePart( partovl, chapter );
	}
	seldiv.appendChild(x);
	chapter.parts.push({'name':name,'index':index,'id':id, 'partdiv':part, 'partseldiv':x });
	console.log('adding part', name, id, index, chapter );
    }
    
    const enterSelmode = ( btn, story, chapter ) => {
	selmode = true;
	btn.classList.add('chosen');
	document.getElementById('StorySelChap').innerHTML = chapter.name;
	document.getElementById('StorySelStr').innerHTML = story.name;
	document.body.classList.add('storyselmode');
	document.querySelectorAll('#partsinner .part').forEach( ( o, i ) => {
	    const x=document.createElement('div'); x.classList.add('strSelOvl');
	    x.onclick= (ev) => {
		if ( x.classList.contains('selected') ) {
		    removePart( x, chapter );
		}
		else {
		    addPart( x, chapter );
		}
	    }
	    o.appendChild(x);
	});
    }
    const leaveSelmode = () => {
	selmode = false;
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
	x.innerHTML = '<h4>'+name+'<button id="story_'+story.name+'_'+name+'_part" data-story-name="'+story.name+'_'+name+'" '+
	    'title="Teile auswählen" class="selpartbtn">+Teil</button></h4>'+
	    '<div class="parts"></div>';
	const chapter = { 'name': name, 'parts' : [], 'chapterdiv' : x };
	// event handlers
	const selbtn = x.querySelector('.selpartbtn');
	selbtn.onclick = ( ev ) => {
	    if ( selmode ) leaveSelmode( ev.target );
	    else enterSelmode( ev.target, story, chapter );
	};
	const chaplist = container.querySelector( '.chapters' );
	chaplist.appendChild(x);
	console.log('adding chapter ',name,' to story ',story.chapters,'container',container);
	story.chapters.push( chapter );
    }
    const createStoryDiv = ( name, story ) => {
	// the story div
	const x = document.createElement('div');
	x.classList.add('story');
	x.innerHTML = '<h4>'+name+'<button id="story_'+name+'_newbtn" data-story-name="'+name+'" title="neues Kapitel anlegen" class="newsecbtn">+Kapitel</button></h4>'+
	    '<div class="newsecbox"><input id="story_'+name+'_newinp" placeholder="neues Kapitel" class="newsecinp" />'+
	    '<button id="story_'+name+'_newinpcreate" class="newsecinpcreate">anlegen</button></div>'+
	    '<div class="chapters"></div>';

	// event handlers
	const newsecbox = x.querySelector('.newsecbox');
	const newsecbtn = x.querySelector('.newsecbtn');
	const newsecinp = x.querySelector('.newsecinp');
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
	    if ( ev.keyCode === 13 ) addChapter( name, newsecinp.value, x );
	    else return;
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
	    //	    addStory( document.getElementById('newstoryname') );
	}
	document.getElementById('StorySelClose').onclick = ( ev ) => {
	    leaveSelmode();
	};
	document.getElementById('StorySelSave').onclick = ( ev ) => {
	    // TODO
	    leaveSelmode();
	};
    }
    initEvents();


    return {
	pool: pool,
	stories: stories
    };
}

export { Stories }
