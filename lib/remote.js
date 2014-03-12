/*!
 * This file is part of EPM.
 *
 * please see the LICENSE
 */

module.exports = remote

var log = require("./log")
 , epm = require("./epm.js")

function remote(ops, cb) {
  
  if (typeof ops === "function") {
    cb = ops
  }

  ops = ops || "."

  return cb && cb(null, "TODO: remote")
}