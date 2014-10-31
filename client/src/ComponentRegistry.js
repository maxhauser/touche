var ComponentRegistry = function() {
	this.require = this.require.bind(this);
	this.registrations = [];
};

ComponentRegistry.prototype.define = function(name, fn) {
	var existing = this.registrations[name];
	if ('undefined' !== typeof existing)
		throw new Error('Component with name "' + name + '" already registered.');

	//console.log('define', name);
	this.registrations[name] = {
		fn: fn,
		resolved: false,
		value: null
	};
};

ComponentRegistry.prototype.defineValue = function(name, value) {
	var existing = this.registrations[name];
	if ('undefined' !== typeof existing)
		throw new Error('Component with name "' + name + '" already registered.');

	//console.log('defineValue', name);
	this.registrations[name] = {
		resolved: true,
		value: value
	};
};

ComponentRegistry.prototype.require = function(name) {
	var registration = this.registrations[name];
	if ('undefined' === typeof registration)
		throw new Error('Component "' + name + "' is not defined.");
	if (!registration.resolved) {
		registration.value = registration.fn(this.require);
		registration.resolved = true;
	}
	return registration.value;
};

module.exports = new ComponentRegistry();
