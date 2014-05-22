/**@jsx React.DOM */
/* global Dropbox */

require('script!../../vendor/dropbox-datastores-1.0.1.js');
var React = require('react');
var Widget = require('./Widget');
var Alertify = require('../alertify');
var _ = require('lodash');
var Api = require('../Api');

var DropboxPanel = React.createClass({
	getInitialState: function() {
		var client = new Dropbox.Client({key: '3fazygmp9matih6'});

		client.authenticate({interactive: false}, function (error) {
			if (error) {
				Alertify.error('Anmelden fehlgeschlagen: ' + error);
			}
		});

		var connected = client.isAuthenticated();

		if (connected)
			_.defer(this.loadStartupScript, this);

		Api.load = this.load;

		return {connected: connected, client: client};
	},
	load: function(file) {
		if (file.indexOf('.') === -1)
			file += '.coffee';
		this.state.client.readFile(file, {httpCache: false}, function(error, content, stats, range) {
			if(error) {
				Alertify.error('Error loading "' + file  + '": ' + error);
			} else {
				Api.exec(content, file);
				Alertify.log('Loaded ' + file);
			}
		});
	},
	loadStartupScript: function() {
		this.state.client.readFile("autoexec.coffee", {httpCache: false}, function(error, content, stats, range) {
			if(!error) {
				Api.exec(content, 'autoexec.coffee');
				Alertify.log('Loaded autoexec.coffee.');
			}
		});
	},
	handleConnect: function() {
		if (this.state.client.connected) {
			this.state.client.signOut({mustInvalidate: true}, function(error) {
				if (error) {
					Alertify.error('Abmelden fehlgeschlagen: ' + error);
				} else {
					this.setState({connected: false});
				}
			}.bind(this));
		}
		else
		{
			this.state.client.authenticate();
		}
	},
	render: function() {
		return (<Widget caption="Dropbox" className="dropbox-widget">
			<button className={"topcoat-button--" + (this.state.connected?"large":"cta")}
                   onClick={this.handleConnect}>
                   <i className="fa fa-dropbox"/>{this.state.connected?" Abmelden":" Anmelden"}</button>
		</Widget>);
	}
});

require('../ComponentRegistry').defineValue('widget.Dropbox', DropboxPanel);

module.exports = DropboxPanel;
