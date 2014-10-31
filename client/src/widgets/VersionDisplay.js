/**@jsx React.DOM*/
var React = require('react');

var version = '0.1';
var href = 'mailto:avalonwebproxysupport@hij.cc';

var VersionDisplay = React.createClass({
	supportClick: function(e) {
		e.preventDefault();
		var win = window.open(href,'Mail Client wird geöffnet...','width=50,height=50');
		window.setTimeout(win.close.bind(win),1000);
	},
    render: function() {
        return (<p className="widget version">
        	<a target="_blank" title="Avalon Webseite" href="http://avalon.mud.de/index.php?enter=1">Avalon Webseite</a><br/>
            <a target="_blank" title="Fehler oder Idee melden" onClick={this.supportClick} href={href}>Bitte hilf mit und melde Fehler oder Ideen hier.</a><span> Danke!</span>
        </p>);
    }
});

require('../ComponentRegistry').defineValue('widget.VersionDisplay', VersionDisplay);
module.exports = VersionDisplay;
