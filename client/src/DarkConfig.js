require('topcoat/css/topcoat-desktop-dark.css');
require('../html/base.css');
require('../html/dark.css');

var env = require('./Environment');
env.color = '#c6c8c8';
env.bgcolor = '#222222';

require('./widgets/CommandInput');
require('./widgets/ContentPanel');
require('./widgets/LoginPanel');
require('./widgets/StatusPanel');
require('./widgets/CastPanel');
require('./widgets/VersionDisplay');
require('./widgets/CreaturesPanel');
require('./widgets/Mapper');
require('./widgets/Panel');
require('./widgets/GoTo');

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

if (DEBUG || /[\?&]dev=true/.test(location.href)) {
	cns.push({
		direction: 'vertical',
		children: ['CastPanel', 'CreaturesPanel', 'GoTo']
	});
}

cns.push({
	direction: 'vertical',
	children: ['LoginPanel', 'StatusPanel', 'Mapper', 'VersionDisplay']
});

var config = {
	plugins: ['scripting', 'automapper'],
	ui: {
		style: {
			width: '100%',
			height: '100%'
		},
		children: cns
	}
};

module.exports = config;