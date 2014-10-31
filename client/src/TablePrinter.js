
var _ = require('lodash');

var TablePrinter = function(cols) {
	this.cols = cols;
	this.lines = [];
};

module.exports = TablePrinter;

TablePrinter.prototype.set = function(text, x, y) {
	var lines = this.lines;
	if ('undefined' === typeof y)
		y = lines.length - 1;

	if (y < 0)
		y = 0;

	while (y >= lines.length) {
		lines.push([]);
	}

	if ('undefined' === typeof x) {
		x = lines[y].length;
		if (x >= this.cols.length) {
			x = 0;
			lines.push([]);
			y ++;
		}
	}

	lines[y][x] = text;
};

TablePrinter.prototype.print = function() {
	var cols = this.cols;

	var totalwidth = _.reduce(cols, function(sum, col) { return sum + col.width + 1; }, 0) + 1;
	var text = repeatChar(totalwidth, '-') + "\n";

	text += this.printLine(_.pluck(cols, 'title'));

	text += repeatChar(totalwidth, '-') + "\n";

	var lines = this.lines;
	for (var i=0;i<lines.length;i++) {
		var line = lines[i];
		text += this.printLine(line);
	}

	text += repeatChar(totalwidth, '-') + "\n";

	return text;
};

TablePrinter.prototype.printLine = function(line) {
	var cols = this.cols;
	var text = '|';
	for (var j=0;j<cols.length;j++) {
		text += cell(line[j], cols[j].width) + '|';
	}
	return text + '\n';
};

function cell(text, width) {
	if (!text)
		return repeatChar(width, ' ');

	if (text.length > width)
		text = text.substr(0,width);
	else
		text = text + repeatChar(width - text.length, ' ');

	return text;
}

function repeatChar(count, ch) {
    var txt = "";
    for (var i = 0; i < count; i++) {
        txt += ch;
    }
    return txt;
}