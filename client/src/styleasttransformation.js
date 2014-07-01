var AstTransformation = require('./asttransformation');
var componse = require('./compose');
var color256 = require('./colors');

var styles = [undefined, 'bold', 'dim', 'italic', 'underline', 'blink', 'fastblink', 'inverted', 'conceal', 'strikethrough'];
styles[21] = 'doubleunderline';
styles[22] = {clear:['bold']};
styles[23] = {clear:['italic']};
styles[24] = {clear:['underline', 'doubleunderline']};
styles[25] = {clear:['blink','fastblink']};
styles[27] = {clear:['inverted']};
styles[28] = {clear:['conceal']};
styles[29] = {clear:['strikethrough']};
styles[50] = 'framed';
styles[52] = 'overlined';

function notRecognised(ast) {
    console.log('not recognised mode secape sequence (' + ast.parts.join(';') + ')');
}

function modeTransformation(ast, next) {
    if (ast.type !== 'mode-escape')
        return next(ast);

    var parts = ast.parts;
    switch (parts.length) {
        case 1:
            var val = parts[0];
            if (val === 0)
                return next({
                    type: 'reset-style'
                });

            if (val >= 30 && val <= 37)
                return next({
                    type: 'set-color',
                    color: color256[val - 30]
                });
            if (val >= 40 && val <= 47)
                return next({
                    type: 'set-background-color',
                    color: color256[val - 40]
                });
            if (val === 39)
                return next({
                    type: 'reset-color'
                });
            if (val === 49)
                return next({
                    type: 'reset-background-color'
                });

            var style = styles[val];
            if (style) {
                return next({
                    type: style.clear?'clear-style':'set-style',
                    style: style.clear||style
                });
            }

            notRecognised(ast);
            return next(ast);

        case 2:
            if (parts[0] === 1) {
                var p = parts[1];
                if (p >= 30 && p <= 37)
                    return next({
                        type: 'set-color',
                        color: color256[p - 22]
                    });

                if (p >= 40 && p <= 47)
                    return next({
                        type: 'set-background-color',
                        color: color256[p - 32]
                    });
            }

            notRecognised(ast);
            return next(ast);

        case 3:
            var p1 = parts[0];
            if ((p1 === 38 || p1 === 48) && parts[1] === 5) {
                return next({
                    type: p1 === 38 ? 'set-color' : 'set-background-color',
                    color: color256[parts[2]]
                });
            }

            if (p1 === 2 && parts[1] === 37 && parts[2] === 0) {
                return next({type: 'reset-color'});
            }

            notRecognised(ast);
            return next(ast);

        default:
            notRecognised(ast);
            return next(ast);
    }
}

module.exports = function() {
    componse.mixin(this, [AstTransformation]);
    this.withTransformation(modeTransformation);
};
