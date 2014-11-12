var React = require('react');
var _ = require('lodash');

var MyWorker = require('worker!./worker');
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

//window.ReactDefaultPerf = require('react/lib/ReactDefaultPerf');

var env = require('./Environment');

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
            window.setTimeout(sendRequest, 50);
    };
}

var Page = React.createClass({
    getInitialState: function() {
        return {
            connected: false,
            config: getConfig()
        };
    },
    shouldComponentUpdate: function(nextProps, nextState) {
        return this.state.connected !== nextState.connected;
    },
    createEventSource: function() {
        var worker = new MyWorker();
        worker.onmessage = this.handleWorkerMessage;
        worker.postMessage({type: 'connect'});
        this.worker = worker;
    },
    handleWorkerMessage: function(e) {
        var data = e.data.data;
        switch(e.data.type) {
            case 'connected':
                this.setState({connected: true});
                break;

            case 'ast':
                env.tokenPipeline.send(data);
                break;

            case 'atcp':
                AppDispatcher.fire('atcp', data[0], data[1]);
                break;

            case 'mxp':
                AppDispatcher.fire('mxp', data);
                break;

            case 'error':
                AppDispatcher.fire('disconnected');
                break;

            case 'sessionid':
                this.setState({sessionid: data});
                AppDispatcher.fire('connected', data);
                break;
        }

    },
    sendCommand: function(type, data, silent) {
        if (type === 'cmd' && !silent) {
            AppDispatcher.fire('ast', {type: 'echo', text: data});
        }

        var sessionid = this.state.sessionid;
        if (!sessionid || !this.state.connected) {
            return;
        }
        queueRequest('mud/' + sessionid + '/' + type, data);

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
        this.sendCommand('mxp', '<reported color="' + env.color + '" + backcolor="' + env.bgcolor + '">');
        this.sendCommand('atcp', 'ava_set_noinband_prompt 1');
        this.sendCommand('atcp', 'ava_set_noinband_tpwarnung 1');
    },
    onDisconnect: function() {
        this.setState({connected: false, eventSource: null, lastSize: {width:0, height:0}});
        window.onbeforeunload = null;
        Alertify.error('Die Verbindung wurde getrennt.');
    },
    onError: function(err) {
        Alertify.error(err.message);
    },
    onAtcp: function(name, value) {
        if (name === 'Avalon.Prompt') {
            AppDispatcher.fire('ast', { type: 'mxp-open-element', name: 'hr'});
            AppDispatcher.fire('ast', { type: 'flush' });
        }
    },
    componentDidMount: function() {
        AppDispatcher.on('sendUsername', this.sendUsername);
        AppDispatcher.on('sendPassword', this.sendPassword);
        AppDispatcher.on('send', this.sendCommand);
        AppDispatcher.on('disconnected', this.onDisconnect);
        AppDispatcher.on('connected', this.onConnected);
        AppDispatcher.on('atcp', this.onAtcp);

        AppDispatcher.on('connect', this.connect);
        AppDispatcher.on('disconnect', this.disconnect);
        AppDispatcher.on('error', this.onError);

        this.state.config.plugins.forEach(function(plugin) { Registry.require('plugins.' + plugin); });
    },
    componentWillUnmount: function() {
        AppDispatcher.off('sendUsername', this.sendUsername);
        AppDispatcher.off('sendPassword', this.sendPassword);
        AppDispatcher.off('send', this.sendCommand);
        AppDispatcher.off('disconnected', this.onDisconnect);
        AppDispatcher.off('connected', this.onConnected);
        AppDispatcher.off('error', this.onError);
        AppDispatcher.off('atcp', this.onAtcp);

        AppDispatcher.off('connect', this.connect);
        AppDispatcher.off('disconnect', this.disconnect);
    },
    connect: function(user, pwd) {
        if (this.state.connected)
            return;
        this.setState({credentials: {user: user, pwd: pwd}});
        this.createEventSource();
        this.worker.postMessage({type: 'clear-to-end'});
    },
    disconnect: function() {
        if (this.worker)
            this.worker.postMessage('disconnect');
        AppDispatcher.fire('disconnected');
    },
    renderWidget: function(config) {
        var content, name;
        var attribs = {};

        if ('string' === typeof config) {
            name = config;
        } else {
            name = config.widget || 'Panel';
            content = (config.children || []).map(this.renderWidget, this);
            _.forEach(config, function(value, key) {
                if (key !== 'widget' && key !== 'children')
                    attribs[key] = value;
            });
        }

        if (!attribs.key) {
            this.ids[name] = (this.ids[name] || 0) + 1;
            attribs.key = name + this.ids[name];
        }

        var widget = Registry.require('widget.' + name);
        attribs.children = content;
        return React.createElement(widget, attribs);
    },
    render: function() {
        this.ids = {};
        var uiconfig = _.clone(this.state.config.ui);
        uiconfig.className = (uiconfig.className || '') + ' ' + (this.state.connected?'connected':'disconnected');
        return this.renderWidget(uiconfig);
    }
});


module.exports = Page;
