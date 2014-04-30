var Pipeline = require('./Pipeline');
var Dispatcher = require('./AppDispatcher');
var Registry = require('./ComponentRegistry');

var env = {
	packetPatch: 0,
	splitChar: ';',
	walkSpeed: 300,
	tokenPipeline: new Pipeline(),
	linePipeline: new Pipeline(),
	commandPipeline: new Pipeline(),
	on: Dispatcher.on.bind(Dispatcher),
	off: Dispatcher.off.bind(Dispatcher),
	fire: Dispatcher.fire.bind(Dispatcher)
};

env.tokenPipeline.receive(function(ast) { Dispatcher.fire('global.ast', ast); });

var currentLine = [];
var patchTimeout = null;

var ch = env.tokenPipeline.add();
ch.receive(function(token) {
	currentLine.push(token);

	if (token.type === 'flush' && env.packetPatch) {
		patchTimeout = window.setTimeout(function() {
			if (currentLine.length !== 0) {
				env.linePipeline.send(currentLine);
				currentLine = [];
			}
			patchTimeout = null;
		}, env.packetPatch);
	} else if (token.type === 'newline' || token.type === 'flush') {
		if (patchTimeout !== null)
			window.clearTimeout(patchTimeout);

		env.linePipeline.send(currentLine);
		currentLine = [];
	}
});

env.linePipeline.receive(function(line) {
	line.forEach(function(token) {
		ch.send(token);
	});
});

env.commandPipeline.receive(function(cmd) { Dispatcher.fire('global.send', cmd.type, cmd.value); });

var inch = env.commandPipeline.add();
inch.receive(function(cmd) {
	if (cmd.type !== 'cmd')
		return inch.send(cmd);

	var m = /\$\$enable\s+(.*)/.exec(cmd.value);
	if (m) {
		var plugin = m[1];
		Dispatcher.fire('global.ast', {type:'text', text:'SYSTEM: enabling plugin ' + plugin});
		Dispatcher.fire('global.ast', {type:'newline'});
		Dispatcher.fire('global.ast', {type:'flush'});
		Registry.require('plugins.' + plugin);
		return;
	}

	if (cmd.value.length === 0 || /^\s*\W/.test(cmd.value))
		return inch.send(cmd);

	cmd.value.split(env.splitChar).forEach(function(val) { inch.send({type: 'cmd', value: val}); });
});

module.exports = env;