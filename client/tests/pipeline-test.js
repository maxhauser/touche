var _ = require('lodash');
var assert = require('chai').assert;
var Pipeline = require('../src/Pipeline');

describe('Pipeline', function() {
    describe('#add()', function() {
        it('should add a handler', function() {

            var result;

            var pipeline = new Pipeline();
            pipeline.receive(function(r) { result = r; })
            pipeline.receive(function(r) { result += r; })

            var ch = pipeline.add();

            ch.receive(function(d) { ch.send(d * 3); ch.send(d * 4); }); // pass throught

            pipeline.send(2);

            assert.equal(14, result);
        });
    });
});