var AstTransformation = require('./asttransformation');
var compose = require('./compose');
var mxp = require('./mxputils');

function MxpDefinitionTransformation() {
    compose.mixin(this, [AstTransformation]);

    this.after('initialize', function() {
        this.mxpDefs = { element: {}, entity: {}};
    });

    this.withTransformation(function(ast, next) {
        if (ast.type === 'mxp-definition')
            this.addMxpDefinition(ast);
        else
            next(ast);
    });

    this.addMxpDefinition = function(ast) {
        switch (ast.name.toLowerCase()) {
            case 'element':
            case 'el':
                this.addMxpElementDefinition(ast);
                break;

            case 'entity':
            case 'en':
                this.addMxpEntityDefinition(ast);
        }
    };

    this.addMxpEntityDefinition = function(ast) {

    };

    this.addMxpElementDefinition = function(ast) {
        console.log(JSON.stringify(ast));
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

        //console.log('MXP: add element def', def);

        this.mxpDefs.element[def.name] = def;
    };
}

module.exports = MxpDefinitionTransformation;