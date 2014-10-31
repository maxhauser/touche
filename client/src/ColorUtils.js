
var validcolors = [
'#F0DAA1',
'#FFFFFE',
'#FFF6DF',
'#B19449',
'#644B0A',

'#B5D891',
'#FEFEFE',
'#E3F2D4',
'#719F42',
'#325A09',

'#D28DA6',
'#FEFEFE',
'#EFD1DC',
'#9B4060',
'#580925',

'#767CA5',
'#FDFDFD',
'#C0C3D7',
'#3C437A',
'#0F1545' ];

var wp = { X: 0.95047, Y: 1.0000, Z: 1.08883 }; // D65

var tmin = Math.pow(6/29, 3);
var tfac = Math.pow(29/6, 2) / 3;
var tadd = 4 / 29;

function f(t) {
	return t > tmin ? Math.pow(t, 1/3) : ((tfac * t) + tadd);
}

function rgbtolab(c) {
	var X = (c.r * 0.412543) + (c.g * 0.357580) + (c.b * 0.180423),
		Y = (c.r * 0.212671) + (c.g * 0.715160) + (c.b * 0.072169),
		Z = (c.r * 0.019334) + (c.g * 0.119193) + (c.b * 0.950227);

	var fYt = f(Y/wp.Y);
	return {
		L: (116 * fYt) - 16,
		a: 500 * (f(X/wp.X) - fYt),
		b: 200 * (fYt - f(Z/wp.Z))
	};
}

var rgbre = /^\s*rgb\((\d+),(\d+).(\d+)\)\s*$/;

function hextorgb(s) {
	var fa = 1.5;
	if (s[0] === '#') {
		return {
			r: Math.pow(parseInt(s.substr(1,2), 16) / 255.0, fa),
			g: Math.pow(parseInt(s.substr(3,2), 16) / 255.0, fa),
			b: Math.pow(parseInt(s.substr(5,2), 16) / 255.0, fa)
		};
	}

	var m = rgbre.exec(s);
	return {
		r: Math.pow(m[1] / 255.0, fa),
		g: Math.pow(m[2] / 255.0, fa),
		b: Math.pow(m[3] / 255.0, fa)
	};
}

function hextolab(s) {
	return rgbtolab(hextorgb(s));
}

var validlab = [];
validcolors.forEach(function(c) {
	validlab.push(hextolab(c));
});

var mapcache = {};

function nearest(c) {
	var n = mapcache[c];
	if (n)
		return n;

	var lab = hextolab(c);
	var min, mini;
	for (var i = 0, l = validlab.length; i < l; i++) {
		var v = validlab[i];
		var dL = v.L - lab.L, da = v.a - lab.a, db = v.b - lab.b;
		var d = (dL*dL) + (da*da) + (db*db);
		if (i === 0 || min > d) {
			mini = i;
			min = d;
		}
	}

	n = validcolors[mini];
	mapcache[c] = n;
	return n;
}

module.exports = {
	mapColor: nearest
};
