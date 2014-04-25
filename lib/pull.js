/*!
 * This file is part of EPM.
 *
 * please see the LICENSE
 */

module.exports = pull

var log = require("./log")
 , epm = require("./epm.js")
 , path = require("path")

function pull(ops, cb) {
  
  if (typeof ops === "function") {
    cb = ops
  }

  if (ops.remote === undefined) return cb && cb(new Error('Unknown remote'))

	var dir = ops.path || "."
  var repo = new epm.EpmRepo(dir, ops)

  repo.pull(ops, function(err, data){
    if (err) return cb && cb(err)

    return cb && cb(null)
  })

}
