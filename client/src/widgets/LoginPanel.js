/**@jsx React.DOM*/
var React = require('react');
var Widget = require('./Widget');
var AppDispatcher = require('../AppDispatcher');
var Session = require('../Session');
var env = require('../Environment');

var LoginPanel = React.createClass({
    getInitialState: function() {
        return {state: Session.isConnected()?'connected':'disconnected'};
    },
    onConnected: function() {
        this.setState({state: 'connected'}, function() {
            AppDispatcher.fire('inputExpected');
        });
    },
    onDisconnected: function() {
        this.setState({state: 'disconnected'}, function() {
            var el = this.refs.user;
            if (el) {
                el.getDOMNode().focus();
            }
        });
    },
    componentDidMount: function() {
        AppDispatcher.on('connected', this.onConnected); 
        AppDispatcher.on('disconnected', this.onDisconnected); 

        var el = this.refs.user;
        if (el) {
            el.getDOMNode().focus();
        }
    },
    componentWillUnmount: function() {
        AppDispatcher.off('connected', this.onConnected); 
        AppDispatcher.off('disconnected', this.onDisconnected); 
    },
    handleConnect: function(e) {
        e.preventDefault();

        if (this.state.state === 'connected') {
            AppDispatcher.fire('disconnect');
        } else {
            AppDispatcher.fire('connect', this.refs.user.getDOMNode().value, this.refs.pwd.getDOMNode().value);
            this.setState({state: 'connecting'});
        }
    },
    handleDirectConnect: function(e) {
        e.preventDefault();

        if (this.state.state !== 'connected') {
            AppDispatcher.fire('connect');
            this.setState({state: 'connecting'});
        }
    },
    render: function() {
        var title;
        if (this.state.state !== 'connected') {
            title = (<div className="connection-title">
                        <h3 className="avalon-text">Avalon</h3>
                     </div>);
        }
        return (<Widget caption="Verbindung" className={"login-widget " + this.state.state}>
            {title}
                {(this.state.state !== 'connected' && env.lightUI)?[
                <form action="index.html" className="connection-form" method="POST" onSubmit={this.handleDirectConnect} autoComplete="on">
                <input key="new" type="submit" className="topcoat-button--large--cta" onClick={this.handleDirectConnect} value="sofort spielen"/>
                <div key="sep" className="seperator">
                    <div className="line"/>
                    <div className="text">
                        <small>oder</small>
                    </div>
                </div>
                </form>
                ]:null}
                <form action="index.html" className="connection-form" method="POST" onSubmit={this.handleConnect} autoComplete="on">
                {(this.state.state !== 'connected')?[
                <input key="u" name="username" title="Benutzername" ref="user" type="text" className="topcoat-text-input--large" placeholder="Benutzername"/>,<br key="b1"/>,
                <input key="p" name="pwd" title="Passwort" ref="pwd" type="password" className="topcoat-text-input--large" placeholder="Passwort"/>,<br key="b2"/>
                ]:null}
                <input key={this.state.state}
                    type="submit" className={"topcoat-button--large" + (this.state.state === 'connected'?"":"--cta")}
                        onClick={this.handleConnect} value={this.state.state === 'connected'?"trennen":"anmelden"}/>
            </form>
            </Widget>);
    }
});

require('../ComponentRegistry').defineValue('widget.LoginPanel', LoginPanel);
module.exports = LoginPanel;
