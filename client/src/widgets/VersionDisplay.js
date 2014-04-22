/**@jsx React.DOM*/
var React = require('react');

var version = '0.1.x ALPHA';
var href = 'mailto:avalonwebproxysupport@hij.cc?subject=Ein%20BUG%20in%20Version%20' + version.replace(' ', '%20') + '!&body=Hallo%20Rupert!%0D%0AIch habe einen Bug gefunden:%0D%0A';

var VersionDisplay = React.createClass({
	supportClick: function(e) {
		e.preventDefault();
		var win = window.open(href,'Mail Client wird geöffnet...','width=50,height=50');
		window.setTimeout(win.close.bind(win),1000);
		//win.close();
		// this does not work with https
		// this.refs.iframe.getDOMNode().contentWindow.location.href = href;
	},
    render: function() {
        return <div className="widget version">
			<iframe ref="iframe" style={{display:'none'}}></iframe>
            <div>Version: {version}</div>
            <div><a onClick={this.supportClick} href={href}>Ich habe einen BUG gefunden!</a></div>
            </div>;
    }
});

require('../ComponentRegistry').defineValue('widget.VersionDisplay', VersionDisplay);
module.exports = VersionDisplay;
