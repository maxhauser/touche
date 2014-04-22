var _ = require('lodash');

function Trigrams() {
}

Trigrams.prototype.grams = {};

Trigrams.split = function(text) {
	text = text.toLocaleLowerCase();
	var lmo = text.length - 3;
	var grams = [];
	for (var i = 0; i <= lmo; i++) {
		if (i == 0) {
			grams.push("__" + text[0]);
			grams.push("_" + text[0] + text[1]);
		}

		grams.push(text[i] + text[i + 1] + text[i + 2]);

		if (i == lmo) {
			grams.push(text[lmo + 1] + text[lmo + 2] + "_");
			grams.push(text[lmo + 1] + "__");
		}
	};
	return grams;
};

Trigrams.prototype.add = function(text, id) {
	var grams = this.grams;
	var curr = _.union(Trigrams.split(text));
	for (var i=0,l=curr.length;i<l;i++) {
		var c = curr[i];
		var g = grams[c];
		if (!g) {
			g = [];
			grams[c] = g;
		}
		g.push(id);
	}
};

Trigrams.prototype.get = function(text, max) {
	max = max || 5;
	var curr = Trigrams.split(text);
	var grams = this.grams;
	var docs = {};
	
	for (var i=0,l=curr.length;i<l;i++) {
		var c = curr[i];
		var g = grams[c];
		if (!g)
			continue;
		for (var j=0,lj=g.length;j<lj;j++) {
			var id = g[j];
			docs[id] = (docs[id] || 0) + 1;
		}
	}

	return _(docs)
		.pairs()
		.sortBy(function(e) { return -e[1]; })
		.take(max)
		.map(function(p) { return p[0]; })
		.value();
};
	
module.exports = Trigrams;
