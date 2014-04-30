/*global CoffeeScript:false, unescape:false*/

var env = require('../Environment');
env.scriptMarker = env.scriptMarker || '@';
var Alertify = require('../alertify');
var _ = require('lodash');

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
    return new Function('api', 'ein', 'aus', /^\s*var\s+/.test(src)?src:('return ' + src)).call(context, context, true, false);
    /* jshint ignore:end */
}

var ch = env.commandPipeline.add();

ch.receive(function(cmd) {
	if (cmd.type !== 'cmd' || cmd.value.length === 0 || cmd.value[0] !== env.scriptMarker)
		return ch.send(cmd);

    var m = /^@(\w+)/.exec(cmd.value);
    var skip = 1;
    if (m) {
        var f = m[1];
        if (Api[f]) {
            skip = 0;
        }
    }

	var script = cmd.value.substr(skip);
	var result = evalCoffee(script, Api);
    if (result) {
        Alertify.log("<pre>" + pretty(result).trim() + "</pre>");
    }
});

function pretty(o, i) {
    i = i || 0;
    if('object' === typeof o) {
        var s = "\n";
        _.each(o, function(v, k) {
            s += ident(i, k + ': ' + pretty(v, i + 2));
        });
        return s;
    }
    return o + "\n";
}

function ident(n, text) {
    if (!n)
        return text;
    return Array(n).join(' ') + text;
}
