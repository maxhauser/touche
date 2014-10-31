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
            els = children.map(function(child) {return <div key={child.key} className="ct-row">{child}</div>; });
        }

        var ct = (<div {...this.props} className={"container " + this.props.direction + (this.props.className?" " + this.props.className:"")}>{els}</div>);
        return (<div {...this.props} className={"ct-wrap" + (this.props.className?" " + this.props.className:"")}>{ct}</div>);
    }
});

require('../ComponentRegistry').defineValue('widget.Panel', Panel);
module.exports = Panel;
