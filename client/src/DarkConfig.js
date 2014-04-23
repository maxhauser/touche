require('topcoat/css/topcoat-desktop-dark.css');
require('../html/base.css');
require('../html/dark.css');

require('./widgets/CommandInput');
require('./widgets/ContentPanel');
require('./widgets/LoginPanel');
require('./widgets/StatusPanel');
require('./widgets/CastPanel');
require('./widgets/VersionDisplay');
require('./widgets/CreaturesPanel');
require('./widgets/Mapper');
require('./widgets/Panel');

var Registry = require('./ComponentRegistry');

Registry.define('plugins.scripting', function() {
	require.ensure(['./plugins/Scripting'], function(require) {
		require('./plugins/Scripting');
	});
});

Registry.define('plugins.automapper', function() {
	require('./plugins/Automapper');
});

var cns = [{
	direction: 'vertical',
	style: {
		width: '100%',
		height: '100%'
	},
	children: [{
		widget: 'ContentPanel',
		mainContent: true,
		/*style: {'line-height': 10, 'font-size': 10}*/
	}, 'CommandInput']
}];

if (DEBUG) {
	cns.push({
		direction: 'vertical',
		children: ['Mapper', 'CastPanel', 'CreaturesPanel']
	});
}

cns.push({
	direction: 'vertical',
	children: ['LoginPanel', 'StatusPanel', 'VersionDisplay']
});

var config = {
	plugins: [],
	ui: {
		style: {
			width: '100%',
			height: '100%'
		},
		children: cns
	}
};

if (DEBUG) {
	config.plugins.push('scripting');
}

module.exports = config;