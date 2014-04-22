module.exports = function() {
    var transformations = [];

    this.withTransformation = function(trans) {
        transformations.push(trans);
    };

    this.onEmit = function(ast) {
        var me = this;
        var next = function(ast) {
            me.emit(ast);
        };
        var fn = function(next, transformation) {
            return function(ast) {
                transformation.call(me, ast, next);
            };
        };
        for (var i = transformations.length - 1; i >= 0; i--) {
            next = fn(next, transformations[i]);
        }
        next(ast);
    };
};