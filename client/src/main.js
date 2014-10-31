/**@jsx React.DOM*/

if (!Object.assign) {
  Object.defineProperty(Object, "assign", {
    enumerable: false,
    configurable: true,
    writable: true,
    value: function(target, firstSource) {
      "use strict";
      if (target === undefined || target === null)
        throw new TypeError("Cannot convert first argument to object");

      var to = Object(target);

      var hasPendingException = false;
      var pendingException;

      for (var i = 1; i < arguments.length; i++) {
        var nextSource = arguments[i];
        if (nextSource === undefined || nextSource === null)
          continue;

        var keysArray = Object.keys(Object(nextSource));
        for (var nextIndex = 0, len = keysArray.length; nextIndex < len; nextIndex++) {
          var nextKey = keysArray[nextIndex];
          try {
            var desc = Object.getOwnPropertyDescriptor(nextSource, nextKey);
            if (desc !== undefined && desc.enumerable)
              to[nextKey] = nextSource[nextKey];
          } catch (e) {
            if (!hasPendingException) {
              hasPendingException = true;
              pendingException = e;
            }
          }
        }

        if (hasPendingException)
          throw pendingException;
      }
      return to;
    }
  });
}

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

React.render(supportedBrowser()?<Page/>:<OldBrowser/>, document.getElementById('page'));

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
