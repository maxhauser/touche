/* jshint worker:true */

var Component = require('./component');
var EventSource = require('./eventsource');

function Connection() {
	this.parser = this.createParser();
}

Connection.prototype.connect = function() {
	this.source = this.createEventSource();
};

Connection.prototype.clearScreen = function() {
	this.parser.emit({type: 'clear-to-end'});
};

Connection.prototype.createParser = function() {
    var me = this;
    var Parser = Component.define(
        require('./telnetparser'),
        require('./styleasttransformation'),
        function() {
            this.emit = function(ast) { self.postMessage({type: 'ast', data: ast}); };
            this.onBatchEnd = function() { self.postMessage({type: 'ast', data: {type: 'flush'}}); };
        });

    return new Parser();
};

Connection.prototype.createEventSource = function() {
    var url = 'mud';

    var source = new EventSource(url);
    source.addEventListener('open', function() {
    	self.postMessage({type: 'connected'});
    }.bind(this));

    source.addEventListener('text', function(msg) {
        this.parser.feed(msg.data);
    }.bind(this), false);

    source.addEventListener('sessionid', function(msg) {
        self.postMessage({type: 'sessionid', data: msg.data});
    }.bind(this), false);

    source.addEventListener('atcp', function(msg) {
        var comps = /^(\S+)\s*(.*)$/.exec(msg.data);
        if (!comps)
            return;
        comps.splice(0, 1);
        self.postMessage({type: 'atcp', data: comps});
    });

    source.addEventListener('mxp', function(msg) {
        self.postMessage({type: 'mxp', data: msg.data});
    });

    source.addEventListener('error', function(err) {
        self.postMessage({type: 'error'});
        source.close();
        self.close();
    }, false);

    this.source = source;
};

module.exports = Connection;
