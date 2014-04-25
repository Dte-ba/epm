/*!
 * This file is part of EPM.
 *
 * please see the LICENSE
 */

module.exports = serve

var log = require("./log")
 , epm = require("./epm.js")
 , path = require('path')
 , server = require('./repo/server')


var _dir
var _server
var _cfg = epm.config

function serve(ops, cb) {
  
  if (typeof ops === "function") {
    cb = ops
    ops = {}
  }

  ops.port = ops.port || 3220
  ops.path = ops.path || "."

  _dir = path.resolve(ops.path )

  server
  .createServer(ops)
  .listen(ops.port, function(err) {
    if (err) return cb && cb(err)

    log.info("serve", "serving `" + ops.path + "` repos at http://127.0.0.1:" + ops.port)
    epm.serving = true
  })
  
}