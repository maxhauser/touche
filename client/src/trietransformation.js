var AstTransformation = require('./asttransformation');
var compose = require('./compose');

function trieTransformation(trie, ast, next) {
    if (ast.type === 'text') {
        var words = ast.text.split(/\W+/g);
        for (var i=0,l=words.length;i<l;i++) {
            var word = words[i];
            if (word && word.length > 2)
                trie.add(word.toLocaleLowerCase());
        }
    }
    next(ast);
}

module.exports = function(trie) {
    compose.mixin(this, [AstTransformation]);
    this.withTransformation(function(ast, next) { trieTransformation(trie, ast, next); });
};