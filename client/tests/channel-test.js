var _ = require('lodash');
var assert = require('chai').assert;
var Channel = require('../src/Channel');

describe('Channel', function() {
    describe('#send()', function() {
        it('should send something', function() {

            var channel = new Channel();
            
            channel.send(1);
            channel.send(2);
            channel.send(3);

            assert.equal(3, channel.buffer.length);

            var result;
            channel.receive(function(r) { result = r; });
            assert.equal(1, result);
            channel.receive(function(r) { result = r; });
            assert.equal(2, result);
            channel.receive(function(r) { result = r; });
            assert.equal(3, result);
        });
    });
});