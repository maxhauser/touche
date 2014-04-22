var _ = require('lodash');
var assert = require('chai').assert;
var Component = require('../src/component');
var Telnetparser = require('../src/telnetparser');
var StyleTransformation = require('../src/styleasttransformation');

describe('Parser', function() {
    describe('#parse()', function() {
        it('should parse partial escape sequences', function() {
            var Parser = Component.define(Telnetparser, StyleTransformation);
            var parser = new Parser();

            var asts = [];
            parser.emit = function(ast) {
                asts.push(ast);
            };
            parser.feed('\x1b[0');
            parser.feed('mbla');

            assert.lengthOf(asts, 2);
            assert.equal(asts[0].type, 'reset-style');
            assert.equal(asts[1].type, 'text');
            assert.equal(asts[1].text, 'bla');
        });

        it('should parse partial escape sequences from esc', function() {
            var Parser = Component.define(Telnetparser, StyleTransformation);
            var parser = new Parser();

            var asts = [];
            parser.emit = function(ast) {
                asts.push(ast);
            };
            parser.feed('\x1b');
            parser.feed('[0mbla');

            assert.lengthOf(asts, 2);
            assert.equal(asts[0].type, 'reset-style');
            assert.equal(asts[1].type, 'text');
            assert.equal(asts[1].text, 'bla');
        });

        it('should parse simple mxp definition tag', function() {
            var Parser = Component.define(Telnetparser);
            var parser = new Parser();

            var asts = [];
            parser.emit = function(ast) {
                asts.push(ast);
            };
            parser.feed('<!ELEMENT bla>');

            assert.lengthOf(asts, 1);
            var ast = asts[0];
            assert.equal(ast.type, 'mxp-definition');
            assert.equal(ast.name, 'ELEMENT');
            assert.lengthOf(ast.attribs, 1);
            assert.equal(ast.attribs[0], 'bla');
        });

        it('should parse mxp comment', function() {
            var Parser = Component.define(Telnetparser);
            var parser = new Parser();

            var asts = [];
            parser.emit = function(ast) {
                asts.push(ast);
            };
            parser.feed("<!--this is a comment-->");

            assert.lengthOf(asts, 1);
            var ast = asts[0];
            assert.equal(ast.type, 'mxp-comment');
            assert.equal(ast.text, 'this is a comment');
        });

        it('should parse entities', function() {
            var Parser = Component.define(Telnetparser);
            var parser = new Parser();

            var asts = [];
            parser.emit = function(ast) {
                asts.push(ast);
            };
            parser.feed("&amp;")

            assert.lengthOf(asts, 1);
            var ast = asts[0];
            assert.equal(ast.type, 'entity');
            assert.equal(ast.name, 'amp');
        });

        it('should parse invalid entities as text', function() {
            var Parser = Component.define(Telnetparser);
            var parser = new Parser();

            var asts = [];
            parser.emit = function(ast) {
                asts.push(ast);
            };
            parser.feed("&bla bla;")

            assert.lengthOf(asts, 2);
            var ast = asts[0];
            assert.equal(ast.type, 'text');
            assert.equal(ast.text, '&bla');
            var ast = asts[1];
            assert.equal(ast.type, 'text');
            assert.equal(ast.text, ' bla;');
        });
    });
});