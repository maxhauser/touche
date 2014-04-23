/**@jsx React.DOM */
var React = require('react');
var _ = require('lodash');

var mxp = require('../mxputils');
var CurrentExits = require('../currentexits');
var AppDispatcher = require('../AppDispatcher');

var kletterfail = 'Dort musst Du nicht mehr klettern.';
var schwimmfail = 'Dort musst Du nicht mehr schwimmen.';

var Component = require('../component');
var Parser = require('../parser');
var TelnetParser = require('../telnetparser');
var MxpParser = Component.define(Parser, TelnetParser);

function get(el, contextel, className) {
	while(el && el !== document.documentElement && el !== contextel) {
		if (el.classList.contains(className))
			return el;
		el = el.parentElement;
	}
}

var marginWidth = 60;

var PopupMenuItem = React.createClass({
	onClick: function(e) {
		e.preventDefault();
		this.props.onClick(this.props.item);
	},
	render: function() {
		return <li className="popup-menu-item"><a href="#" onClick={this.onClick}>{this.props.item.caption}</a></li>;
	}
});

var PopupMenu = React.createClass({
	onLeave: function() {
		this.props.onClick();
	},
	render: function() {
		var renderItem = function(item) { return <PopupMenuItem item={item} onClick={this.props.onClick}/>; }.bind(this);
		return <div className={"popup-menu " + (this.props.up?"up":"down")} onMouseLeave={this.onLeave}><ul className="popup-menu-list">{this.props.items.map(renderItem)}</ul></div>;
	}
});

var Content = React.createClass({
	shouldComponentUpdate: function() {
		return false;
	},
	render: function() {
		return this.transferPropsTo(<div className="content-wrap">
			<div className="content-scroll">
				<div className="content-overlay"/>
				<div ref="content" className="content" onClick={this.onClick}/>
			</div>
		</div>);
	},
	testCharSize: function() {
		var row = document.createElement('div');
		row.className = 'row';

		var span = document.createElement('span');
		span.textContent = 'A';
		row.appendChild(span);

		var ct = this.refs.content.getDOMNode();

		ct.appendChild(row);

		var height = row.getBoundingClientRect().height;
		var width = span.getBoundingClientRect().width;

		ct.removeChild(row);

		//console.log('charwidth:', width, 'charheight:', height);
		this.setState({charWidth: width, charHeight: height});
	},
	forceSendSize: function() {
		this.sendSize(true);
	},
    sendSize: function(force) {
		if (!this.props.mainContent)
			return;

		if (!this.state.charWidth)
			this.testCharSize();

        var ct = this.getDOMNode();
        var height = Math.floor(ct.clientHeight / this.state.charHeight);
        var width = Math.floor((ct.clientWidth-marginWidth) / this.state.charWidth);
        var last = this.state.lastSize;
        if (force || height !== last.height || width !== last.width) {
            this.setState({lastSize: {width: width, height:height}});
            AppDispatcher.fire('global.send', 'naws', width + "," + height);
        }
    },
	getRenderNode: function(){
		return this.refs.content.getDOMNode();
	},
	onClick: function(e) {
		var target = get(e.target, e.currentTarget, 'mxp-send');
		if (target) {
			e.preventDefault();
			var options = target['data-options'];
			if (e.target.classList.contains('mxp-menu')) {
				var menuel = e.target;
				var hints = (options.hint||'').split('|');
				var cmds = options[0].split('|');
				var items = [];
				for (var i=0,l=cmds.length;i<l;i++) {
					items.push({caption: hints[i+1], command: cmds[i]});
				}
				var clicked = function(item) {
					React.unmountComponentAtNode(menuel);
					if (item)
						AppDispatcher.fire('global.send', 'cmd', item.command, /^!/.test(item.command));
					AppDispatcher.fire('global.inputExpected');
				};
				var up = (e.target.parentElement.offsetTop - e.currentTarget.scrollTop) / e.currentTarget.clientHeight > 0.5;
				React.renderComponent(<PopupMenu items={items} onClick={clicked} up={up}/>, menuel);
				return;
			}
			this.handleMxpSend(options);
			AppDispatcher.fire('global.inputExpected');
		} else {
			e.stopPropagation();
			AppDispatcher.fire('global.inputExpected');
		}
	},
	handleMxpSend: function(options) {
		var cmd = options[0] || '';
		var pos = cmd.indexOf('|');
		if (pos !== -1)
			cmd = cmd.substr(0, pos);
		AppDispatcher.fire('global.send', 'cmd', cmd, /^!/.test(cmd));
		/**/
	},
	getDefaultProps: function() {
		return {
			maxLineCount: 5000,
			autoScroll: true
		};
	},
	getInitialState: function() {
		return {
			styles: {},
			classes: [],
			line: '',
			tags: [],
			mxpDefs: { element: {} },
			lastSize: { width: 0, height: 0 }
		};
	},
	onAtcp: function(name, value) {
		if (name !== 'Avalon.Kampf' || !this.isMounted())
			return;

		var el = this.getRenderNode();
		el.classList[value == 1?'add':'remove']('fight');
	},
	componentDidMount: function() {
		AppDispatcher.on('global.ast', this.emit);
		AppDispatcher.on('global.atcp', this.onAtcp);
        AppDispatcher.on('global.connected', this.forceSendSize);
        AppDispatcher.on('global.send', this.scrollToBottom);
        window.addEventListener('resize', this.sendSize);
	},
	componentWillUnmount: function() {
		AppDispatcher.off('global.ast', this.emit);
		AppDispatcher.off('global.atcp', this.onAtcp);
        AppDispatcher.off('global.connected', this.forceSendSize);
        AppDispatcher.off('global.send', this.scrollToBottom);
        window.removeEventListener('resize', this.sendSize);
	},
	emit: function(ast) {
		if (ast.type === 'flush')
			return this.batchComplete();
		
		var a, el, name, options;
		switch (ast.type) {
			case 'text':
				if ((ast.text === kletterfail || ast.text === schwimmfail) && CurrentExits.lastmove) {
					var move = CurrentExits.lastmove;
					delete CurrentExits.lastmove;
					AppDispatcher.fire('global.send', 'cmd', move);
				} else if (!this.silent) {
					this.emitText(ast.text);
					this.setState({line: this.state.line + ast.text});
				}

				break;

			case 'echo':
				this.emitText(ast.text);
				this.newLine();

				break;

			case 'newline':
				this.newLine();
				if (this.state.line) {
					AppDispatcher.fire('global.textline', this.state.line);
					this.setState({line: ''});
				}
				break;

			case 'reset-style':
				//this.emitText('RESET-STYLE');
				this.setStyles({});
				this.setClasses([]);
				break;

			case 'set-style':
				this.getClasses().push(ast.style);
				break;

			case 'clear-style':
				this.setClasses(_.difference(this.getClasses(), ast.style));
				break;

			case 'reset-color':
				delete this.getStyles().color;
				break;

			case 'reset-background-color':
				delete this.getStyles().backgroundColor;
				break;

			case 'set-color':
				this.getStyles().color = ast.color;
				break;

			case 'set-background-color':
				this.getStyles().backgroundColor = ast.color;
				break;

			case 'set-xterm-title':
				var title = ast.title.replace(/\s*\-\s*Avalon/i,'');
				if (title) {
					document.title = "Avalon: " + title;
				} else {
					document.title = "Avalon Web Client";
				}
				break;

			case 'mxp-escape':
				//this.silent = ast.parts[0] !== 7;
				break;

			case 'clear-to-end':
				var node = this.getRenderNode();
				while (node.hasChildNodes()) {
					node.removeChild(node.lastChild);
				}
				this.linecount = 0;
				break;

			case 'mxp-definition':
				name = ast.name.toLowerCase();
				if (name === 'el' || name === 'element')
					this.addMxpElementDefinition(ast);
				break;

			case 'mxp-open-element':
				name = ast.name.toLowerCase();

				if (name === 'exit') {
					a = mxp.attribsToObject(ast.attribs);
					if (a.exithint && a.exitdir) {
						CurrentExits.exits[a.exithint] = a.exitdir;
					}
				}

				if (name === 'support') {
					AppDispatcher.fire('global.send', 'cmd', '\x1b[1z<SUPPORTS +I +A +COLOR>', true);
				} else if (name === 'version') {
					AppDispatcher.fire('global.send', 'cmd', '\x1b[1z<VERSION MXP=1.2>', true);
				} else if (name === 'a') {
					el = document.createElement('a');
					a = mxp.attribsToObject(ast.attribs);
					el.target = '_blank';
					el.href = a.href;
					this.openTag(name, el);
				} else if (name === 'color' || name === 'c') {
					a = mxp.attribsToObject(ast.attribs);
					this.openTag(name);
					if (a.fore || a[0])
						this.getStyles().color = a.fore || a[0];
					if (a.back)
						this.getStyles().backgroundColor = a.back;
				} else if (name === 'b' || name === 'bold' || name === 'strong') {
					this.openTag(name);
					this.getStyles().fontWeight = 'bold';
				} else if (name === 'i' || name === 'italic' || name === 'em')  {
					this.openTag(name);
					this.getStyles().fontStyle = 'italic';
				} else if (name === 'u' || name === 'underline')  {
					this.openTag(name);
					this.getStyles().textDecoration = 'underline';
				} else if (name === 'br') {
					this.newLine();
				} else if (name === 'hr') {
					el = document.createElement('hr');
					this.openTag(name, el, true);
				} else if (name === 'username') {
					AppDispatcher.fire('global.sendUsername');
				} else if (name === 'password') {
					AppDispatcher.fire('global.sendPassword');
				} else if (name === 'expire') {
					if (ast.attribs[0] === 'ROOM') {
						_.keys(CurrentExits.exits).forEach(function(key) {
							delete CurrentExits.exits[key];
						});
						delete CurrentExits.lastmove;
					}
				} else if (name === 'send') {
					el = document.createElement('a');
					options = mxp.attribsToObject(ast.attribs);
					if (options[0] && options[0].indexOf('|') !== -1) {
						var ch = document.createElement('i');
						ch.className = 'mxp-menu fa fa-info-circle pull-right';
						el.appendChild(ch);
					}
					el.className = 'mxp-send';
					el['data-options'] = options;
					if (options.hint)
						el.title = options.hint.replace(/\|.*/,'');
					this.openTag(name, el);
				} else if (name === 'font') {
					this.openTag(name);
					options = mxp.attribsToObject(ast.attribs);
					var styles = this.getStyles();
					if (options.face)
						styles.fontFamily = options.face;
					if (options.size)
						styles.fontSize = options.size + 'pt';
				} else {
					var def = this.state.mxpDefs.element[name];
					if (def) {
						var parser = new MxpParser();
						options = mxp.attribsToObject(ast.attribs);
						var text = def.def;
						_.each(options, function(value, name) {
							text = text.replace('&' + name + ';', "'" + value + "'");
						});
						parser.onEmit = function(ast) { this.emit(ast); }.bind(this);
						this.openTag(name);
						parser.feed(text);
					} else {
						console.log('unknown mxp tag', ast);
					}
				}
				break;

			case 'mxp-close-element':
				name = ast.name.toLowerCase();
				//this.emitText('</' + name + '>');
				this.closeTag(name);
				break;
		}
	},
	addMxpElementDefinition: function(ast) {
        var attribs = mxp.attribsToObject(ast.attribs);
        var def = {};
        for (var attrib in attribs) {
            if (!attribs.hasOwnProperty(attrib))
                continue;
            var val = attribs[attrib];

            switch (attrib) {
                case '0': def.name = val; break;
                case '1': def.def = val; break;
                case 'empty': def.isEmpty = true; break;
                case 'open': def.isOpen = true; break;
                case 'delete': delete this.astDefs.element[def.name]; return;
                case 'att': def.att = val; break;
                case 'tag': def.tag = val; break;
                case 'flag': def.flag = val; break;
            }
        }

        this.state.mxpDefs.element[def.name] = def;
	},
	getStyles: function() {
		var tags = this.state.tags;
		if (tags.length !== 0)
			return tags[tags.length-1].styles;
		else
			return this.state.styles;
	},
	setStyles: function(styles) {
		var tags = this.state.tags;
		if (tags.length !== 0)
			tags[tags.length-1].styles = styles;
		else
			this.state.styles = styles;
	},
	getClasses: function() {
		var tags = this.state.tags;
		if (tags.length !== 0)
			return tags[0].classes;
		else
			return this.state.classes;
	},
	setClasses: function(classes) {
		var tags = this.state.tags;
		if (tags.length !== 0)
			tags[0].classes = classes;
		else
			this.state.classes = classes;
	},
	openTag: function(name, el, ignoreChildren) {
		var tags = this.state.tags;
		var styles, classes;
		var parent;

		if (tags.length !== 0 && tags[0].ignoreChildren)
			return;

		for (var i=0,l=tags.length;i<l;i++) {
			var tag = tags[i];
			if (tag.el) {
				parent = tag.el;
			}
		}
		if (tags.length === 0) {
			if (el)
				this.getLineEl().appendChild(el);
			else
				el = this.getLineEl();
			styles = _.cloneDeep(this.state.styles);
			classes = _.cloneDeep(this.state.classes);
		} else {
			if (el)
				parent.appendChild(el);
			styles = _.cloneDeep(tags[0].styles);
			classes = _.cloneDeep(tags[0].classes);
		}
		tags.unshift({name: name, el: el, styles: styles, classes: classes, ignoreChildren: ignoreChildren});
	},
	closeTag: function(name) {
		var tags = this.state.tags;
		var tag;

		if (tags.length !== 0 && tags[0].ignoreChildren && tags[0].name !== name)
			return;

		for (var i=0, l=tags.length;i<l;i++) {
			tag = tags[i];
			if (tag.name === name)
				break;
		}
		if (i === l)
			return;
		for (var j=0;j<=i;j++) {
			tags.shift();
		}
	},
	scrollToBottom: function() {
		var scrollEl = this.getRenderNode();
		if (scrollEl)
			scrollEl.scrollTop = scrollEl.scrollHeight;
	},
	atBottom: function() {
		var scrollEl = this.getRenderNode();
		return (scrollEl.scrollTop + scrollEl.clientHeight + 100) >= scrollEl.scrollHeight;
	},
	batchComplete: function() {
		var frag = this.fragel;
		if (frag) {
			var atbottom = this.atBottom();
			this.getRenderNode().appendChild(frag);
			if (this.props.autoScroll && atbottom)
				this.scrollToBottom();
			this.fragel = null;
		}
	},
	getLineEl: function() {
		var lineel = this.lineel;

		if (!lineel) {
			var frag = this.fragel;
			if (!frag) {
				frag = document.createDocumentFragment();
				this.fragel = frag;
			}
			var ct = this.getRenderNode();

			if (this.linecount >= this.props.maxLineCount && ct.firstChild) { // recycle dom elements
				lineel = ct.removeChild(ct.firstChild);
				while(lineel.firstChild)
					lineel.removeChild(lineel.firstChild);
			} else {
				lineel = document.createElement('div');
				lineel.className = 'row';
				this.linecount++;
			}
			frag.appendChild(lineel);
			this.lineel = lineel;
		}

		return lineel;
	},
	newLine: function() {
		var lineel = this.getLineEl();
		var len = lineel.childNodes.length;
		if (lineel.childNodes.length === 0) {
			if (this.linecount === 0)
				return;

			var span = document.createElement('span');
			span.textContent = ' ';
			lineel.appendChild(span);
		}
		this.state.tags = [];
		this.lineel = null;
	},
	emitText: function(text) {
		if (!text)
			return;
		var tags = this.state.tags;

		if (tags.length !== 0 && tags[0].ignoreChildren)
			return;
		
		var lineel = this.getLineEl();

		var span = document.createElement('span');
		var classes = this.getClasses();
		if (classes.length !== 0)
			span.className = classes.join(' ');
		var styles = this.getStyles();
		for (var key in styles) {
			if (!styles.hasOwnProperty(key))
				continue;
			span.style[key] = styles[key];
		}
		span.textContent = text;
		var parent = lineel;
		for (var i=0,l=tags.length;i<l;i++) {
			var tag = tags[i];
			if (tag.el) {
				parent = tag.el;
				break;
			}
		}
		parent.appendChild(span);
		this.textStart = this.pos;
	}
});

require('../ComponentRegistry').defineValue('widget.ContentPanel', Content);
module.exports = Content;
