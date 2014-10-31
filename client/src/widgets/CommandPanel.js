/**@jsx React.DOM */

var React = require('react');
var env = require('../Environment');
require('./CommandPanel.less');

var CommandItem = React.createClass({
	handleClick: function(event) {
		event.preventDefault();
		env.fire('send', 'cmd', this.props.command.cmd, false, true);
		env.fire('inputExpected');
	},
	render: function() {
		var command = this.props.command;
		return (<li className="commands-widget-list-item">
			<a onClick={this.handleClick} title={command.tip}>{command.caption}</a>
		</li>);
	}
});

var CommandPanel = React.createClass({
	getInitialState: function() {
		return {commands: []};
	},
	onConnected: function() {
		env.fire('send', 'atcp', 'ava_set_ka 1');
		env.fire('send', 'atcp', 'ava_set_noinband_ka 1');
	},
	onAtcp: function(name, value) {
		if (name !== 'Avalon.Kommandoanzeige')
			return;
		var re = /<send\s+'(.*?)'\s+hint='(.*?)'>(.?\[7z)?(.*?)(.?\[1z)?<\/send>/g;
		var commands = [];
		var m;
		while((m = re.exec(value))) {
			commands.push({caption: m[4], tip: m[2], cmd: m[1]});
		}
		// move '...' command to last position
		for (var i = commands.length - 1; i >= 0; i--) {
			if (commands[i].caption === '...') {
				commands.push(commands.splice(i, 1)[0]); // move to last
				break;
			}
		}
		this.setState({commands:commands});
	},
	onDisconnected: function() {
		this.setState({commands: []});
	},
	componentDidMount: function() {
		env.on('connected', this.onConnected);
		env.on('disconnected', this.onDisconnected);
		env.on('atcp', this.onAtcp);
	},
	componentWillUnmount: function() {
		env.off('atcp', this.onAtcp);
		env.off('connected', this.onConnected);
		env.off('disconnected', this.onDisconnected);
	},
	renderCommand: function(command){
		return <CommandItem key={command.cmd} command={command}/>;
	},
	render: function() {
		return (<div {...this.props} className="commands-widget">
				<ul className="commands-widget-list">{this.state.commands.map(this.renderCommand)}</ul>
			</div>);
	}
});

require('../ComponentRegistry').defineValue('widget.CommandPanel', CommandPanel);

module.exports = CommandPanel;
