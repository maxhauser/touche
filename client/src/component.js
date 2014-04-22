var compose = require('./compose');
var advice = require('./advice');

function define() {
	var Component = function() {
		if (typeof this.initialize === 'function')
			this.initialize.apply(this, arguments);
	};

	var mixins = [advice.withAdvice];
	for (var i=0,l=arguments.length;i<l;i++)
		mixins.push(arguments[i]);

	compose.mixin(Component.prototype, mixins);

	return Component;
}

module.exports = { define: define };
