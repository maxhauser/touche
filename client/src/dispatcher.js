var Dispatcher = function() {

    this.events = {};

    this.fire = function(eventName) {
        var handlers = this.events[eventName];
        if (!handlers)
            return;

        var args = new Array(arguments.length - 1);
        for (var i = 1, l = arguments.length; i < l; i++) {
            args[i - 1] = arguments[i];
        }

        for (i = 0, l = handlers.length; i < l; i++) {
            var handler = handlers[i];
            try {
                handler.apply(this, args);
            } catch(e) {
                console.log('ERROR', e);
            }
        }
    };

    this.on = function(eventName, handler, once) {
        var handlers = this.events[eventName];
        if (!handlers) {
            handlers = [];
            this.events[eventName] = handlers;
        }
        if (once) {
            var me = this;
            var origHandler = handler;
            handler = function() {
                me.off(eventName, handler);
                origHandler();
            };
        }
        handlers.push(handler);
    };

    this.off = function(eventName, handler) {
        var handlers = this.events[eventName];
        if (!handlers)
            return;

        for (var i = 0, l = handlers.length; i < l; i++) {
            var curr = handlers[i];
            if (curr === handler) {
                handlers.splice(i, 1);
                return;
            }
        }
    };

    this.un = this.off;
};

module.exports = Dispatcher;