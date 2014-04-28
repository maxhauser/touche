var AppDispatcher = require('./AppDispatcher');
var _ = require('lodash');
var AppState = require('./appstate');

AppDispatcher.on('global.atcp', onAtcp);
AppDispatcher.on('global.connected', onConnected);
AppDispatcher.on('global.disconnected', onDisconnected);
AppDispatcher.on("global.ast", onBatchComplete);

var statekey = 'map';
var rooms = AppState.get(statekey) || {};
var currentRoomId;

var save = _.throttle(function() { AppState.set(statekey, rooms); }, 30000, {trailing: true});

function updateRoom(roomId, data) {
	var room = rooms[roomId];
	if (!room) {
		room = {id: roomId};
		rooms[roomId] = room;
	}
	_.merge(room, data);
	save();
}

function updateCurrentRoom(data) {
	if (!currentRoomId)
		return;
	updateRoom(currentRoomId);
}

function onConnected() {
	AppDispatcher.fire("global.send", "atcp", "ava_set_mapper 1");
}

function onDisconnected() {
	currentRoomId = null;
	AppDispatcher.fire('room.changed');
}

var lastRoomId;
function onBatchComplete(ast) {
	if (ast.type !== 'flush')
		return;

	if (currentRoomId && lastRoomId !== currentRoomId) {
		lastRoomId = currentRoomId;
		AppDispatcher.fire('room.changed');
	}
}

function onAtcp(name, value) {
	switch (name) {
		case "Avalon.RoomID":
			var comps = value.split(' ');
			currentRoomId = comps[0];
			updateCurrentRoom({ area: comps[1] });
			break;

		case "Room.Brief":
			updateCurrentRoom({ brief: value });
			break;

		case "Avalon.Icon16":
			updateCurrentRoom({ icon: value || ' ' });
			break;

		case "Avalon.Exits":
			var exits = {};
			var ex = value.split(',');
			for (var i=0,l=ex.length;i<l;i++) {
				var m = /^([^=]+)=(.*)$/.exec(ex[i]);
				if (m)
					exits[m[1]] = m[2];
			}
			updateCurrentRoom({ exits: exits });
			break;

		case "Avalon.Site":
			updateCurrentRoom({ site: value });
			break;
	}
}

var RoomDb = {
	find: function(search) {
		var re = new RegExp(search, 'i');

		var room = _.find(rooms, function(room) {
			if(re.test(room.site))
				return true;
		});
		if (room)
			return room;

		return _.find(rooms, function(room) {
			if(re.test(room.brief))
				return true;
		});
	},
	get: function(id) {
		return rooms[id];
	},
	current: function() {
		if (!currentRoomId)
			return;
		return rooms[currentRoomId];
	},
	update: function(roomId, data) {
		updateRoom(roomId, data);
	},
	remove: function(roomId) {
		delete rooms[roomId];
		_.each(rooms, function(room) {
			_.each(room.exits, function(exit, key) {
				if (exit === roomId || exit.room === roomId)
					delete room.exits[key];
			});
		});
		if (roomId === currentRoomId) {
			currentRoomId = null;
			AppDispatcher.fire('room.changed');
		}
	}
};

module.exports = RoomDb;