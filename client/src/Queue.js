/**@jsx React.DOM */
var EventEmitter = require('events').EventEmitter;

function Queue(name) {
    this.name = name;
    this.items = [];
    this.running = false;
}

Object.assign(Queue.prototype, EventEmitter.prototype);

Queue.prototype.unshift = function(item) {
    this.items.unshift(item);
};

Queue.prototype.push = function(item) {
    this.items.push(item);
};

Queue.prototype.insertAt = function(index, item) {
    this.items.splice(index, 0, item);
};

Queue.prototype.run = function() {
    if (this.running || this.items.length === 0)
        return;

    this.running = true;

    var fn = function() {
        this.runningItem = null;

        if (!this.running)
            return;

        if (this.items.length === 0) {
            this.emit('empty');
            if (this.items.length === 0)
                return;
        }

        var item = this.items.shift();
        this.runningItem = item;
        item.run(fn, this);
    }.bind(this);

    fn();
};

Queue.prototype.clear = function() {
    this.stop();
    this.items = [];
};

Queue.prototype.stop = function() {
    if (this.runningItem && this.runningItem.abort)
        this.runningItem.abort();

    this.running = false;
};

module.exports = Queue;
