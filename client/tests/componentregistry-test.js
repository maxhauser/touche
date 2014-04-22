var _ = require('lodash');
var assert = require('chai').assert;
var Registry = require('../src/ComponentRegistry');

describe('Registry', function() {
    describe('#define()', function() {
        it('should define a component', function() {

            Registry.define('two', function(require) {
                var one = require('one');
                return one + " from two";
            });
            Registry.define('one', function() { return 'Hello World!'; });

            var two = Registry.require('two');

            assert.equal(two, 'Hello World! from two');
        });
    });
});