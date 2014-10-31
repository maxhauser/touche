/**@jsx React.DOM*/
var React = require('react');
var env = require('../Environment');

/*
var ReactCSSTransitionGroup = React.addons.CSSTransitionGroup;

var WidgetChrome = React.createClass({
		render: function() {
			return this.transferPropsTo(<div className="widget">{this.props.children}</div>);
		}
});
*/

var Widget = React.createClass({
	render: function() {
		var children = this.props.children;
		var hasChildren = children && (children.length !== 0 || 'undefined' === typeof children.length);

		return (<div {...this.props} className={"widget " + (this.props.className||"")}>
				<small>{this.props.caption}</small>
				<div className="topcoat-text-input--large widget-body">{hasChildren?children:this.props.emptytext}</div>
			</div>);
/*
		var els = [];
		if (!env.lightUI || hasChildren) {
			//els.push(this.transferPropsTo(
			//<div className="widget" key="widget">
			els.push(
				<small>{this.props.caption}</small>,
				<div className="topcoat-text-input--large widget-body">{hasChildren?children:this.props.emptytext}</div>
				);
			//</div>));
		}

		return this.transferPropsTo(<ReactCSSTransitionGroup transitionName="widget"
			transitionEnter={!!env.lightUI} transitionLeave={!!env.lightUI} component={WidgetChrome}>{els}</ReactCSSTransitionGroup>);
*/
	}
});

module.exports = Widget;