
var Api = require('../Api');

var audio = new Audio();
audio.autoplay = true;

Api.fn.playMusic = function(url, volume, single) {
	audio.src = url;
	audio.loop = !single;
	audio.volume = volume || 0.5;
	audio.load();
	audio.play();
};

Api.fn.playSound = function(url, volume) {
	var audio = new Audio(url);
	audio.volume = volume || 1.0;
	audio.play();
};

Api.fn.stopMusic = function(channel) {
	audio.pause();
};
