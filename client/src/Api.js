var _ = require('lodash');
var Dispatcher = require('./AppDispatcher');
var env = require('./Environment');
var roomdb = require('./roomdb');
var Pathfinder = require('./Pathfinder');
var Alertify = require('./alertify');

var ApiClass = function(name, parent) {
	this.name = name;
	if (Object.defineProperty)
		Object.defineProperty(this, 'parent', { value: parent, enumerable: false });	
	else
		this.parent = parent;
	this.classes = {};
	this.state = {};
};

ApiClass.prototype.fn = ApiClass.prototype;

var Api = new ApiClass('global');

_.assign(Api.fn, {
	cls: function(name) {
		var cls = this.classes[name];
		if (!cls) {
			cls = new ApiClass(name, this);
			this.classes[name] = cls;
		}
		return cls;
	},

	destroy: function() {
		this.state = {};

		if (!this.parent)
			return;

		delete this.parent.classes[this.name];
	},

	enable: function() {
		this.disabled = false;
	},

	disable: function() {
		this.disabled = true;
	},

	each: function(name, fn) {
		if (this.disabled)
			return;

		_.each(this.state[name], fn);
		_.each(this.classes, function(cls) {
			cls.each(name, fn);
		});
	}
});

function getText(line) {
	var text = "";
	line.forEach(function(ast) {
		if (ast.type === 'text')
			text += ast.text;
	});
	return text;
}

var mych = env.linePipeline.add();
mych.receive(function(line) {
	var text = getText(line);

	var gag = false;
	Api.each('gags', function(gag) {
		if (gag.test(text))
			gag = true;
	});

	if (gag) {
		console.log('GAGGED', text);
		return;
	}

	mych.send(line);

	Api.each('actions', function(action) {
		var match = action.regex.exec(text);
		if (match)
			action.handler.apply(undefined, match);
	});
});

_.assign(Api.fn, {
	env: env,
	on: function(eventName, handler) {
		Dispatcher.on(eventName, handler);
	},
	un: function(eventName, handler) {
		Dispatcher.un(eventName, handler);
	},
	send: function(cmd) {
		Dispatcher.fire('send', 'cmd', cmd);
	},
	atcp: function(text) {
		Dispatcher.fire('send', 'atcp', text);
	},
	mxp: function(markup) {
		Dispatcher.fire('send', 'mxp', markup); 
	},
	echo: function(text) {
		Dispatcher.fire('ast', {type: 'echo', text: text});
	},
	ticker: function(name, seconds, handler) {
		var interval = window.setInterval(handler, seconds * 1000);
		var tickers = this.state.tickers || (this.state.tickers = {});
		var ticker = tickers[name];
		if (ticker) {
			window.clearInterval(ticker);
		}
		tickers[name] = interval;
	},
	unticker: function(name) {
		var tickers = this.state.tickers || (this.state.tickers = {});
		var ticker = tickers[name];
		if (ticker) {
			delete tickers[name];
			window.clearInterval(ticker);
		}
	},
	action: function(search, commands, priority) {
		var actions = this.state.actions || (this.state.actions = {});
		var re = (search instanceof RegExp)?search:new RegExp(search, 'i');
		actions[search.source||search] = { handler: commands, priority: priority, regex: re };
	},
	unaction: function(search){
		var actions = this.state.actions || (this.state.actions = {});
		delete actions[search.source||search];
	},
	/*
	alias: function(name, command) {
		aliases[name] = command;
	},
	unalias: function(name) {
		delete aliases[name];
	},
	*/
	delay: function(name, seconds, handler) {
		var delays = this.state.delays || (this.state.delays = {});
		if ('function' === typeof seconds) {
			handler = seconds;
			seconds = name;
			name = undefined;
		}

		var timeout = window.setTimeout(handler, seconds * 1000);
		if (name) {
			var delay = delays[name];
			if (delay)
				window.clearTimeout(delay);
			delays[name] = timeout;
		}
	},
	undelay: function(name) {
		var delays = this.state.delays || (this.state.delays = {});
		var delay = delays[name];
		if (delay) {
			delete delays[name];
			window.clearTimeout(delay);
		}
	},
	/*
	macro: function(keysequence, commands) {
		macros[keysequence] = commands;
	},
	unmacro: function(keysequence) {
		delete macros[keysequence];
	},
	*/
	gag: function(search) {
		var gags = this.state.gags || (this.state.gags = {});
		gags[search] = new RegExp(search);
	},
	ungag: function(search) {
		var gags = this.state.gags || (this.state.gags = {});
		delete gags[search];
	},
	/*
	substitute: function(text, newtext) {
		substitutes[text] = newtext;
	},
	unsubstitute: function(text) {
		delete substitutes[text];
	},
	*/
	map: {
		setIcon: function(icon) {
			roomdb.current().icon = icon;
			Dispatcher.fire('room.changed');
		},
		find: function(dest) {
			return roomdb.find(dest);
		},
		tag: function(tag) {
			roomdb.update(roomdb.current().id, {tag: tag});
		},
		pathTo: function(dest) {
			var target = roomdb.find(dest);
			if(!target)
				throw new Error('Finde "' + dest + '" nicht.');

			var finder = new Pathfinder({
				getExits: function(id) { 
					var room = roomdb.get(id);
					if (room)
						return room.exits; 
				},
				getDist: function() { return 1; }
			});

			return finder.findPath(roomdb.current().id, target.id);
		},
		walkTo: function(path) {
			if (_.isString(path)) {
				var origPath = path;
				path = Api.map.pathTo(path);
				if (!path)
					throw new Error('Kein Weg nach ' + origPath + '.');
			}
			dothewalk(path);
		},
		current: function() {
			return roomdb.current();
		},
		get: function(id) {
			return roomdb.get(id);
		},
		remove: function() {
			roomdb.remove(roomdb.current().id);
		}
	}
});

function dothewalk(path) {
	var current = roomdb.current();
	var cur = path.shift();
	if (current.id !== cur.room) {
		Alertify.error('Gehen abgebrochen: falscher Raum.');
		return;
	}

	if (path.length === 0) {
		Alertify.log('Am Ziel angekommen.');
		return;
	}

	var roomChanged, expired;
	_.delay(function() {
		if(roomChanged)
			dothewalk(path);
		else
			expired = true;
	}, env.walkSpeed);

	Dispatcher.on('room.changed', function() {
		if(expired)
			dothewalk(path);
		else
			roomChanged = true;
	}, true);
	
	Dispatcher.fire('send', 'cmd', cur.dir);
}

function notimplemented(name) {
	return function() {
		console.log(name + ' is not implemented');
	};
}

/*
[
	'event',
	'send',
	'echo',
	'ticker',
	'action',
	'alias',
	'action',
	'macro',
	'substitute',
	'delay',
	'gag',
	'redirect'
].forEach(function(fn) {
	if (!Api[fn])
		Api[fn] = notimplemented(fn);
});
*/

// aliases
Api.fn.act = Api.action;
Api.fn.unact = Api.unaction;

Api.fn.walk = Api.fn.map.walkto;
Api.fn.find = Api.fn.map.find;
Api.fn.gehe = Api.fn.map.walkto;

// trigger

// action (search -> command)
// ticker (execute commands every x seconds)
// alias
// macro (key -> command)
// event (session connect, enter/exit room, )
// substitute (replace text from mud)
// delay
// gag (string) removes any line that contains that string

/*
Api.on('line', function(line) {
	Api.write(line);
});
*/

module.exports = Api;