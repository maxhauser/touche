/**@jsx React.DOM */
var React = require('react');
var _ = require('lodash');
var currentexits = require('../currentexits');
var AppDispatcher = require('../AppDispatcher');
var Session = require('../Session');
var Trie = require('../trie');
var env = require('../Environment');

var exits = {
    87: { dir: 'norden', def: 'n' }, // w
    65: { dir: 'westen', def: 'w' }, // a
    83: { dir: 'sueden', def: 's' }, // s
    68: { dir: 'osten', def: 'o' }, // d
    81: { dir: 'nordwesten', def: 'nw' }, // q
    69: { dir: 'nordosten', def: 'no' }, // e
    89: { dir: 'suedwesten', def: 'sw' }, // y
    88: { dir: 'suedosten', def: 'so' }, // x 
    72: { dir: 'hoch', def: 'h' }, // h
    82: { dir: 'runter', def: 'r' }, // r

    104: { dir: 'norden', def: 'n' }, // w
    100: { dir: 'westen', def: 'w' }, // a
    98: { dir: 'sueden', def: 's' }, // s
    102: { dir: 'osten', def: 'o' }, // d
    103: { dir: 'nordwesten', def: 'nw' }, // q
    105: { dir: 'nordosten', def: 'no' }, // e
    97: { dir: 'suedwesten', def: 'sw' }, // y
    99: { dir: 'suedosten', def: 'so' }, // x 
    107: { dir: 'hoch', def: 'h' }, // h
    109: { dir: 'runter', def: 'r' } // r
};

function normalize(text) {
    if (!/[äöüÄÖÜß]/.test(text))
        return text;
    return (text
        .replace('ä', 'ae').replace('Ä','Ae')
        .replace('ö', 'oe').replace('Ö', 'Oe')
        .replace('ü', 'ue').replace('Ü', 'Ue')
        .replace('ß', 'ss'));
}

function regexEscape(s) {
    return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
}

var CommandInput = React.createClass({
    getInitialState: function() {
        return {history:[], historyIndex: -1, candidates: [], candidateIndex: -1};
    },
    /*
    shouldUpdateComponent: function() {
        return false;
    },
    */
    onAtcp: function(name, value) {
        if (name === 'Client.Compose')
            this.setState({compose: true});
    },
    stealFocus: function() {
        if (!this.isMounted())
            return;
        var el = this.refs.input.getDOMNode();
        el.focus();
    },
    getFirstTrie: function() {
        var trie = Session.get('word.firsttrie');
        if (!trie) {
            trie = new Trie('', Trie.SORT_NONE);
            Session.set('word.firsttrie', trie);
        }
        return trie;
    },
    getTrie: function() {
        var trie = Session.get('word.trie');
        if (!trie) {
            trie = new Trie('', Trie.SORT_NONE);
            Session.set('word.trie', trie);
        }
        return trie;
    },
    populateTrie: function(ast) {
        if (ast.type !== 'text')
            return;

        var trie = this.getTrie();

        var words = ast.text.split(/\W+/g);
        for (var i=0,l=words.length;i<l;i++) {
            var word = words[i];
            if (word && word.length > 2)
                trie.add(word.toLocaleLowerCase());
        }
    },
    componentDidMount: function() {
        AppDispatcher.on('global.atcp', this.onAtcp);
        AppDispatcher.on('global.inputExpected', this.stealFocus);
        AppDispatcher.on('global.ast', this.populateTrie);
    },
    componentWillUnmount: function() {
        AppDispatcher.off('global.inputExpected', this.stealFocus);
        AppDispatcher.off('global.atcp', this.onAtcp);
        AppDispatcher.off('global.ast', this.populateTrie);
    },
    onWrapperClick: function() {
        this.refs.input.getDOMNode().focus();
    },
    render: function() {
        var suggestion = this.currentCandidate();
        return (
            <div title="Kommandoeingabe" className={"topcoat-text-input--large command-input-wrapper " + ((this.state.compose || this.state.scriptCompose)?'compose':'')} onClick={this.onWrapperClick}>
                <div className="command-input" title="Kommandoeingabe" aria-role="textbox" aria-autocompletion="inline">
                    <span ref="input" aria-live="assertive" title="Kommandoeingabe" style={{'padding-left':'1px','white-space':'pre-wrap'}} contentEditable={true} onKeyDown={this.keydown} onKeyPress={this.keypress} onKeyUp={this.keyup}/>
                    <span aria-role="presentation" className={'input-suggestions' + (suggestion?'':' hidden')}>{suggestion}</span>
                </div>
                <div className="command-compose-actions">
                    <div onClick={this.onEditorCancel} className="topcoat-button--large" >Abbrechen</div>
                    <div onClick={this.onEditorSend} className="topcoat-button--large--cta">Absenden</div>
                </div>
            </div>
        );
    },
    onEditorCancel: function() {
        if (this.state.compose)
            AppDispatcher.fire('global.send', 'cmd', '*q\nno');
        this.setState({compose: false, scriptCompose: false});
        var input = this.refs.input.getDOMNode();
        input.textContent = '';
    },
    onEditorSend: function() {
        var input = this.refs.input.getDOMNode();
        var value = normalize(input.textContent);
        if (this.state.compose) {
            AppDispatcher.fire('global.send', 'atcp', 'olesetbuf\n' + value + '\n');
            AppDispatcher.fire('global.send', 'cmd', '*s');
        } else {
            env.commandPipeline.send({type:'cmd', value: value});
        }
        this.setState({compose: false, scriptCompose: false});
        input.textContent = '';
    },
    keypress: function(e) {
        if (this.state.compose || this.state.scriptCompose)
            return;

        if (e.charCode >= 127 && [228, 196, 246, 214, 252, 220, 223].indexOf(e.charCode) === -1)
            return false;
        setTimeout(this.updateSuggestion, 0);
    },
    cursorAtEnd: function(value) {
        var selection = document.getSelection();
        return selection && selection.isCollapsed && selection.anchorOffset === value.length;
    },
    updateSuggestion: function() {
        var input = this.refs.input.getDOMNode();
        var value = input.textContent;

        if (!this.cursorAtEnd(value))
            return this.clearSuggestion();

        value = normalize(value);

        var lastWord = /\w+$/.exec(value);
        if (!lastWord)
            return this.clearSuggestion();

        lastWord = lastWord[0];
        var trie = lastWord.length === value.length ? this.getFirstTrie() : this.getTrie();
        var suggestions = trie.findPrefix(lastWord.toLocaleLowerCase());
        if (!suggestions)
            return this.clearSuggestion();
        
        var words = suggestions.getWords();
        if (!words)
            return this.clearSuggestion();

        var candidates = _(suggestions.getWords())
            .filter(function(s) { return s.length > 1; })
            .map(function(s) { return s.substr(1); })
            .value();

        if (candidates.length === 0)
            return this.clearSuggestion();

        this.setState({candidates: candidates, candidateIndex: 0});
    },
    moveCaretToEnd: function(el) {
        var range = document.createRange();
        range.selectNodeContents(el);
        range.collapse();
        var sel = document.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
    },
    selectAll: function(el) {
        var range = document.createRange();
        range.selectNodeContents(el);
        //range.collapse();
        var sel = document.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
    },
    clearSuggestion: function() {
        this.setState({candidates: [], candidateIndex: -1});
    },
    currentCandidate: function() {
        var ix = this.state.candidateIndex;
        if (ix !== -1)
            return this.state.candidates[ix];
    },
    handleWasd: function(e) {
        var exit = exits[e.keyCode];

        if (exit && (e.keyCode > 96 || e.altKey))
        {
            currentexits.lastmove = exit.def;
            AppDispatcher.fire('global.send', 'cmd', currentexits.exits[exit.dir] || exit.def);
            return true;
        }
    },
    keyup: function(e) {
        var input = this.refs.input.getDOMNode();
        var value = input.textContent;

        if (value.length > 0 && value[0] === '$') {
            this.setState({scriptCompose: true});
            return;
        } else if (this.state.scriptCompose) {
            this.setState({scriptCompose: false});
        }
    },
    keydown: function(e) {
        if (this.state.compose || this.state.scriptCompose)
            return;

        var ix;
        var input = e.target;
        var rawValue = input.textContent;
        var value = normalize(rawValue);
        var commandHistory = this.state.history;
        var historyIndex = this.state.historyIndex;
        //Object.keys(e).forEach(function(key) {console.log(key, e[key])});

        if(this.handleWasd(e))
            return;

        switch (e.keyCode) {
            case 13: // enter
                if (value[0] === '!') {
                    var search = new RegExp('^' + regexEscape(value.substr(1)), "i");
                    var entry = _.find(commandHistory, function(s) { return search.test(s); });
                    if (entry) {
                        input.textContent = value.substr(1) + entry.substr(value.length - 1);
                    }
                    this.clearSuggestion();
                    this.selectAll(input);
                    this.setState({historyIndex: -1});
                    return false;
                }
                input.textContent = '';

                env.commandPipeline.send({type:'cmd', value: value});

                if (value !== '' && commandHistory[0] !== value) {
                    commandHistory.unshift(value);
                }

                this.setState({historyIndex: -1});

                // add all words to the trie
                var trie = this.getTrie();
                var firstTrie = this.getFirstTrie();
                var first = true;
                value.split(/\W+/g).forEach(function(word) {
                    if (first) {
                        first = false;
                        firstTrie.add(word.toLocaleLowerCase());
                        return;
                    }

                    if (word.length < 3)
                        return;
                    
                    trie.add(word.toLocaleLowerCase());
                });

                this.clearSuggestion();
                return false;

            case 32:
            case 39:
                if (e.keyCode === 32 && !e.ctrlKey)
                    break;

                var suggestion = this.currentCandidate();
                if (suggestion && this.cursorAtEnd(rawValue)) {
                    rawValue += suggestion;
                    if (e.keyCode === 32)
                        rawValue += " ";
                    input.textContent = rawValue;
                    this.moveCaretToEnd(input);
                    this.updateSuggestion();
                    return false;
                }

                return;

            case 8: // backspace
                setTimeout(this.updateSuggestion, 0);
                break;

            case 38: // up
                if (e.ctrlKey) {
                    var candidates = this.state.candidates;
                    ix = this.state.candidateIndex + 1;
                    if (ix < candidates.length)
                        this.setState({candidateIndex: ix});
                    return false;
                } else if (historyIndex < commandHistory.length - 1) {
                    historyIndex++;
                    value = commandHistory[historyIndex];
                    this.setState({historyIndex: historyIndex});
                    input.textContent = value;
                    this.selectAll(input);
                    this.clearSuggestion();
                    return false;
                }
                break;

            case 40: // down
                if (e.ctrlKey) {
                    ix = this.state.candidateIndex - 1;
                    if (ix >= 0)
                        this.setState({candidateIndex: ix});
                    return false;
                } else if (historyIndex >= 0) {
                    historyIndex--;
                    value = historyIndex >= 0 ? commandHistory[historyIndex] : '';
                    this.setState({historyIndex: historyIndex});
                    input.textContent = value;
                    this.selectAll(input);
                    this.clearSuggestion();
                    return false;
                }
                break;
        }
    }
});

require('../ComponentRegistry').defineValue('widget.CommandInput', CommandInput);
module.exports = CommandInput;
