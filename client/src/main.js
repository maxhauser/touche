/**@jsx React.DOM*/

//var React = require('expose?React!react');
var React = require('react');
var Page = require('./page');
var OldBrowser = require('./oldbrowser');

if (DEBUG) {
	window.React = React;
}

var browserSupport = [
	{ browser: 'chrome', version: 32 },
	{ browser: 'ie', version: 11 },
	{ browser: 'firefox', version: 24 },
	{ browser: 'safari', version: 7 }
];

React.renderComponent(supportedBrowser()?<Page/>:<OldBrowser/>, document.getElementById('page'));

function supportedBrowser() {

	if (/forcebrowser/.test(location.search))
		return true;

	var b = getBrowser();
	var browser = b[0].toLowerCase();
	var version = parseInt(b[1], 10);
	//console.log(browser, version);

	for(var i=0,l=browserSupport.length;i<l;i++) {
		var test = browserSupport[i];
		if (test.browser === browser && test.version <= version)
			return true;
	}

	return false;
}

function getBrowser(){
    var ua= navigator.userAgent, tem,
    M= ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*([\d\.]+)/i) || [];
    if(/trident/i.test(M[1])){
        tem=  /\brv[ :]+(\d+(\.\d+)?)/g.exec(ua) || [];
        return ['IE', tem[1] || ''];
    }
    M= M[2]? [M[1], M[2]]:[navigator.appName, navigator.appVersion, '-?'];
    if((tem= ua.match(/version\/([\.\d]+)/i)) !== null) M[2]= tem[1];
    return M;
}
