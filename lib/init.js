/*!
 * This file is part of EPM.
 *
 * please see the LICENSE
 */

module.exports = init

var log = require("./log")
 , epm = require("./epm.js")

function init(dir, cb) {
  
  if (typeof dir === "function") {
    cb = dir
  }

  dir = dir || "."

  return cb && cb(null, "TODO: init")
}