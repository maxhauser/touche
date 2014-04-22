
var Dispatcher = require('./AppDispatcher');

var store = {};
var connected = false;

Dispatcher.on('global.connected', function() {
	connected = true;
	store = {};
});
Dispatcher.on('global.disconnected', function() { connected = false; });

var Session = {
	isConnected: function() {
		return connected;
	},

	get: function(key) {
		return store[key];
	},

	set: function(key, value) {
		store[key] = value;
	}
};

module.exports = Session;
