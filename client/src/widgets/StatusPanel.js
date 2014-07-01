/**@jsx React.DOM */

var React = require('react');
var AppDispatcher = require('../AppDispatcher');
var _ = require('lodash');
var Widget = require('./Widget');
var env = require('../Environment');

var StatusBar = React.createClass({
	render: function() {
		var perc = this.props.enabled ? (100 - (this.props.curr * 100 / this.props.max)) : 0;
		var props = this.props;
		var styles = {};
		if (this.props.direction === 'horizontal')
			styles.display = 'inline-block';
		return <div className={"statusline-wrap " + (this.props.className||'')} style={styles}>
			<div className="statusline-bg">
				<div className="statusline" style={{'padding-right': perc + '%'}}/>
			</div>
			<span className="statusline-label">{props.label + ": " + props.curr + " (" + (props.max||'?') + ")"}</span>
		</div>;
	}
}); 

var stats = ['tp','ap','sp','mp'];
var label = {
	tp: 'Trefferpunkte',
	ap: 'Aktionspunkte',
	sp: 'Zauberpunkte',
	mp: 'Manapunkte'
};

var StatusPanel = React.createClass({
	getInitialState: function() {
		return {};
	},
	onAtcp: function(name, value) {
		var state = this.state, val;
		switch (name) {
			case 'Avalon.MAX_TP': val = state.tp || {}; val.max = value; this.setState({isset: true, tp: val}); break;
			case 'Avalon.TP': val = state.tp || {}; val.curr = value; this.setState({tp: val}); break;
			case 'Avalon.MAX_SP': val = state.sp || {}; val.max = value; this.setState({sp: val}); break;
			case 'Avalon.SP': val = state.sp || {}; val.curr = value; this.setState({sp: val}); break;
			case 'Avalon.MAX_AP': val = state.ap || {}; val.max = value; this.setState({ap: val}); break;
			case 'Avalon.AP': val = state.ap || {}; val.curr = value; this.setState({ap: val}); break;
			case 'Avalon.MAX_MP': val = state.mp || {}; val.max = value; this.setState({mp: val}); break;
			case 'Avalon.MP': val = state.mp || {}; val.curr = value; this.setState({mp: val}); break;
		}
	},
	onDisconnected: function() {
		this.replaceState({});
	},
	componentDidMount: function() {
		AppDispatcher.on('atcp', this.onAtcp);
		AppDispatcher.on('disconnected', this.onDisconnected);
	},
	componentWillUnmount: function() {
		AppDispatcher.off('atcp', this.onAtcp);
		AppDispatcher.off('disconnected', this.onDisconnected);
	},
	render: function() {
		var state = this.state;
		var items = [];
		if (this.state.isset || !env.lightUI) {
			_.each(stats, function(st) {
				var s = state[st];
				var enabled = s && s.max;
				items.push(<StatusBar key={st} className={st} enabled={enabled} curr={s?s.curr:'?'} max={s?s.max:'?'} label={label[st]} direction={this.props.direction}/>);
			}, this);
		}
		return <Widget caption="Stats">{items}</Widget>;
	}
});

require('../ComponentRegistry').defineValue('widget.StatusPanel', StatusPanel);
module.exports = StatusPanel;
