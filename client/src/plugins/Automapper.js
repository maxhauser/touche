var env = require('../Environment');
var roomdb = require('../roomdb');
var Api = require('../Api');
var Alertify = require('../alertify');

var lastroomid, lastdirection;

var directions = {
	'n':'n', 'nord':'n', 'norden':'n',
	'no':'no', 'nordost':'no', 'nordosten':'no', 'ne':'no',
	'o':'o', 'ost':'o', 'osten':'o', 'e':'o',
	'so':'so', 'suedost':'so', 'suedosten':'so', 'se':'so',
	's':'s', 'sued':'s', 'sueden':'s',
	'sw':'sw', 'suedwest':'sw', 'suedwesten':'sw',
	'w':'w', 'west':'w', 'westen':'w',
	'nw':'nw', 'nordwest':'nw', 'nordwesten':'nw',
	'r':'r', 'runter':'r',
	'h':'h', 'hoch':'h'
};
var opposite = {
	'n':'s',
	'no':'sw',
	'o':'w',
	'so':'nw',
	's':'n',
	'sw':'no',
	'w':'o',
	'nw':'so',
	'h':'r',
	'r':'h'
};
var mapper = false;
var duplex = true;

Api.fn.automapper = function(on, dup) {
	mapper = !!on;
	duplex = !!dup;

	if (mapper)
		Alertify.log('Automapper ist aktiviert.');
	else
		Alertify.log('Automapper ist deaktiviert.');
};

env.on('send', function(type, text) {
	if (type !== 'cmd')
		return;
	var dir = text.trim().toLowerCase();
	lastdirection = directions[dir];
	if (!lastdirection)
		lastdirection = dir;
});

env.on('room.changed', function() {
	var current = roomdb.current();
	var currentId = current && current.id;
	if (lastdirection && currentId && lastroomid) {
		var exits = {};
		exits[lastdirection] = currentId;
		if (mapper) {
			roomdb.update(lastroomid, {exits: exits});
			if (duplex) {
				var op = opposite[lastdirection];
				if (op) {
					var oe = {};
					oe[op] = lastroomid;
					roomdb.update(currentId, {exits: oe});
				}
			}
			env.fire('room.updated');
		}
	}
	lastdirection = null;
	lastroomid = currentId;
});
