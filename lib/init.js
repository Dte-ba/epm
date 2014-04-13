/*!
 * This file is part of EPM.
 *
 * please see the LICENSE
 */

module.exports = init

var log = require("./log")
 , epm = require("./epm.js")
 , path = require('path')
 , fs = require('fs')

var _cfg = epm.config

function init(ops, cb) {
  
  if (typeof ops === "function") {
    cb = ops
    ops = {}
  }

  dir = ops.path || "."
  name = ops.name || "main"

  var repo = new epm.EpmRepo(dir, ops)
  var fulldir = path.resolve(path.join(dir, _cfg.root_path))
  var re = fs.existsSync(fulldir)

  log.pause()
  repo.init(function(err){
    log.resume()

    if (err) return cb && cb(e)
    
    var action = re ? "reinitialized" : "created"
    log.info('init', 'repository `' + name + '`' + action + ' at ' + fulldir)

    cb && cb(null)
  })

}
