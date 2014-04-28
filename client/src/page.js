/**@jsx React.DOM*/
/*global EventSource:false*/
var React = require('react');
var _ = require('lodash');

var CommandInput = require('./widgets/CommandInput');
var ContentPanel = require('./widgets/ContentPanel');
var LoginPanel = require('./widgets/LoginPanel');
var StatusPanel = require('./widgets/StatusPanel');
var CastPanel = require('./widgets/CastPanel');
var VersionDisplay = require('./widgets/VersionDisplay');
var CreaturesPanel = require('./widgets/CreaturesPanel');
var Mapper = require('./widgets/Mapper');
var Panel = require('./widgets/Panel');
var Alertify = require('./alertify');

var env = require('./Environment');

require('./eventsource');

var Component = require('./component');

var AppDispatcher = require('./AppDispatcher');

var Registry = require('./ComponentRegistry');

var query = (function query() {
    var q = window.location.search;
    var re = /[\?&]([^\=&]*)=?([^&]*)/g;
    var r = {};
    while(true) {
        var m = re.exec(q);
        if (!m)
            return r;
        var name = m[1];
        if (name)
            r[name] = m[2]||null;
    }
}());

function getConfig() {
    return query.theme === 'dark' ? require('./DarkConfig') : require('./LightConfig');
}

var requestqueue = [];
function queueRequest(url, data) {
    requestqueue.push({url:url, data: data});
    sendRequest();
}

function sendRequest() {
    if (requestqueue.length === 0)
        return;
    var d = requestqueue.shift();
    var request = new XMLHttpRequest();
    request.open('POST', d.url, true);
    request.send(d.data);
    request.onreadystatechange = function() {
        if (request.readyState === 4 && requestqueue.length !== 0)
            window.setTimeout(sendRequest, 10);
    };
}

var Page = React.createClass({
    getInitialState: function() {
        return {
            connected: false,
            config: getConfig()
        };
    },
    createParser: function() {
        var me = this;
        var trie = this.state.trie;
        var Parser = Component.define(
            require('./telnetparser'),
            require('./styleasttransformation'),
            function() {
                this.emit = function(ast) { env.tokenPipeline.send(ast); };
                this.onBatchEnd = function() { env.tokenPipeline.send({type: 'flush'}); };
            });

        return new Parser();
    },
    createEventSource: function(parser) {
        var url = '/mud';
        var sid = query.sid;
        if (sid) {
            url += '?sid=' + sid;
            this.setState({sessionid: sid});
        }

        var source = new EventSource(url);
        source.addEventListener('open', function() {
            this.setState({connected: true, eventSource: source});
        }.bind(this));

        source.addEventListener('text', function(msg) {
            this.state.parser.feed(msg.data);
        }.bind(this), false);

        source.addEventListener('sessionid', function(msg) {
            this.setState({sessionid: msg.data});
            AppDispatcher.fire('global.connected', msg.data);
        }.bind(this), false);

        source.addEventListener('atcp', function(msg) {
            var comps = /^(\S+)\s*(.*)$/.exec(msg.data);
            if (!comps)
                return;
            AppDispatcher.fire('global.atcp', comps[1], comps[2]);
        });

        source.addEventListener('error', function(err) {
            //console.log('EventSource error:', err);
            source.close();
            AppDispatcher.fire('global.disconnected');
        }.bind(this), false);
    },
    sendCommand: function(type, data, silent) {
        if (type === 'cmd' && !silent) {
            AppDispatcher.fire('global.ast', {type: 'echo', text: data});
            AppDispatcher.fire('global.ast', {type: 'flush'});
        }

        var sessionid = this.state.sessionid;
        if (!sessionid || !this.state.connected) {
            return;
        }
        queueRequest('/mud/' + sessionid + '/' + type, data);

    },
    sendUsername: function() {
        var user = this.state.credentials.user;
        if (user) {
            _.delay(this.sendCommand, 100, 'cmd', user, true);
        }
    },
    sendPassword: function() {
        var pwd = this.state.credentials.pwd;
        if (pwd) {
            _.delay(this.sendCommand, 150, 'cmd', pwd, true);
        }
    },
    onBeforeUnload: function() {
        return "Es besteht eine aufrechte Verbindung zu Avalon.";
    },
    onConnected: function() {
        window.onbeforeunload = this.onBeforeUnload;
    },
    onDisconnect: function() {
        this.setState({connected: false, eventSource: null, lastSize: {width:0, height:0}});
        window.onbeforeunload = null;
    },
    onError: function(err) {
        Alertify.error(err.message);
    },
    componentDidMount: function() {
        this.setState({parser: this.createParser()});
        AppDispatcher.on('global.sendUsername', this.sendUsername);
        AppDispatcher.on('global.sendPassword', this.sendPassword);
        AppDispatcher.on('global.send', this.sendCommand);
        AppDispatcher.on('global.disconnected', this.onDisconnect);
        AppDispatcher.on('global.connected', this.onConnected);

        AppDispatcher.on('global.connect', this.connect);
        AppDispatcher.on('global.disconnect', this.disconnect);
        AppDispatcher.on('error', this.onError);

        this.state.config.plugins.forEach(function(plugin) { Registry.require('plugins.' + plugin); });
    },
    componentWillUnmount: function() {
        AppDispatcher.off('global.sendUsername', this.sendUsername);
        AppDispatcher.off('global.sendPassword', this.sendPassword);
        AppDispatcher.off('global.send', this.sendCommand);
        AppDispatcher.off('global.disconnected', this.onDisconnect);
        AppDispatcher.off('global.connected', this.onConnected);
        AppDispatcher.off('error', this.onError);

        AppDispatcher.off('global.connect', this.connect);
        AppDispatcher.off('global.disconnect', this.disconnect);
    },
    connect: function(user, pwd) {
        if (this.state.connected)
            return;
            this.state.parser.emit({type: 'clear-to-end'});
            this.setState({credentials: {user: user, pwd: pwd}});
            this.createEventSource();
    },
    disconnect: function() {
            this.state.eventSource.close();
            AppDispatcher.fire('global.disconnected');
            AppDispatcher.fire('global.ast', {type: 'newline'});
            AppDispatcher.fire('global.ast', {type: 'echo', text: 'Die Verbindung wurde getrennt.'});
            AppDispatcher.fire('global.ast', {type: 'flush'});
    },
    renderWidget: function(config) {
        if ('string' === typeof config)
            return Registry.require('widget.' + config)();

        var name = config.widget || 'Panel';
        var widget = Registry.require('widget.' + name);

        var children = (config.children || []).map(this.renderWidget);
        var attribs = {};
        _.forEach(config, function(value, key) {
            if (key !== 'widget' && key !== 'children')
                attribs[key] = value;
        });

        return widget(attribs, children);
    },
    render: function() {
        var uiconfig = _.clone(this.state.config.ui);
        uiconfig.className = (uiconfig.className || '') + ' ' + (this.state.connected?'connected':'disconnected');
        return this.renderWidget(uiconfig);
    }
});


module.exports = Page;