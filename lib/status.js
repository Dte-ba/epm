/*!
 * This file is part of EPM.
 *
 * please see the LICENSE
 */

module.exports = status

var log = require("./log")
 , epm = require("./epm.js")

function status(ops, cb) {
  
  if (typeof ops === "function") {
    cb = ops
  }

  ops = ops || "."

  return cb && cb(null, "TODO: status")
}