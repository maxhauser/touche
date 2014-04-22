
var Channel = require('./Channel');

var ChannelWrapper = function(sender, receiver) {
	this.sender = sender;
	this.receiver = receiver;
};

ChannelWrapper.prototype.send = function(data) {
	this.sender.send(data);
};

ChannelWrapper.prototype.receive = function(receiver) {
	this.receiver.receive(receiver);
};

var Pipeline = function() {
	var channel = new Channel();
	this.wrapper = new ChannelWrapper(channel, channel);
};

Pipeline.prototype.add = function() {
	var receiver = this.wrapper.receiver.split();
	var r = new ChannelWrapper(receiver, this.wrapper.receiver);
	this.wrapper.receiver = receiver;
	return r;
};

Pipeline.prototype.send = function(data) {
	try {
		this.wrapper.send(data);
	} catch(e) {
		console.log('ERROR', e);
	}
};

Pipeline.prototype.receive = function(receiver) {
	this.wrapper.receive(receiver);
};


/*

var Pipeline = function(defaultHandler) {
	this.defaultHandler = defaultHandler;
	this.handlers = [];
};

Pipeline.prototype.add = function(handler, priority) {
	var handlers = this.handlers;
	var item = {
		handler: handler,
		priority: priority || 0
	};
	this.methodChain = null;

	if (handlers.length === 0) {
		handlers.push(item);
		return;
	}

	for (var i = handlers.length - 1; i >= 0; i--) {
		var hdl = handlers[i];
		if (hdl.priority <= priority) {
			handlers.splice(i + 1, 0, item);
			return;
		}
	}

	handlers.unshift(item);
};

Pipeline.prototype.remove = function(handler) {
	var handlers = this.handlers;
	this.methodChain = null;
	for (var i = handlers.length - 1; i >= 0; i--) {
		if (handlers[i].handler === handler)
			handlers.splice(i, 1);
	}
};

Pipeline.prototype.send = function(data) {
	var chain = this.methodChain;
	if (!chain) {
		var handlers = this.handlers;
		var defaultHandler = this.defaultHandler;
		var ix = 0;
		var next = (function() {
			var hdl = handlers[ix++];
			if (!hdl)
				return defaultHandler;
			return function(data) {
				var args = new Array(arguments.length + 1);
				args[0] = next();
				for (var i = 0, l = arguments.length; i < l; i++)
					args[i + 1] = arguments[i];
				hdl.handler.apply(undefined, args);
			};
		});
		chain = next();
		this.methodChain = chain;
	}
	chain.apply(undefined, arguments);
};
*/

module.exports = Pipeline;