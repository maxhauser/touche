/* jshint worker:true */

var Connection = require('./Connection');
var connection = new Connection();

function handleMessage(event) {
	var data = event.data;
	switch(data.type) {
		case 'connect':
			connection.connect();
			break;
		case 'clear-to-end':
			connection.clearScreen();
			break;
		case 'disconnect':
			self.close();
			break;
	}
}

self.addEventListener('message', handleMessage);
