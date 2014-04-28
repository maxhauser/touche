var env = require('../Environment');
var roomdb = require('../roomdb');
var Api = require('../Api');

var lastroomid;
var lastdirection;
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
var mapper = false;

Api.automap = function(on) {
	mapper = !!on;
};

env.on('global.send', function(type, text) {
	if (type !== 'cmd')
		return;
	lastdirection = directions[text.trim().toLowerCase()];
});

env.on('room.changed', function() {
	var currentId = roomdb.current().id;
	if (lastdirection && currentId && lastroomid) {
		var exits = {};
		exits[lastdirection] = currentId;
		if (mapper)
			roomdb.update(lastroomid, {exits: exits});
	}
	lastroomid = currentId;
});
