/**@jsx React.DOM*/
var React = require('react');

var VersionDisplay = React.createClass({
    render: function() {
        return (<p className="widget version">
            <a target="_blank" title="Fehler oder Idee melden" href="https://github.com/maxhauser/touche/issues/new">Bitte hilf mit und melde Fehler oder Ideen hier.</a><span> Danke!</span>
        </p>);
    }
});

require('../ComponentRegistry').defineValue('widget.VersionDisplay', VersionDisplay);
module.exports = VersionDisplay;
