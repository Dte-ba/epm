/*!
 * This file is part of EPM.
 *
 * please see the LICENSE
 */

module.exports = status

var log = require("./log")
 , epm = require("./epm.js")
 , path = require("path")
 , refresh = require("./refresh")

function status(ops, cb) {
  
  if (typeof ops === "function") {
    cb = ops
    ops = {}
  }

  var dir = ops.path || "."

  // resolve repo folder
  dir = path.resolve(dir)

  refresh({ path: dir }, function(err){
    cb && cb(null, "TODO: status")
  })

}