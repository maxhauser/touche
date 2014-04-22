var _ = require('lodash');
var assert = require('chai').assert;
var mxputils = require('../src/mxputils');

describe('Parser', function() {
    describe('#parseAttributeList()', function() {
        it('should parse attribute list', function() {
            var a = mxputils.parseAttributeList("bla 'hallo' a='b' c=d");
            assert.equal(a[0], 'bla');
            assert.equal(a[1], 'hallo');
            assert.equal(a['a'], 'b');
            assert.equal(a['c'], 'd');
        });
    });
});