/** @jsx React.DOM */
var React = require('react');

var OldBrowser = React.createClass({
	render: function() {
		return <div className="notsupported">
			<h3>Die Applikation funktioniert nur mit einer aktuellen Version von Chrome, FireFox, Safari oder Internet Explorer.</h3>
			<a className="notsupported-forcelink" href="?forcebrowser">Das schreckt mich nicht ab und ich will es trotzdem probieren.</a>
		</div>;
	}
});

module.exports = OldBrowser;
