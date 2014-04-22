/**@jsx React.DOM*/
var React = require('react');

var VersionDisplay = React.createClass({
    render: function() {
        return (<p className="widget version">
            <span>Bitte hilf mit und melde Fehler oder Ideen <a target="_blank" href="https://github.com/maxhauser/touche/issues/new">hier</a>. Danke!</span>
        </p>);
    }
});

require('../ComponentRegistry').defineValue('widget.VersionDisplay', VersionDisplay);
module.exports = VersionDisplay;
