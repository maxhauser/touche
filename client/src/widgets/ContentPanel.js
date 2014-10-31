/**@jsx React.DOM */
var React = require('react');
var _ = require('lodash');

require('./ContentPanel.less');

var mxp = require('../mxputils');
var CurrentExits = require('../currentexits');
var AppDispatcher = require('../AppDispatcher');
var env = require('../Environment');

var kletterfail = 'Dort musst Du nicht mehr klettern.';
var schwimmfail = 'Dort musst Du nicht mehr schwimmen.';

var Component = require('../component');
var Parser = require('../parser');
var TelnetParser = require('../telnetparser');
var MxpParser = Component.define(Parser, TelnetParser);
//var ColorUtils = require('../ColorUtils');

var StringUtils = require('../StringUtils');

var StringUtils = require('../StringUtils');

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
		return <li className="popup-menu-item" onClick={this.onClick}><a>{this.props.item.caption}</a></li>;
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
	render: function() {
		return (<div {...this.props} className={"content-wrap " + (this.props.className||"")}>
			<div className="content-scroll">
				<div className="content-overlay"/>
				<article ref="content" aria-role="log" aria-live="polite" className={"content" + (env.fixedScroll?" fixed":"")} onClick={this.onClick} tabIndex={-1}/>
			</div>
		</div>);
	},
	shouldComponentUpdate: function(nextProps, nextState) {
		return false;
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
            AppDispatcher.fire('send', 'naws', width + "," + height);
        }
    },
	onClick: function(e) {
		var target = get(e.target, e.currentTarget, 'mxp-send');
		if (target) {
			e.preventDefault();
			var options = target['data-options'];
			this.handleMxpSend(options, e, target);
		} else {
			e.stopPropagation();
			AppDispatcher.fire('inputExpected');
		}
	},
	handleMxpSend: function(options, e, target) {
		var cmd = options[0] || '';
		var pos = cmd.indexOf('|');
		if (pos === -1) {
			AppDispatcher.fire('send', 'cmd', cmd, /^!/.test(cmd), true); //
			AppDispatcher.fire('inputExpected');
			return;
		}

		var hints = (options.hint||'').split('|');
		var cmds = options[0].split('|');
		var items = [];
		for (var i=0,l=cmds.length;i<l;i++) {
			items.push({caption: hints[i+1], command: cmds[i]});
		}
		var menuel = document.createElement('span');
		var clicked = function(item) {
			React.unmountComponentAtNode(menuel);
			menuel.parentElement.removeChild(menuel);
			if (item)
				AppDispatcher.fire('send', 'cmd', item.command, /^!/.test(item.command), true); //
			AppDispatcher.fire('inputExpected');
		};
		var up = (target.offsetTop - e.currentTarget.scrollTop) / e.currentTarget.clientHeight > 0.5;
		target.appendChild(menuel);
		React.renderComponent(<PopupMenu items={items} onClick={clicked} up={up}/>, menuel);
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

		var el = this.getDOMNode();
		el.classList[value == 1?'add':'remove']('fight');
	},
	onSend: function(type, text, silent, manual) {
		if (manual)
			this.scrollToBottom();
	},
	componentDidMount: function() {
		AppDispatcher.on('ast', this.emit);
		AppDispatcher.on('atcp', this.onAtcp);
		AppDispatcher.on('mxp', this.onMxp);
        AppDispatcher.on('connected', this.forceSendSize);
        AppDispatcher.on('send', this.onSend);
        window.addEventListener('resize', this.sendSize);

		this.linecount = 0;
		this.lastline = 0;
		this.renderNode = this.refs.content.getDOMNode();
	},
	componentWillUnmount: function() {
		AppDispatcher.off('ast', this.emit);
		AppDispatcher.off('atcp', this.onAtcp);
		AppDispatcher.off('mxp', this.onMxp);
        AppDispatcher.off('connected', this.forceSendSize);
        AppDispatcher.off('send', this.onSend);
        window.removeEventListener('resize', this.sendSize);
	},
	invertColors: function() {
		var styles = this.getStyles();
		var fg = styles.color;
		var bg = styles.backgroundColor;
		if (fg) {
			styles.backgroundColor = fg;
			if (bg) {
				styles.color = bg;
				styles.borderColor = bg;
			} else {
				delete styles.color;
				delete styles.borderColor;
			}
		} else if (bg) {
			styles.color = bg;
			styles.borderColor = bg;
			delete styles.backgroundColor;
		}
	},
	emit: function(ast) {
		if (ast.type === 'flush')
			return this.batchComplete();

		var name, text;
		switch (ast.type) {
			case 'text':
				if ((ast.text === kletterfail || ast.text === schwimmfail) && CurrentExits.lastmove) {
					var move = CurrentExits.lastmove;
					delete CurrentExits.lastmove;
					AppDispatcher.fire('send', 'cmd', move);
				} else if (!this.silent) {

					text = StringUtils.splitLine(ast.text, 95);
					text.split('\n').forEach(function(line, ix) {
						if (ix !== 0)
							this.newLine();
						this.emitText(line);
					}, this);
					this.setState({line: this.state.line + ast.text});
				}

				break;

			case 'echo':
				if (ast.text === '' && (!this.lineel || !this.lineel.hasChildNodes))
					return;
				text = StringUtils.splitLine(ast.text, 75);
				text.split('\n').forEach(function(line) {
					this.emitText(line, 'echo');
					this.newLine();
				}, this);
				this.batchComplete();
				break;

			case 'newline':
				delete this.getStyles().marginLeft;
				this.newLine();
				if (this.state.line) {
					AppDispatcher.fire('textline', this.state.line);
					this.setState({line: ''});
				}
				//this.setStyles({});
				//this.setClasses([]);
				break;

			case 'reset-style':
				//this.emitText('RESET-STYLE');
				this.setStyles({});
				this.setClasses([]);
				break;

			case 'set-style':
				this.getClasses().push(ast.style);
				if (ast.style === 'inverted')
					this.invertColors();
				break;

			case 'clear-style':
				this.setClasses(_.difference(this.getClasses(), ast.style));
				if (ast.style.indexOf('inverted') !== -1)
					this.invertColors();
				break;

			case 'leftshift-escape':
				this.getStyles().marginLeft = -(ast.parts[0] * this.state.charWidth) + 'px';
				this.getClasses().push('solidBackground');
				break;

			case 'reset-color':
				delete this.getStyles().color;
				delete this.getStyles().borderColor;
				break;

			case 'reset-background-color':
				delete this.getStyles().backgroundColor;
				break;

			case 'set-color':
				this.getStyles().color = ast.color;
				this.getStyles().borderColor = ast.color;
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
				var node = this.renderNode;
				if (!node)
					return;
				while (node.hasChildNodes()) {
					node.removeChild(node.lastChild);
				}
				this.linecount = 0;
				this.lastline = 0;
				break;

			case 'mxp-definition':
				name = ast.name.toLowerCase();
				if (name === 'el' || name === 'element')
					this.addMxpElementDefinition(ast);
				break;

			case 'mxp-open-element':
				this.handleMxpOpenElement(ast);
				break;

			case 'mxp-close-element':
				name = ast.name.toLowerCase();
				//this.emitText('</' + name + '>');
				this.closeTag(name);
				break;
		}
	},
	handleMxpOpenElement: function(ast) {
		var a, el, options;
		var name = ast.name.toLowerCase();

		if (name === 'exit') {
			a = mxp.attribsToObject(ast.attribs);
			if (a.exithint && a.exitdir) {
				CurrentExits.exits[a.exithint] = a.exitdir;
			}
		}
		if (name === 'support') {
			AppDispatcher.fire('send', 'cmd', '\x1b[1z<SUPPORTS +I +A +COLOR +IMAGE +EXIPRE +FONT +SEND +B +U +BR +HR +USERNAME +PASSWORD +VERSION +SUPPORT>', true);
		} else if (name === 'version') {
			AppDispatcher.fire('send', 'cmd', '\x1b[1z<VERSION MXP=1.2>', true);
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
			AppDispatcher.fire('sendUsername');
		} else if (name === 'password') {
			AppDispatcher.fire('sendPassword');
		} else if (name === 'expire') {
			if (ast.attribs[0] === 'ROOM') {
				_.keys(CurrentExits.exits).forEach(function(key) {
					delete CurrentExits.exits[key];
				});
				delete CurrentExits.lastmove;
				this.expireRoom();
			}
		} else if (name === 'send') {
			el = document.createElement('a');
			options = mxp.attribsToObject(ast.attribs);
			var hasList = options[0] && options[0].indexOf('|') !== -1;
			el.className = 'mxp-send' + (hasList?' mxp-send-menu':'');
			el['data-options'] = options;
			if (hasList) {
				var iconel = document.createElement('i');
				iconel.className = 'fa fa-plus mxp-menu-icon';
				el.appendChild(iconel);
				el.title = "Klicken um Kommandos anzuzeigen.";
			} else if (options.hint)
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
		} else if (name === 'image') {
			el = document.createElement('img');
			options = mxp.attribsToObject(ast.attribs);
			el.src = options.url + (options.fname || '');
			if (options.w) el.width = options.w;
			if (options.h) el.height = options.h;
			if (options.hspace) {
				el.styles.paddingLeft = options.hspace;
				el.styles.paddingRight = options.hspace;
			}
			if (options.vspace) {
				el.styles.paddingTop = options.vspace;
				el.styles.paddingBottom = options.vspace;
			}
			if (options.align === 'left') el.styles.textAlign = 'left';
			if (options.align === 'right') el.styles.textAlign = 'right';
			if (options.align === 'top') el.styles.verticalAlign = 'top';
			if (options.align === 'middle') el.styles.verticalAlign = 'middle';
			if (options.align === 'bottom') el.styles.verticalAlign = 'bottom';
			this.openTag(name, el, true);
			this.closeTag(name);
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
	},
	onMxp: function(value) {
		var parser = new MxpParser();
		parser.onEmit = this.emit;
		parser.feed(value);
	},
	expireRoom: function() {
		var nodes = this.renderNode.childNodes;
		var removeNodes = this.removeNodes || (this.removeNodes = []);
		for (var i = nodes.length - 1; i >= 0; i--) {
			var node = nodes[i];

			if (!node.classList.contains('current-room'))
				return;

			removeNodes.push(node);
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
			return tags[0].styles;
		else
			return this.state.styles;
	},
	setStyles: function(styles) {
		var tags = this.state.tags;
		if (tags.length !== 0)
			tags[0].styles = styles;
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
		var scrollEl = this.renderNode;
		if (scrollEl)
			scrollEl.scrollTop = scrollEl.scrollHeight;
	},
	atBottom: function() {
		if (env.fixedScroll)
			return;

		var scrollEl = this.renderNode;
		if (scrollEl)
			return (scrollEl.scrollTop + scrollEl.clientHeight + 100) >= scrollEl.scrollHeight;
	},
	batchComplete: function() {
		if (this.linecount === this.lastline)
			return;

		//console.log('insert ' + (this.linecount - this.lastline) + ' lines');
		this.lastline = this.linecount;

		var frag = this.fragel;
		//this.setState({afterinput: false});
		if (frag) {
			var atbottom = this.atBottom();
			this.fragel = null;
			this.renderNode.appendChild(frag);
			if (this.props.autoScroll && atbottom)
				this.scrollToBottom();
		}

		var removeNodes = this.removeNodes;
		if (removeNodes) {
			for (var i = removeNodes.length - 1; i >= 0; i--) {
				removeNodes[i].classList.remove('current-room');
			}
			this.removeNodes = null;
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
			/*
			var ct = this.getRenderNode();

			if (this.linecount >= this.props.maxLineCount && ct.firstChild) { // recycle dom elements
				lineel = ct.removeChild(ct.firstChild);
				while(lineel.firstChild)
					lineel.removeChild(lineel.firstChild);
			} else {
				*/

			lineel = document.createElement('div');
			lineel.className = 'row current-room';
			this.linecount++;

			//}
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
		var tags = this.state.tags;
		tags.splice(0, tags.length);
		this.lineel = null;
	},
	emitText: function(text, additionalclasses) {
		if (!text)
			return;
		var tags = this.state.tags;

		if (tags.length !== 0 && tags[0].ignoreChildren)
			return;

		var span = document.createElement('span');
		var classes = this.getClasses();
		var className = additionalclasses || '';
		if (classes.length !== 0)
			className += ' ' + classes.join(' ');
		span.className = className;

		var styles = this.getStyles();
		for (var key in styles) {
			if (!styles.hasOwnProperty(key))
				continue;

/*
			if (key === 'color') {
				span.style.color = ColorUtils.mapColor(styles.color);
			} else {
				*/
				span.style[key] = styles[key];
			//}
		}

		span.textContent = text;
		var parent = this.getLineEl();
		for (var i=0,l=tags.length;i<l;i++) {
			var tag = tags[i];
			if (tag.el) {
				parent = tag.el;
				break;
			}
		}
		parent.appendChild(span);
	}
});

require('../ComponentRegistry').defineValue('widget.ContentPanel', Content);
module.exports = Content;
