var prefix = 'touche:';

var AppState = {
	get: function(key) {
		var value = localStorage.getItem(prefix + key);
		if (value)
			return JSON.parse(value);
	},
	set: function(key, value) {
		localStorage.setItem(prefix + key, JSON.stringify(value));
	}
};

module.exports = AppState;
