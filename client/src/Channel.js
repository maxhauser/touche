var Channel = function() {
	// either buffer or receivers is always empty
	// so actually only one array would be needed
	this.buffer = [];
	this.receivers = [];
};

Channel.prototype.send = function(data) {
	if (this.receivers.length === 0) {
		this.buffer.push(data);
	} else {
		var receiver = this.receivers.shift();
		var remove = receiver(data);
		if (!remove)
			this.receivers.push(receiver);
	}
};

Channel.prototype.receive = function(receiver) {
	if (this.buffer.length === 0)
		this.receivers.push(receiver);
	else
		receiver(this.buffer.shift());
};

Channel.prototype.split = function() {
	var sender = new Channel();
	if (this.receivers.length !== 0) {
		sender.receivers = this.receivers;
		this.receivers = [];
	}
	return sender;
};

Channel.prototype.join = function(receiver) {
	while (this.buffer.length !== 0) // empty sender buffer (as far as possible)
		receiver.send(this.buffer.shift());

	this.buffer = receiver.buffer;
	receiver.buffer = [];

	// receivers on this side are abandoned
	this.receivers = receiver.receivers;
	receiver.receivers = [];
};

module.exports = Channel;
