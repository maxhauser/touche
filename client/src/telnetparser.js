var Parser = require('./parser');
var compose = require('./compose');

var EOF = -1;

module.exports = function() {
    compose.mixin(this, [Parser]);

    this.mxpMode = 'open';
    this.mxpDefaultMode = 'open';

    this.parse = function() {
        this.recoverpos = this.pos;
        switch (this.ll1()) {
            case '\x1b':
                this.consume();
                if (!this.parseEscape())
                    this.recover = true;
                break;

            case '<':
                if (this.mxpMode === 'locked')
                    this.parseText();
                else if (!this.parseMxpTag())
                    this.recover = true;
                break;

            case '&':
                if (this.mxpMode === 'locked')
                    this.parseText();
                else if (!this.parseEntity())
                    this.recover = true;
                break;

            default:
                this.parseText();
                break;
        }
    };

    this.parseEntity = function() {
        this.consume('&');
        var name = '';
        while(true) {
            var ll1 = this.ll1();
            if (ll1 === EOF)
                return false;
            if (ll1 === ';') {
                this.consume();
                this.onEmit({
                    type: 'entity',
                    name: name
                });
                return true;
            }
            if (/\W/.test(ll1)) {
                this.onEmit({
                    type: 'text',
                    text: '&' + name
                });
                return true;
            }
            name += ll1;
            this.consume();
        }
    };

    this.parseMxpTag = function() {
        var name, ll1;
        this.consume('<');

        ll1 = this.ll1();
        if (ll1 === EOF)
            return false;

        if (ll1 === '/') {
            this.consume();
            name = '';
            while (true) {
                ll1 = this.ll1();
                if (ll1 === EOF)
                    return false;
                if (ll1 === '>') {
                    this.consume();
                    this.onEmit({
                        type: 'mxp-close-element',
                        name: name
                    });
                    return true;
                }
                name += ll1;
                this.consume();
            }
        }

        var type = 'mxp-open-element';
        if (ll1 === '!') {
            type = 'mxp-definition';
            this.consume();
        }

        name = '';
        while (true) {
            ll1 = this.ll1();
            if (ll1 === EOF)
                return false;
            if (/[^\w\-]/.test(ll1)) {
                break;
            }
            name += ll1;
            this.consume();
            if (name === '--')
                break;
        }

        if (type === 'mxp-definition' && name === '--') {
            var i = 0;
            var text = '';
            while (true) {
                ll1 = this.ll1();
                if (ll1 === EOF)
                    return false;
                this.consume();
                text += ll1;
                if (ll1 === '>') {
                    if (i >= 2) {
                        this.onEmit({
                            type: 'mxp-comment',
                            text: text.substr(0, text.length - 3).trim()
                        });
                        return true;
                    }
                } else if (ll1 === '-') {
                    i++;
                } else {
                    i = 0;
                }
            }
        }

        var attribs = [];
        while (true) {
            while (true) {
                ll1 = this.ll1();
                if (ll1 === EOF)
                    return false;
                if (ll1 === '>') {
                    this.consume();
                    this.onEmit({
                        type: type,
                        name: name,
                        attribs: attribs
                    });
                    return true;
                }
                if (/[^\s\x1e]/.test(ll1))
                    break;
                this.consume();
            }

            var attrib = '';
            while (true) {
                ll1 = this.ll1();
                if (ll1 === EOF)
                    return false;

                if (ll1 === "'" || ll1 === '"') {
                    attrib += ll1;
                    var del = ll1;
                    this.consume();
                    while (true) {
                        ll1 = this.ll1();
                        if (ll1 === EOF)
                            return false;
                        attrib += ll1;
                        this.consume();
                        if (ll1 === del)
                            break;
                    }
                    break;
                }

                if (/[\s\x1e>]/.test(ll1)) {
                    break;
                }

                attrib += ll1;
                this.consume();
            }
            attribs.push(attrib);
        }

        console.log('invalid mxp tag at ' + this.recoverpos);
        return true;
    };

    this.parseText = function() {
        var start = this.pos;
        while (true) {
            var ll1 = this.ll1();
            if (ll1 === '\x1b' || ll1 === '\n' || ll1 === EOF || ll1 === '\x1e' || 
                    ((ll1 === '<' || ll1 === '&') && this.mxpMode !== 'locked')) {
                this.onEmit({
                    type: 'text',
                    text: this.text.substring(start, this.pos)
                });
                if (ll1 === '\n' || ll1 === '\x1e') {
                    this.onEmit({
                        type: 'newline'
                    });
                    this.consume();
                    this.mxpMode = this.mxpDefaultMode;
                }
                break;
            }

            this.consume();
        }
    };

    this.parseEscape = function() {
        switch (this.ll1()) {
            case '[':
                this.consume();
                return this.parseStyleEscape();

            case ']':
                this.consume();
                return this.parseTitleEscape();

            case EOF:
                return false;

            default:
                this.log('unrecognized escape sequence (starts with ' + this.ll1() + ').');
                return true;
        }

    };

    this.parseStyleEscape = function() {
        var parts = [];
        var curr = '';

        var ll1 = this.ll1();
        switch (ll1) {
            case 'H':
                this.consume();
                this.emit({
                    type: 'cursor-home'
                });
                return true;

            case 'J':
                this.consume();
                this.emit({
                    type: 'clear-to-end'
                });
                return true;
        }

        while (true) {
            ll1 = this.ll1();
            if (isDigit(ll1)) {
                this.consume();
                curr += ll1;
            } else if (ll1 === ';') {
                this.consume();
                parts.push(parseInt(curr, 10));
                curr = '';
            } else if (ll1 === 'D') {
                parts.push(parseInt(curr, 10));
                this.consume();
                this.onEmit({
                    type: 'leftshift-escape',
                    parts: parts
                });
                return true;
            } else if (ll1 === 'm') {
                parts.push(parseInt(curr, 10));
                this.consume();
                this.onEmit({
                    type: 'mode-escape',
                    parts: parts
                });
                return true;
            } else if (ll1 === 'z') {
                var mode = parseInt(curr, 10);
                switch (mode) {
                    case 0:
                        this.mxpMode = 'open';
                        break;
                    case 1:
                        this.mxpMode = 'secure';
                        break;
                    case 2:
                        this.mxpMode = 'locked';
                        break;
                    case 3:
                        this.mxpMode = 'open';
                        break;
                    case 4:
                        this.mxpMode = 'temp secure';
                        break;
                    case 5:
                        this.mxpMode = 'open';
                        this.mxpDefaultMode = 'open';
                        break;
                    case 6:
                        this.mxpMode = 'secure';
                        this.mxpDefaultMode = 'secure';
                        break;
                    case 7:
                        this.mxpMode = 'locked';
                        this.mxpDefaultMode = 'locked';
                        break;
                    default:
                        this.log('unsupported mxp mode.');
                }
                this.consume();
                this.onEmit({
                    type: 'mxp-escape',
                    parts: [mode]
                });
                return true;
            } else if (ll1 === 'J') {
                this.consume();
                this.emit({
                    type: 'clear-to-end'
                });
                return true;
            } else if (ll1 === EOF) {
                return false;
            } else {
                this.log('unrecognized escape sequence (starts with ' + this.ll1() + ').');
                return true;
            }
        }

    };

    this.consumeNumber = function() {
        var num = '';
        while (true) {
            var ll1 = this.ll1();
            if (!isDigit(ll1))
                break;
            num += ll1;
            this.consume();
        }
        return parseInt(num, 10);
    };

    this.parseTitleEscape = function() {
        if (!isDigit(this.ll1())) {
            this.log('unrecognized escape sequence.');
            return true;
        }

        var code = this.consumeNumber();
        var term = this.consume();

        if (term !== ';' && code !== 0 && code !== 30) {
            this.log('unrecognized escape sequence.');
            return true;
        }

        var title = '';
        while (true) {
            var c = this.ll1();
            if (c === EOF)
                return false;
            this.consume();
            if (c === '\x07')
                break;
            title += c;
        }
        this.onEmit({
            type: code === 0 ? 'set-xterm-title' : 'set-kde-title',
            title: title
        });

        return true;
    };
};

function isDigit(c) {
    return (/^\d$/).test(c);
}