/**@jsx React.DOM*/
var React = require('react');
var env = require('../Environment');

var ReactCSSTransitionGroup = React.addons.CSSTransitionGroup;

var Widget = React.createClass({
	render: function() {
		var children = this.props.children;
		var hasChildren = children && (children.length !== 0 || 'undefined' === typeof children.length);

		var els = [];
		if (!env.lightUI || hasChildren) {
			els.push(this.transferPropsTo(
			<div className="widget" key="widget">
				<small>{this.props.caption}</small>
				<div className="topcoat-text-input--large widget-body">{hasChildren?children:this.props.emptytext}</div>
			</div>));
		}

		return <ReactCSSTransitionGroup transitionName="widget"
			transitionEnter={!!env.lightUI} transitionLeave={!!env.lightUI}>{els}</ReactCSSTransitionGroup>;
	}
});

module.exports = Widget;