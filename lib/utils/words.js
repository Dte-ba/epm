/*!
 * This file is part of EPM.
 *
 * please see the LICENSE
 */

/**
 * Module dependencies.
 */
var XRegExp = require('xregexp').XRegExp
  ;

// regular expression lib
var regexLib = {
	tagsSplit: /,\s*/ig,
	specialChars: [
		{ val:'a', regex: /[áàãâä]/g },
		{ val:'e', regex: /[éèêë]/g },
		{ val:'i', regex: /[íìîï]/g },
		{ val:'o', regex: /[óòõôö]/g },
		{ val:'u', regex: /[úùûü]/g },
		{ val:'n', regex: /[ñ]/g },
		{ val:'A', regex: /[ÁÀÃÂÄ]/g },
		{ val:'E', regex: /[ÉÈÊË]/g },
		{ val:'I', regex: /[ÍÌÎÏ]/g },
		{ val:'O', regex: /[ÓÒÕÔÖ]/g },
		{ val:'U', regex: /[ÚÙÛ]/g },
		{ val:'N', regex: /[Ñ]/g }
	]
};

/**
 * Expose functions
 */
exports.normalize = normalize;
exports.escape = escape;
exports.regexEscape = regexEscape;
exports.splitTags = splitTags;

/**
 * Normalize a `str` remove the initial and ending spaces
 * and convert duplicate spaces to a single space.
 *
 * @param {String} str
 */
function normalize(str) {
	return str
			.replace(/\s+/g, ' ')       //convert duplicate spaces
			.replace(/(^\s|\s$)/g, ''); //remove the initial and ending spaces
			
}

/**
 * Convert the `str` to lower cases and 
 * specials chars to a defined into specialChars.
 *
 */
function escape(str) {
	var low = normalize(str.toLowerCase());

	// TODO: optimize
	regexLib.specialChars.forEach(function(r){
		low = low.replace(r.regex, r.val);
	});

	return low;
}

/**
 * Convert the `str` to regular expression
 *
 */
function regexEscape(str) {
    return str.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&")
}

/**
 * Procces tags
 *
 */
function splitTags(str) {
	return str.split(regexLib.tagsSplit);
}