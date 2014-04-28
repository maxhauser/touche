
var Channel = require('./Channel');
var Dispatcher = require('./AppDispatcher');

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
		Dispatcher.fire('error', e);
	}
};

Pipeline.prototype.receive = function(receiver) {
	this.wrapper.receive(receiver);
};

module.exports = Pipeline;