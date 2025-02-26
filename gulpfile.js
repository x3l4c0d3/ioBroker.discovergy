'use strict';

var gulp      = require('gulp');
var fs        = require('fs');
var pkg       = require('./package.json');
var iopackage = require('./io-package.json');
var version   = (pkg && pkg.version) ? pkg.version : iopackage.common.version;
/*var appName   = getAppName();

function getAppName() {
	var parts = __dirname.replace(/\\/g, '/').split('/');
	return parts[parts.length - 1].split('.')[0].toLowerCase();
}
*/
const fileName = 'words.js';
var languages =  {
	en: {},
	de: {},
	ru: {},
	pt: {},
	nl: {},
	fr: {},
	it: {},
	es: {},
	pl: {}
};

function lang2data(lang, isFlat) {
	var str = isFlat ? '' : '{\n';
	var count = 0;
	for (var w in lang) {
		if (lang.hasOwnProperty(w)) {
			count++;
			if (isFlat) {
				str += (lang[w] === '' ? (isFlat[w] || w) : lang[w]) + '\n';
			} else {
				var key = '  "' + w.replace(/"/g, '\\"') + '": ';
				str += key + '"' + lang[w].replace(/"/g, '\\"') + '",\n';
			}
		}
	}
	if (!count) return isFlat ? '' : '{\n}';
	if (isFlat) {
		return str;
	} else {
		return str.substring(0, str.length - 2) + '\n}';
	}
}

function readWordJs(src) {
	try {
		var words;
		if (fs.existsSync(src + 'js/' + fileName)) {
			words = fs.readFileSync(src + 'js/' + fileName).toString();
		} else {
			words = fs.readFileSync(src + fileName).toString();
		}

		var lines = words.split(/\r\n|\r|\n/g);
		var i = 0;
		while (!lines[i].match(/^systemDictionary = {/)) {
			i++;
		}
		lines.splice(0, i);

		// remove last empty lines
		i = lines.length - 1;
		while (!lines[i]) {
			i--;
		}
		if (i < lines.length - 1) {
			lines.splice(i + 1);
		}

		lines[0] = lines[0].replace('systemDictionary = ', '');
		lines[lines.length - 1] = lines[lines.length - 1].trim().replace(/};$/, '}');
		words = lines.join('\n');
		var resultFunc = new Function('return ' + words + ';');

		return resultFunc();
	} catch (e) {
		return null;
	}
}
function padRight(text, totalLength) {
	return text + (text.length < totalLength ? new Array(totalLength - text.length).join(' ') : '');
}
function writeWordJs(data, src) {
	var text = '';
	text += '/*global systemDictionary:true */\n';
	text += '\'use strict\';\n\n';
	text += 'systemDictionary = {\n';
	for (var word in data) {
		if (data.hasOwnProperty(word)) {
			text += '    ' + padRight('"' + word.replace(/"/g, '\\"') + '": {', 50);
			var line = '';
			for (var lang in data[word]) {
				if (data[word].hasOwnProperty(lang)) {
					line += '"' + lang + '": "' + padRight(data[word][lang].replace(/"/g, '\\"') + '",', 50) + ' ';
				}
			}
			if (line) {
				line = line.trim();
				line = line.substring(0, line.length - 1);
			}
			text += line + '},\n';
		}
	}
	text += '};';
	if (fs.existsSync(src + 'js/' + fileName)) {
		fs.writeFileSync(src + 'js/' + fileName, text);
	} else {
		fs.writeFileSync(src + '' + fileName, text);
	}
}

const EMPTY = '';

function words2languages(src) {
	var langs = Object.assign({}, languages);
	var data = readWordJs(src);
	if (data) {
		for (var word in data) {
			if (data.hasOwnProperty(word)) {
				for (var lang in data[word]) {
					if (data[word].hasOwnProperty(lang)) {
						langs[lang][word] = data[word][lang];
						//  pre-fill all other languages
						for (var j in langs) {
							if (langs.hasOwnProperty(j)) {
								langs[j][word] = langs[j][word] || EMPTY;
							}
						}
					}
				}
			}
		}
		if (!fs.existsSync(src + 'i18n/')) {
			fs.mkdirSync(src + 'i18n/');
		}
		for (var l in langs) {
			if (!langs.hasOwnProperty(l)) continue;
			var keys = Object.keys(langs[l]);
			keys.sort();
			var obj = {};
			for (var k = 0; k < keys.length; k++) {
				obj[keys[k]] = langs[l][keys[k]];
			}
			if (!fs.existsSync(src + 'i18n/' + l)) {
				fs.mkdirSync(src + 'i18n/' + l);
			}

			fs.writeFileSync(src + 'i18n/' + l + '/translations.json', lang2data(obj));
		}
	} else {
		console.error('Cannot read or parse ' + fileName);
	}
}
function words2languagesFlat(src) {
	var langs = Object.assign({}, languages);
	var data = readWordJs(src);
	if (data) {
		for (var word in data) {
			if (data.hasOwnProperty(word)) {
				for (var lang in data[word]) {
					if (data[word].hasOwnProperty(lang)) {
						langs[lang][word] = data[word][lang];
						//  pre-fill all other languages
						for (var j in langs) {
							if (langs.hasOwnProperty(j)) {
								langs[j][word] = langs[j][word] || EMPTY;
							}
						}
					}
				}
			}
		}
		var keys = Object.keys(langs.en);
		keys.sort();
		for (var l in langs) {
			if (!langs.hasOwnProperty(l)) continue;
			var obj = {};
			for (var k = 0; k < keys.length; k++) {
				obj[keys[k]] = langs[l][keys[k]];
			}
			langs[l] = obj;
		}
		if (!fs.existsSync(src + 'i18n/')) {
			fs.mkdirSync(src + 'i18n/');
		}
		for (var ll in langs) {
			if (!langs.hasOwnProperty(ll)) continue;
			if (!fs.existsSync(src + 'i18n/' + ll)) {
				fs.mkdirSync(src + 'i18n/' + ll);
			}

			fs.writeFileSync(src + 'i18n/' + ll + '/flat.txt', lang2data(langs[ll], langs.en));
		}
		fs.writeFileSync(src + 'i18n/flat.txt', keys.join('\n'));
	} else {
		console.error('Cannot read or parse ' + fileName);
	}
}
function languagesFlat2words(src) {
	var dirs = fs.readdirSync(src + 'i18n/');
	var langs = {};
	var bigOne = {};
	var order = Object.keys(languages);
	dirs.sort(function (a, b) {
		var posA = order.indexOf(a);
		var posB = order.indexOf(b);
		if (posA === -1 && posB === -1) {
			if (a > b) return 1;
			if (a < b) return -1;
			return 0;
		} else if (posA === -1) {
			return -1;
		} else if (posB === -1) {
			return 1;
		} else {
			if (posA > posB) return 1;
			if (posA < posB) return -1;
			return 0;
		}
	});
	var keys = fs.readFileSync(src + 'i18n/flat.txt').toString().split('\n');

	for (var l = 0; l < dirs.length; l++) {
		if (dirs[l] === 'flat.txt') continue;
		var lang = dirs[l];
		var values = fs.readFileSync(src + 'i18n/' + lang + '/flat.txt').toString().split('\n');
		langs[lang] = {};
		keys.forEach(function (word, i) {
			langs[lang][word] = values[i];
		});

		var words = langs[lang];
		for (var word in words) {
			if (words.hasOwnProperty(word)) {
				bigOne[word] = bigOne[word] || {};
				if (words[word] !== EMPTY) {
					bigOne[word][lang] = words[word];
				}
			}
		}
	}
	// read actual words.js
	var aWords = readWordJs();

	var temporaryIgnore = ['pt', 'fr', 'nl', 'flat.txt'];
	if (aWords) {
		// Merge words together
		for (var w in aWords) {
			if (aWords.hasOwnProperty(w)) {
				if (!bigOne[w]) {
					console.warn('Take from actual words.js: ' + w);
					bigOne[w] = aWords[w]
				}
				dirs.forEach(function (lang) {
					if (temporaryIgnore.indexOf(lang) !== -1) return;
					if (!bigOne[w][lang]) {
						console.warn('Missing "' + lang + '": ' + w);
					}
				});
			}
		}

	}

	writeWordJs(bigOne, src);
}
function languages2words(src) {
	var dirs = fs.readdirSync(src + 'i18n/');
	var langs = {};
	var bigOne = {};
	var order = Object.keys(languages);
	dirs.sort(function (a, b) {
		var posA = order.indexOf(a);
		var posB = order.indexOf(b);
		if (posA === -1 && posB === -1) {
			if (a > b) return 1;
			if (a < b) return -1;
			return 0;
		} else if (posA === -1) {
			return -1;
		} else if (posB === -1) {
			return 1;
		} else {
			if (posA > posB) return 1;
			if (posA < posB) return -1;
			return 0;
		}
	});
	for (var l = 0; l < dirs.length; l++) {
		if (dirs[l] === 'flat.txt') continue;
		var lang = dirs[l];
		langs[lang] = fs.readFileSync(src + 'i18n/' + lang + '/translations.json').toString();
		langs[lang] = JSON.parse(langs[lang]);
		var words = langs[lang];
		for (var word in words) {
			if (words.hasOwnProperty(word)) {
				bigOne[word] = bigOne[word] || {};
				if (words[word] !== EMPTY) {
					bigOne[word][lang] = words[word];
				}
			}
		}
	}
	// read actual words.js
	var aWords = readWordJs();

	var temporaryIgnore = ['pt', 'fr', 'nl', 'it'];
	if (aWords) {
		// Merge words together
		for (var w in aWords) {
			if (aWords.hasOwnProperty(w)) {
				if (!bigOne[w]) {
					console.warn('Take from actual words.js: ' + w);
					bigOne[w] = aWords[w]
				}
				dirs.forEach(function (lang) {
					if (temporaryIgnore.indexOf(lang) !== -1) return;
					if (!bigOne[w][lang]) {
						console.warn('Missing "' + lang + '": ' + w);
					}
				});
			}
		}

	}

	writeWordJs(bigOne, src);
}

gulp.task('adminWords2languages', function (done) {
	words2languages('./admin/');
	done();
});

gulp.task('adminWords2languagesFlat', function (done) {
	words2languagesFlat('./admin/');
	done();
});

gulp.task('adminLanguagesFlat2words', function (done) {
	languagesFlat2words('./admin/');
	done();
});

gulp.task('adminLanguages2words', function (done) {
	languages2words('./admin/');
	done();
});