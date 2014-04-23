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
        this.setState({state: 'connected'});
    },
    onDisconnected: function() {
        this.setState({state: 'disconnected'});
    },
    componentDidMount: function() {
        AppDispatcher.on('global.connected', this.onConnected); 
        AppDispatcher.on('global.disconnected', this.onDisconnected); 
    },
    componentWillUnmount: function() {
        AppDispatcher.off('global.connected', this.onConnected); 
        AppDispatcher.off('global.disconnected', this.onDisconnected); 
    },
    click: function(e) {
        e.preventDefault();

        AppDispatcher.fire('global.inputExpected');
        if (this.state.state === 'connected')
            AppDispatcher.fire('global.disconnect');
        else {
            AppDispatcher.fire('global.connect', this.refs.user.getDOMNode().value, this.refs.pwd.getDOMNode().value);
            this.setState({state: 'connecting'});
        }
    },
    render: function() {
        var title;
        if (this.state.state !== 'connected') {
            title = (<div className="connection-title">
                        <span className="avalon-text">Avalon</span><br/>
                        <small>Benutzername und Passwort sind optional.</small>
                     </div>);
        }
        return (<Widget caption="Verbindung" className={"login-widget " + this.state.state}>
            {title}
            <form action="index.html" method="POST" onSubmit={this.click} autoComplete="on">
                {(this.state.state !== 'connected' || !env.lightUI)?[
                <input key="u" name="username" ref="user" type="text" className="topcoat-text-input--large" placeholder="Benutzername"/>,<br key="b1"/>,
                <input key="p" name="pwd" ref="pwd" type="password" className="topcoat-text-input--large" placeholder="Passwort"/>,<br key="b2"/>
                ]:[]}
                <input key={this.state.state}
                    type="submit" className={"topcoat-button--large" + (this.state.state === 'connected'?"":"--cta")}
                        onClick={this.click} value={this.state.state === 'connected'?"Trennen":"Verbinden"}/><br/>
            </form>
            </Widget>);
    }
});

require('../ComponentRegistry').defineValue('widget.LoginPanel', LoginPanel);
module.exports = LoginPanel;
