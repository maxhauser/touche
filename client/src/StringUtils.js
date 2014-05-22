function splitLine(text, lineLength) {
    lineLength = lineLength || 75;

    if (!text || text.length < lineLength)
		return text;

    var lines = [];
    var ix = 0, start = 0, boundary = 0;
    var nospace = true, noword = true;
    var l = text.length;
    var laststart = 0;
    for (var i = 0; i < l; i++, ix++) {
        var c = text[i];
        if (c === '\n' || c === '\r') {
            start = i + 1;
            ix = 0;
            boundary = start;
        }

        var space = /\s/.test(c);
        var word = /\w/.test(c);

        if (nospace && (space || (noword && word)))
            boundary = i;

        nospace = !space;
        noword = !word;

        if (ix == lineLength) {
            if (boundary === start) {
                lines.push(text.slice(start, i));
                start = i;
            } else {
				lines.push(text.slice(start, boundary));
                start = boundary;
                while (start < l && /\s/.test(text[start]))
                    start++;
                i = start;
            }
            ix = 0;
            boundary = start;
            laststart = start;
        }
    }

    if (laststart < l)
        lines.push(text.substr(laststart));

    return lines.join('\n');
}
module.exports = {
	splitLine: splitLine
};
