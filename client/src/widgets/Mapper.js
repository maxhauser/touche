/**@jsx React.DOM */

var React = require('react');
var _ = require('lodash');
var Widget = require('./Widget');
var RoomDb = require('../roomdb');
var AppDispatcher = require('../AppDispatcher');

var directions = {
	'n':  [ 0,-1, 0],
	'no': [ 1,-1, 0],
	'o':  [ 1, 0, 0],
	'so': [ 1, 1, 0],
	's':  [ 0, 1, 0],
	'sw': [-1, 1, 0],
	'w':  [-1, 0, 0],
	'nw': [-1,-1, 0],
	'r':  [ 0, 0,-1],
	'h':  [ 0, 0, 1]
};

var colors = require('../colors');

var textstyles = {
	'MAP_BLACK': {fill: colors[0]},
	'MAP_RED': {fill: colors[1]},
	'MAP_GREEN': {fill: colors[2]},
	'MAP_YELLOW': {fill: colors[3]},
	'MAP_BLUE': {fill: colors[4]},
	'MAP_MAGENTA': {fill: colors[5]},
	'MAP_CYAN': {fill: colors[6]},
	'MAP_WHITE': {fill: colors[7]},
	'MAP_HI_BLACK': {fill: colors[8]},
	'MAP_HI_RED': {fill: colors[9]},
	'MAP_HI_GREEN': {fill: colors[10]},
	'MAP_HI_YELLOW': {fill: colors[11]},
	'MAP_HI_BLUE': {fill: colors[12]},
	'MAP_HI_MAGENTA': {fill: colors[13]},
	'MAP_HI_CYAN': {fill: colors[14]},
	'MAP_HI_WHITE': {fill: colors[15]}
};

var Room = React.createClass({
	render: function() {
		var props = this.props;
		var x = props.x;
		var y = props.y;
		var size = props.size;

		var els = [
			<rect key="rect"
				x={x} 
				y={y}
				width={size}
				height={size}
				style={props.style}
				className='map-room'/>
		];

		var room = props.room;
		if (room.icon) {
			var m = /^(%\^(.*?)%\^)?(.)/.exec(room.icon);
			if (m) {
				var styletext = m[2], styles;
				if (styletext) {
					styles = textstyles[styletext];
				}
				els.push(<text key="icon" x={x + size/2} y={y + size*0.75} className="map-room-icon" style={styles}>{m[3]}</text>);
			}
		}

		return <g>{els}</g>;
	}
});

var Mapper = React.createClass({
	propTypes: {
		itemSize: React.PropTypes.number,
		fieldSize: React.PropTypes.number
	},
	getInitialState: function() {
		return {room: RoomDb.current()};
	},
	getDefaultProps: function() {
		return {itemSize: 16, fieldSize: 30};
	},
	onRoomChanged: function() {
		var room = RoomDb.current();
		this.setState({room: room});
		//console.log(room);
	},
	componentDidMount: function() {
		AppDispatcher.on('room.changed', this.onRoomChanged);
		AppDispatcher.on('room.updated', this.onRoomChanged);
	},
	componentWillUnmount: function() {
		AppDispatcher.off('room.changed', this.onRoomChanged);
		AppDispatcher.off('room.updated', this.onRoomChanged);
	},
	getRooms: function() {
		var rooms = {};
		var coords = {};
		var joins = {};
		var queue = [];
		var els = [];

		var room = this.state.room;
		if (!room)
			return [];

		var area = room.area;

		var push = Array.prototype.push;

		var addroom = function(room, c) {
			if (rooms[room.id] || room.area !== area)
				return;

			rooms[room.id] = true;
			coords[c[0] + ',' + c[1]] = room.id;
			var exits = room.exits;
			push.apply(queue, _.map(exits, function(id, dir) {
				return { coords: c, sourceid: room.id, targetid: id, dir: dir};
			}));
			if (this.isInBounds(c))
				els.unshift(this.renderRoom(room, c));
		}.bind(this);

		addroom(room, [0,0]);
		while(queue.length !== 0) {
			var curr = queue.shift();
			var d = directions[curr.dir];
			if (!d || d[2] !== 0)
				continue;
			var c = [curr.coords[0] + d[0],curr.coords[1] + d[1]];
			var targetkey = c[0] + ',' + c[1];
			var elkey = curr.sourceid + ';' + curr.dir;
			if (coords[targetkey] && coords[targetkey] !== curr.targetid) {
				if (this.isInBounds(curr.coords))
					els.unshift(this.renderShadowExit(elkey, curr.coords, d));
				continue;
			}
			var target = RoomDb.get(curr.targetid);
			if (!target) {
				if (this.isInBounds(curr.coords))
					els.unshift(this.renderHalfExit(elkey, curr.coords, d));
				continue;
			}
			var key = curr.coords[0] + ',' + curr.coords[1];
			if (!joins[key + ':' + targetkey]) {
				joins[targetkey + ':' + key] = true;
				addroom(target, c);
				if (this.isInBounds(curr.coords))
					els.unshift(this.renderExit(elkey, curr.coords, d));
			}
		}

		return els;
	},
	isInBounds: function(c) {
		return c[0] > -5 && c[0] < 5 && c[1] > -5 && c[1] < 5;
	},
	renderShadowExit: function(key, coords, d) {
		var fieldSize = this.props.fieldSize;
		var itemSize = this.props.itemSize;
		var x = coords[0]*fieldSize + itemSize/2, y = coords[1]*fieldSize + itemSize/2;
		var len = fieldSize*0.4;
		return <line
			key={key}
			x1={x}
			y1={y}
			x2={x + d[0]*len}
			y2={y + d[1]*len}
			style={{stroke:'#888','stroke-width':"2"}}/>;
	},
	renderHalfExit: function(key, coords, d) {
		var fieldSize = this.props.fieldSize;
		var itemSize = this.props.itemSize;
		var x = coords[0]*fieldSize + itemSize/2, y = coords[1]*fieldSize + itemSize/2;
		var len = fieldSize/2;
		return <line
			key={key}
			x1={x}
			y1={y}
			x2={x + d[0]*len}
			y2={y + d[1]*len}
			style={{stroke:'#ccc','stroke-width':"2"}}/>;
	},
	renderExit: function(key, coords, d) {
		var fieldSize = this.props.fieldSize;
		var itemSize = this.props.itemSize;
		var x = coords[0]*fieldSize + itemSize/2, y = coords[1]*fieldSize + itemSize/2;
		return <line
			key={key}
			x1={x}
			y1={y}
			x2={x + d[0]*fieldSize}
			y2={y + d[1]*fieldSize}
			style={{stroke:'#ccc','stroke-width':"2"}}/>;
	},
	renderRoom: function(room, coords) {
		var props = this.props;
		var style={};
		if (room.id === this.state.room.id)
			style.fill = '#cfc';

		return <Room key={room.id} room={room} 
			x={coords[0]*props.fieldSize} y={coords[1]*props.fieldSize} size={props.itemSize} 
			style={style} />;
	},
	render: function() {
		var room = this.state.room;
		var els = [];
		var rooms = this.getRooms();
		return (<Widget caption={'Karte' + (room && room.area ? (': ' + room.area) : '')}>
			<svg width="200px" height="200px">
				<g transform="translate(100,100)">{rooms}</g>
			</svg>
		</Widget>);
	}
});

require('../ComponentRegistry').defineValue('widget.Mapper', Mapper);
module.exports = Mapper;
