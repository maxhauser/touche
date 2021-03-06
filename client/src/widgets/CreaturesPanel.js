/**@jsx React.DOM*/
var React = require('react');
var AppDispatcher = require('../AppDispatcher');
var Widget = require('./Widget');
var mxp = require('../mxputils');
var _ = require('lodash');

var CreaturesPanel = React.createClass({
	getInitialState: function() {
		return {creatures:{}};
	},
	render: function() {
		var renderCreature = function(name, id) {
			return <div key={id}>{name}</div>;
		};

		return <Widget caption="NPCs" emptytext="Niemand da">{_.map(this.state.creatures, renderCreature)}</Widget>;
	},
	componentDidMount: function() {
		AppDispatcher.on('ast', this.onEmit);
		AppDispatcher.on('mxp', this.onMxp);
		AppDispatcher.on('atcp', this.onAtcp);
	},
	componentWillUnmount: function() {
		AppDispatcher.off('ast', this.onEmit);
		AppDispatcher.off('mxp', this.onMxp);
		AppDispatcher.off('atcp', this.onAtcp);
	},
	onAtcp: function(name, value) {
		if (name === 'Avalon.Getoetet') {
			var creatures = this.state.creatures;
			delete creatures[value];
			this.setState({creatures: creatures});
		}
	},
	onMxp: function(markup) {
		if (/<expire\s+ROOM>/gi.test(markup))
			this.setState({creatures:{}});
	},
	onEmit: function(ast) {
		if (ast.type === 'mxp-open-element') {
			//console.log(JSON.stringify(ast));
			switch(ast.name) {
				case 'living': {
					var attribs = mxp.attribsToObject(ast.attribs);
					var id = (/!betrachte\s+([^|]+)/.exec(attribs.livingcmd)||{})[1];
					var name = (/^[^|]+/.exec(attribs.livinghint)||{})[0];
					if (id && name) {
						var creatures = this.state.creatures;
						creatures[id] = name;
						this.setState({creatures: creatures});
					}
				}
				break;
				case 'expire':
					if (ast.attribs[0] === 'ROOM')
						this.setState({creatures:{}});
				break;
			}
		}
	}
});

require('../ComponentRegistry').defineValue('widget.CreaturesPanel', CreaturesPanel);
module.exports = CreaturesPanel;
