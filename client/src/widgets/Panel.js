/** @jsx React.DOM */

var React = require('react');

var Panel = React.createClass({
    getDefaultProps: function() {
        return { direction: 'horizontal' };
    },
    render: function() {
        var els;
        var children = this.props.children;
        if (this.props.direction === 'horizontal') {
            els = <div className="ct-row">{children}</div>;
        } else {
            els = children.map(child => <div key={child.props.key} className="ct-row">{child}</div>);
        }

        var ct = this.transferPropsTo(<div className={"container " + this.props.direction}>{els}</div>);
        return this.transferPropsTo(<div className="ct-wrap">{ct}</div>);
    }
});

require('../ComponentRegistry').defineValue('widget.Panel', Panel);
module.exports = Panel;
