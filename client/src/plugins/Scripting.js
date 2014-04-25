/*global CoffeeScript:false, unescape:false*/

var env = require('../Environment');
env.scriptMarker = env.scriptMarker || '$';

require('script!coffee-script/extras/coffee-script');

var Api = require('../Api');

var compile = CoffeeScript.compile;

if ((typeof btoa !== "undefined" && btoa !== null) && (typeof JSON !== "undefined" && JSON !== null) && (typeof unescape !== "undefined" && unescape !== null) && (typeof encodeURIComponent !== "undefined" && encodeURIComponent !== null)) {
    compile = function(code, options) {
        options.sourceMap = true;
        options.inline = true;
        var r = CoffeeScript.compile(code, options);
        return "" + r.js + "\n//# sourceMappingURL=data:application/json;base64," + (btoa(unescape(encodeURIComponent(r.v3SourceMap)))) + "\n//# sourceURL=coffeescript";
    };
}

var evalix = 1;
function evalCoffee(code, context) {
    /* jshint ignore:start */
    var src = compile(code, {bare: true, sourceFiles: ['eval ' + evalix++], shiftLine: true});
    new Function('api', src).call(context, context);
    /* jshint ignore:end */
}

var ch = env.commandPipeline.add();

ch.receive(function(cmd) {
	if (cmd.type !== 'cmd' || cmd.value.length === 0 || cmd.value[0] !== env.scriptMarker)
		return ch.send(cmd);

	var script = cmd.value.substr(1);
	evalCoffee(script, Api);
});
