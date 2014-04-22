var _ = require('lodash');
var assert = require('chai').assert;
var Pathfinder = require('../src/Pathfinder');

describe('Pathfinder', function() {
    describe('#findPath()', function() {
        it('should return a valid path from a to b', function() {

            var rooms = {
                a: {n:'b',e:'d'},
                b: {s:'a',e:'f',n:{room:'c',dist:3}},
                c: {s:'b',w:'d'},
                d: {w:'a',e:{room:'c',dist:3}},
                e: {},
                f: {n:'c'}
            };

            var finder = new Pathfinder({
                getExits: function(room) {
                    return rooms[room];
                },
                getDist: function(room, exit) {
                    return exit.dist || 1;
                }
            });

            var path = finder.findPath('a', 'c');
            assert.equal(4, path.length);

            var path = finder.findPath('a', 'e');
            assert.equal(path, null);
        });
    });
});