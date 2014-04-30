var _ = require('lodash');

var Pathfinder = function(db) {
	this.db = db;
};

function addExit(visited, rooms, db, room) {
	return function(exit, dir) {
		exit = exit.room || exit;
		var dist = room.dist + db.getDist(room, exit);

		var visit = visited[exit];
		if (visit) {
			if(visit.dist > dist) {
				delete visited[exit];
				rooms[exit] = {id: exit, dist: dist, pre: room, dir: dir};
			}
		} else {
			rooms[exit] = {id: exit, dist: dist, pre: room, dir: dir};
		}
	};
}

Pathfinder.prototype.getDistanceMap = function(source) {
	var db = this.db;

	var rooms = {};
	rooms[source] = {id: source, dist: 0};

	var visited = {};
	var r = {};
	while(true) {
		var room = _.min(rooms, 'dist');
		if(room === Infinity) {
			return visited;
		}

		visited[room.id] = room;
		delete rooms[room.id];

		var exits = db.getExits(room.id);
		_.forEach(exits, addExit(visited, rooms, db, room));
	}
};

Pathfinder.prototype.findPath = function(source, dest, shortest) {
	var db = this.db;

	var rooms = {};
	rooms[source] = {id: source, dist: 0};

	var visited = {};
	while(true) {
		var room = _.min(rooms, 'dist');
		if(room === Infinity) {
			return;
		}

		if (room.id === dest) {
			var r = [{room: room.id}];
			while(true) {
				r.unshift({room: room.pre.id, dir: room.dir});
				if (room.pre.id === source) {
					return r;
				}
				room = room.pre;
			}
		}

		visited[room.id] = room;
		delete rooms[room.id];

		var exits = db.getExits(room.id);
		_.forEach(exits, addExit(visited, rooms, db, room));
	}
};

module.exports = Pathfinder;