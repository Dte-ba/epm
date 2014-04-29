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

function status(ops, cb) {
  
  if (typeof ops === "function") {
    cb = ops
    ops = {}
  }

  var dir = ops.path || "."

  // resolve repo folder
  //dir = path.resolve(dir)

  var repo = new epm.EpmRepo(dir, ops)

  repo.status(function(err, data){
    log.resume()
    if (err) return cb && cb(err)
    
    __send(data)
    
    cb && cb(null, data)
  })
  
}

function __send(st) {
  var out = {}
  out.type = "status"
  out.body = st

  epm.response.send(out)
}