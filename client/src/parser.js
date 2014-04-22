var Logger = require('./logger');

var EOF = -1;

module.exports = function() {
    Logger.call(this);

    this.feed = function(text) {
        //console.log('RAW', text);
        if (!text) return;
        if (this.recover) {
            this.text = this.text.substr(this.recoverpos) + text;
            this.recover = false;
        } else {
            this.text = text;
        }
        this.pos = 0;

        while (!this.eof() && !this.recover) {
            this.parse();
        }

        this.onBatchEnd();
    };

    this.eof = function() {
        return this.pos >= this.text.length;
    };

    this.consume = function(ch) {
        if ('undefined' !== typeof ch) {
            if (this.ll1() !== ch)
                return false;
        }

        this.pos++;
        return this.eof();
    };

    this.ll1 = function() {
        var pos = this.pos;
        var text = this.text;
        if (pos < text.length)
            return text[pos];
        else
            return EOF;
    };

    this.onEmit = function(ast) {
        if (this.emit)
            this.emit(ast);
    };

    this.onBatchEnd = function() {};
};