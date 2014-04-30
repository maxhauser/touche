/**@jsx React.DOM */

var React = require('react');
var Widget = require('./Widget');
var env = require('../Environment');
var RoomDb = require('../roomdb');
var Pathfinder = require('../Pathfinder');
var _ = require('lodash');
var Api = require('../Api');

var max = (1<<30);

var finder = new Pathfinder({
	getExits: function(id) { 
		var room = RoomDb.get(id);
		if (room)
			return room.exits; 
	},
	getDist: function() { return 1; }
});

var Suggestion = React.createClass({
	onClick: function() {
		Api.map.walkTo(this.props.room.id);
	},
	render: function() {
		return (<li className="goto-suggestion">
			<span className="goto-suggestion-distance">{this.props.distance}</span>
			<span className="goto-suggestion-caption">{this.props.room.brief}</span>
			<i className="goto-suggestion-play fa fa-sign-in pull-right" title={"Gehe zu " + this.props.room.brief} onClick={this.onClick}/>
		</li>);
	}
});

var GoToPanel = React.createClass({
	getInitialState: function() {
		return {suggestions: [], enabled: !!RoomDb.current()};
	},
	componentDidMount: function() {
		env.on('room.changed', this.onRoomChange);
	},
	componentWillUnmount: function() {
		env.off('room.changed', this.onRoomChange);
	},
	onRoomChange: function() {
		this.setState({value: ''});
		this.setState({enabled: !!RoomDb.current(), suggestions: [], distanceMap: null});
	},
	handleChange: function(event) {
		this.setState({value: event.target.value}, this.updateSuggestions);
	},
	getDistanceMap: function() {
		var distanceMap = this.state.distanceMap;

		if (!distanceMap) {
			distanceMap = finder.getDistanceMap(RoomDb.current().id);
			this.setState({distanceMap: distanceMap});
		}

		return distanceMap;
	},
	updateSuggestions: function() {
		var value = this.state.value;
		if (!value || /^\s*$/.test(value)) {
			this.setState({suggestions: []});
			return;
		}

		var distanceMap = this.getDistanceMap();
		var rooms = RoomDb.findAll(this.state.value, function(id) { return distanceMap[id]; }, 8);
		var suggestions = [];
		_.each(rooms, function(room) {
			suggestions.push({room: room, distance: distanceMap[room.id].dist});
		});
		this.setState({suggestions: _.first(suggestions.sort(function(a,b){return (a.distance - b.distance);}), 8)});
	},
	renderSuggestion: function(suggestion) {
		return <Suggestion distance={suggestion.distance} room={suggestion.room}/>;
	},
	renderList: function() {
		return (<ul className="goto-suggestion-list">
		{this.state.suggestions.map(this.renderSuggestion)}
		</ul>);
	},
	render: function() {
		return (
			<Widget caption="Gehe zu">
				<input type="text" className="topcoat-text-input--large" placeholder="Ortssuche"
					disabled={this.state.enabled?"":"disabled"} value={this.state.value} onChange={this.handleChange}/>
				{this.state.suggestions.length === 0?React.DOM.span({className:'goto-no-suggestions'},"Keine Vorschläge"):this.renderList()}
			</Widget>
		);
	}

});

require('../ComponentRegistry').defineValue('widget.GoTo', GoToPanel);

module.exports = GoToPanel;
