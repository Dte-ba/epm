/*!
 * This file is part of EPM.
 *
 * please see the LICENSE
 */


module.exports = pkgs

var log = require("./log")
 , epm = require("./epm.js")
 , refresh = require("./refresh")
 , path = require("path")

var _cfg = epm.config

function pkgs(ops, cb) {

	if (typeof ops === "function") {
    cb = ops
    ops = {}
  }

  ops.path = ops.path || "."

  ops.path = path.resolve(ops.path)

  refresh(ops, function(err, data){
    if (err) return cb && cb(err)
  
    return __parse(ops, data, cb)
  })

}

function __parse(ops, data, cb){
	var res = data.trackeds.packages

	Object.keys(res).forEach(function(uid){
		
		pk = res[uid]

		// hasn't metadata
		if (pk.meta === undefined) {
			// set metadata on demand
			var dfolder = _cfg.file.resolve("data-folder", ops.path, true)
    	var mfilename = path.join(dfolder, uid)

			pk.meta = function() {
				var dfile = mfilename	
      	var data = require("graceful-fs").readFileSync(dfile, 'utf-8')
				return JSON.parse(data)
			}

		}

	})

	cb && cb(null, res)
}