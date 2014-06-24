/**@jsx React.DOM */

var React = require('react');
var Widget = require('./Widget');
var env = require('../Environment');
var CurrentExits = require('../currentexits');

var Pointer = React.createClass({
	handleClick: function() {
		if (this.props.cmd) {
			env.fire('send', 'cmd', this.props.cmd, false, true);
			env.fire('inputExpected');
		}
	},
	render: function() {
		var style = {};
		if (this.props.cmd) {
			style.cursor = 'pointer';
			style.textDecoration = 'underline';
			style.opacity = 1;
		} else {
			style.opacity = 0.25;
		}
		return (
			<g transform={"rotate(" + this.props.rotate + ")" + (this.props.scale?" scale(" + this.props.scale + ")":"")}
				onClick={this.handleClick} style={style} className={this.props.cmd?'compass-part':''}>
				<polygon points="0 -80 -15 -15 0 0" fill="white" stroke="black" style={{'stroke-width':2}}/>
				<polygon points="0 -80 15 -15 0 0" fill="black" stroke="black" style={{'stroke-width':2}}/>
				<text x={0} y={-84} style={{textAnchor:'middle',fontFamily:'President',fontSize:'1.4rem'}}>{this.props.text}</text>
			</g>
		);
	}
});

var Icon = React.createClass({
	handleClick: function() {
		if (this.props.cmd) {
			env.fire('send', 'cmd', this.props.cmd, false, true);
			env.fire('inputExpected');
		}
	},
	render: function() {
		var style = {fontFamily: 'FontAwesome', fontSize:'1.4rem', textAnchor: 'middle', alignmentBaseline: 'middle'};
		if (this.props.cmd) {
			style.cursor = 'pointer';
			style.textDecoration = 'underline';
			style.opacity = 1;
		} else {
			style.opacity = 0.25;
		}
		return <text x={this.props.x} y={this.props.y}
				style={style} onClick={this.handleClick}>{this.props.text}</text>;
	}
});

var Compass = React.createClass({
	getInitialState: function() {
		return {exits:{}, connected: false};
	},
	onConnected: function() {
		env.fire('send', 'atcp', 'ava_set_ka 1');
		env.fire('send', 'atcp', 'ava_set_noinband_ka 1');
	},
	onAtcp: function(name, value) {
		if (name !== 'Avalon.Kommandoanzeige')
			return;
		var re = /<exit\s+exitdir='([\w\s]+)'\s+exithint='(\w+)'>/g;
		var exits = {};
		var m;
		while((m = re.exec(value))) {
			exits[m[2]] = m[1];
		}

		CurrentExits.exits = exits;

		this.setState({exits:exits, connected: true});
	},
	onDisconnected: function() {
		this.setState({connected: false});
	},
	componentDidMount: function() {
		env.on('connected', this.onConnected);
		env.on('disconnected', this.onDisconnected);
		env.on('atcp', this.onAtcp);
	},
	componentWillUnmount: function() {
		env.off('connected', this.onConnected);
		env.off('disconnected', this.onDisconnected);
		env.off('atcp', this.onAtcp);
	},
	render: function() {
		var exits = this.state.exits;
		var els;
		var arrowUp = '\uf062';
		var arrowDown = '\uf063';
		var exit = '\uf08b';
		var filter = '<filter id="back-glow"><feColorMatrix type="matrix" values="0 0 0 0   0 0 0 0 0   0 0 0 0 0   0 0 0 0 0.7 0"/>' +
			'<feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>' +
			'<feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>' +
			'</filter>';
		if (this.state.connected || !env.lightUI) {
			els = [<Pointer key="no" text="NO" rotate={45} scale={0.8} cmd={exits.nordosten}/>,
					<Pointer key="so" text="SO" rotate={135} scale={0.8} cmd={exits.suedosten}/>,
					<Pointer key="sw" text="SW" rotate={225} scale={0.8} cmd={exits.suedwesten}/>,
					<Pointer key="nw" text="NW" rotate={315} scale={0.8} cmd={exits.nordwesten}/>,

					<Pointer key="n" text="N" rotate={0} cmd={exits.norden}/>,
					<Pointer key="o" text="O" rotate={90} cmd={exits.osten}/>,
					<Pointer key="s" text="S" rotate={180} cmd={exits.sueden}/>,
					<Pointer key="w" text="W" rotate={270} cmd={exits.westen}/>];
			if (exits.hoch)
				els.push(<Icon key="up" x={-80} y={-80} text={arrowUp} cmd={exits.hoch}/>);
			if (exits.runter)
				els.push(<Icon key="down" x={-80} y={80} text={arrowDown} cmd={exits.runter}/>);
			if (exits.raus)
				els.push(<Icon key="raus" x={80} y={80} text={exit} cmd={exits.raus}/>);
			els = (<svg width={180} height={180}>
			<g dangerouslySetInnerHTML={{__html:filter}}/>
			<g transform="translate(100,100) scale(0.8)">
				{els}
			</g>
			</svg>);
		}
		return <Widget caption="Kompass" className="compass-widget">{els}</Widget>;
	}
});

require('../ComponentRegistry').defineValue('widget.Compass', Compass);

module.exports = Compass;
