var _ = require('lodash');
var assert = require('chai').assert;
var StringUtils = require('../src/StringUtils');

describe('StringUtils', function() {
    describe('#splitLine()', function() {
        it('only one char', function() {
        	var text = "A";
        	var split = StringUtils.splitLine(text, 50);
        	assert.equal(text, split);
        });
        it('do not split short lines', function() {
        	var text = "A short text";
        	var split = StringUtils.splitLine(text, 50);
        	assert.equal(text, split);
        });
        it('split lines', function() {
        	var text = "A little bit longer line.";
        	var split = StringUtils.splitLine(text, 15);
        	assert.equal("A little bit\nlonger line.", split);
        });
        it('split lines at punctuation', function() {
        	var text = "A little bit.longer line.";
        	var split = StringUtils.splitLine(text, 15);
        	assert.equal("A little bit.\nlonger line.", split);
        });
        it('split lines with many whitespace', function() {
        	var text = "A little bit.       longer line.";
        	var split = StringUtils.splitLine(text, 15);
        	assert.equal("A little bit.\nlonger line.", split);
        });
        it('split some lines with many whitespace', function() {
        	var text = "A little bit.       longer line and the next line also.";
        	var split = StringUtils.splitLine(text, 15);
        	assert.equal("A little bit.\nlonger line and\nthe next line\nalso.", split);
        });
        it('split too long lines without word boundary', function() {
        	var text = "1234567890123456789012345678901234567890";
        	var split = StringUtils.splitLine(text, 15);
        	assert.equal("123456789012345\n678901234567890\n1234567890", split);
        });
        it('split too long lines after normal line without word boundary', function() {
        	var text = "ab 1234567890123456789012345678901234567890";
        	var split = StringUtils.splitLine(text, 15);
        	assert.equal("ab\n123456789012345\n678901234567890\n1234567890", split);
        });
        it('split many lines', function() {
            var text = "Oops,\n\n" + 
"da hat mir anscheinend mein neu eingebauter Umbruch-Algorithums einen Strich durch die Rechnung gemacht ;)\n\n" +
"Ich habe die Browserweiche eigentlich nur deshalb eingebaut, um Benutzern die mit älteren Browserversionen unterwegst sind den Frust zu ersparen einen nicht oder nur halb funktionierenden Client vorzufinden.\n\n" +
"Liebe Grüße\nRupert"

            var expected = "Oops,\n\n" +
"da hat mir anscheinend mein neu eingebauter Umbruch-Algorithums einen\n" +
"Strich durch die Rechnung gemacht ;)\n\n" +
"Ich habe die Browserweiche eigentlich nur deshalb eingebaut, um Benutzern\n" +
"die mit älteren Browserversionen unterwegst sind den Frust zu ersparen\n" +
"einen nicht oder nur halb funktionierenden Client vorzufinden.\n\n" +
"Liebe Grüße\nRupert";

            var split = StringUtils.splitLine(text, 75);
            assert.equal(expected, split);
        });
    });
});