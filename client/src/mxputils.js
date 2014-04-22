function removeQuotes(text) {
    return text.replace(/^(['"])(.*)\1$/, '$2');
}

function attribsToObject(attribs) {
    var o = {};
    for (var i = 0, l = attribs.length; i < l; i++) {
        var attrib = attribs[i];

        if (attrib[0] === "'" || attrib[0] === '"') {
            o[i] = removeQuotes(attrib);
        } else {
            var p = attrib.indexOf('=');
            if (p === -1) {
                o[attrib] = true;
                o[i] = attrib;
            } else {
                o[attrib.substr(0, p).toLowerCase()] = removeQuotes(attrib.substr(p + 1));
            }
        }
    }
    return o;
}

function parseAttributeList(text) {
    var i = 0;

    // skip whitespaces
    var skipws = function() {
        while (/\s/.test(text[i])) i++;
    };

    var getstringoruntil = function(re) {
        var start = i,
            end;
        if (text[i] === '"' || text[i] === "'") {
            quote = text[i];
            start++;
            i++;
            while (text[i] !== quote && text[i] !== undefined)
                i++;
            end = i;
            i++;
        } else {
            while (text[i] !== undefined && !re.test(text[i]))
                i++;
            end = i;
        }
        return text.substring(start, end);
    };

    // begin of attribute
    var ix = 0;
    var att = {};
    while (text[i] !== undefined) {
        skipws();
        // when quote - go until next quote
        var first = getstringoruntil(/[\s=]/);
        if (text[i] === '=') {
            i++;
            att[first] = getstringoruntil(/\s/);
        } else {
            att[ix] = first;
            att[first] = true;
        }
        ix++;
    }

    return att;
}

module.exports = {
    attribsToObject: attribsToObject,
    parseAttributeList: parseAttributeList
};