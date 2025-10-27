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
    //	hideSceneHelpers();
    
    sznDlg.classList.remove('vis');
    //	console.log( 'clicked dokumente button' );
}   


function Stories() {
    const pool = [];
    const tree = {};
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
    return {
	pool: pool,
	tree: tree
    };
}

export { Stories }
