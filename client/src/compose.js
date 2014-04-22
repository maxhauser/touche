
function mixin(base, mixins) {
	base.mixedIn = base.hasOwnProperty('mixedIn') ? base.mixedIn : [];

	mixins.forEach(function(mixin) {
		if (base.mixedIn.indexOf(mixin) === -1) {
			mixin.call(base);
			base.mixedIn.push(mixin);
		}
	});
}

module.exports = {mixin: mixin};
