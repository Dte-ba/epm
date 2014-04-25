/*!
 * This file is part of EPM.
 *
 * please see the LICENSE
 */

module.exports = fetch

var log = require("./log")
  , epm = require("./epm.js")
  

function fetch(ops, cb) {
  
  if (typeof ops === "function") {
    cb = ops
  }

  var dir = ops.path || "."
  var repo = new epm.EpmRepo(dir, ops)

  repo.fetch(ops, function(err, data){
    if (err) return cb && cb(err)

    return cb && cb(null)
  })
 
}
