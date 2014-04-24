require('topcoat/css/topcoat-desktop-light.css');
require('../html/base.css');
require('../html/light.css');

var env = require('./Environment');
env.lightUI = true;

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

var cns = [
{
	direction: 'vertical',
	children: ['LoginPanel']
},
{
	direction: 'vertical',
	style: {
		width: '740px',
		height: '100%'
	},
	'aria-role': 'main',
	children: [{
		widget: 'ContentPanel',
		mainContent: true,
		/*style: {'line-height': 10, 'font-size': 10}*/
	}, 'CommandInput']
},
{
	direction: 'vertical',
	children: ['StatusPanel', 'VersionDisplay']
}
];
/*

if (DEBUG) {
	cns.push({
		direction: 'vertical',
		children: ['Mapper', 'CastPanel', 'CreaturesPanel']
	});
}
*/


var config = {
	plugins: [],
	ui: {
		style: {
			//width: '100%',
			height: '100%'
		},
		children: cns
	}
};

if (DEBUG) {
	config.plugins.push('scripting');
}

module.exports = config;