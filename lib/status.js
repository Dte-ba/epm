/*!
 * This file is part of EPM.
 *
 * please see the LICENSE
 */

var fs = require('fs')

module.exports = status

var log = require("./log")
 , epm = require("./epm.js")
 , path = require("path")
 , refresh = require("./refresh")
 , check = require("./check")

function status(ops, cb) {
  
  if (typeof ops === "function") {
    cb = ops
    ops = {}
  }

  var dir = ops.path || "."

  // resolve repo folder
  dir = path.resolve(dir)

  check.repo(dir, function(er){
    if (er) return cb && cb(er)

    refresh({ path: dir }, function(err, st){
      log.silly("status", st)
      cb && cb(null, "TODO: status")
    })

  })
  
}