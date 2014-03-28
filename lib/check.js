/*!
 * This file is part of EPM.
 *
 * please see the LICENSE
 */

var fs = require('fs')
  , epm = require('./epm')
  , path = require('path')
  , async = require('async')

module.exports = check = {}

var _cfg = epm.config

check.repo = function(dir, cb) {

	var root = path.join(dir, _cfg.root_path)

	// check the root file
	if (!fs.existsSync(root)) return cb && cb(new Error("Not a epm repository"))

	var files = [
		_cfg.file.resolve('config-file', root),
		_cfg.file.resolve('packages-file', root),
		_cfg.file.resolve('tags-file', root)
	]

	async.filter(files, fs.exists, function(results){
		var wrong = results.length !== files.length
	
		if (wrong) {
			return cb && cb(new Error("Corrupted repository"))			
		}

		cb && cb(null)
	})
}