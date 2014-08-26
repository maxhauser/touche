/**@jsx React.DOM */

require('./Compass.less');

var React = require('react');
var Widget = require('./Widget');
var env = require('../Environment');
var CurrentExits = require('../currentexits');

var PointerLight = React.createClass({
	handleClick: function() {
		if (this.props.cmd) {
			env.fire('send', 'cmd', this.props.cmd, false, true);
			env.fire('inputExpected');
		}
	},
	render: function() {
		var textstyle = {textAnchor:'middle',fontFamily:'President',fontSize:'1.4rem'};
		var linestyle = {strokeWidth:2,stroke:'black',fill:'none'};
		if (this.props.cmd) {
			textstyle.cursor = 'pointer';
			textstyle.textDecoration = 'underline';
			textstyle.opacity = 1;
			linestyle.opacity = 1;
		} else {
			textstyle.opacity = 0.25;
			linestyle.opacity = 0.25;
		}
		return (
			<g transform={"rotate(" + this.props.rotate + ")" + (this.props.scale?" scale(" + this.props.scale + ")":"")}
				onClick={this.handleClick} className={this.props.cmd?'compass-part':''}>
				<polyline points="15 -15 0 -80 -15 -15" fill="white"/>
				<path d="M15 -15 L0 -80 -15 -15" style={linestyle} className="glow"/>
				<text transform={"rotate(" + -this.props.rotate + " 0 -95)"} x={0} y={-88} style={textstyle} className="glow">{this.props.text}</text>
			</g>
		);
	}
});

var PointerDark = React.createClass({
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
		var textel;
		if (this.props.text)
			textel = <text x={0} y={-88} style={{textAnchor:'middle',fontFamily:'President',fontSize:'1.4rem'}}>{this.props.text}</text>;

		return (
			<g transform={"rotate(" + this.props.rotate + ")" + (this.props.scale?" scale(" + this.props.scale + ")":"")}
				onClick={this.handleClick} style={style} className={this.props.cmd?'compass-part':''}>
				<polygon points="0 -80 -15 -15 0 0" fill="white" stroke="black" style={{'stroke-width':2}}/>
				<polygon points="0 -80 15 -15 0 0" fill="black" stroke="black" style={{'stroke-width':2}}/>
				{textel}
			</g>
		);
	}
});

var Pointer = env.lightUI ? PointerLight : PointerDark;

var Icon = React.createClass({
	getDefaultProps: function() {
		return {
			fontFamily: 'FontAwesome',
			fontSize: '1.4rem',
			textAnchor: 'middle'
		};
	},
	handleClick: function() {
		if (this.props.cmd) {
			env.fire('send', 'cmd', this.props.cmd, false, true);
			env.fire('inputExpected');
		}
	},
	render: function() {
		var style = {fontFamily: this.props.fontFamily, fontSize: this.props.fontSize,
			textAnchor: this.props.textAnchor, alignmentBaseline: this.props.alignmentBaseline};
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
		if (this.state.connected || !env.lightUI) {
			els = [<Pointer key="no" rotate={45} scale={0.8} cmd={exits.nordosten}/>,
					<Pointer key="so" rotate={135} scale={0.8} cmd={exits.suedosten}/>,
					<Pointer key="sw" rotate={225} scale={0.8} cmd={exits.suedwesten}/>,
					<Pointer key="nw" rotate={315} scale={0.8} cmd={exits.nordwesten}/>,

					<Pointer key="n" text="N" rotate={0} cmd={exits.norden}/>,
					<Pointer key="o" text="O" rotate={90} cmd={exits.osten}/>,
					<Pointer key="s" text="S" rotate={180} cmd={exits.sueden}/>,
					<Pointer key="w" text="W" rotate={270} cmd={exits.westen}/>];
			//if (exits.runter)
				els.push(<Icon key="down" textAnchor="start" fontFamily="President" x={-95} y={95} text="runter" cmd={exits.runter}/>);
			//if (exits.hoch)
				els.push(<Icon key="up" textAnchor="end" fontFamily="President" x={95} y={95} text="hoch" cmd={exits.hoch}/>);

			els = (<svg width={180} height={180}>
			<g transform="translate(90,90) scale(0.8)">
				{els}
			</g>
			</svg>);
		}
		return <Widget caption="Kompass" className="compass-widget">{els}</Widget>;
	}
});

require('../ComponentRegistry').defineValue('widget.Compass', Compass);

module.exports = Compass;
