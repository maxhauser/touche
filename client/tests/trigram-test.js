var _ = require('lodash');
var assert = require('chai').assert;
var Trigrams = require('../src/trigrams');

describe('Trigrams', function() {
    describe('#split()', function() {
        it('should split', function() {
        	var grams = Trigrams.split('Hallo');
        	assert.deepEqual(grams, ['__h', '_ha', 'hal', 'all', 'llo', 'lo_', 'l__']);
        });
    });

    describe('#get()', function() {
        it('should get right values', function() {
        	var grams = new Trigrams;
        	grams.add('Hello world!', '2');
        	grams.add('Hello wrld!', '1');
        	grams.add('Hello Hello wrd!', '3');
        	var ids = grams.get('world');
        	assert.deepEqual(ids, ['2', '1']);
        });
    });
});