/*!
 * This file is part of EPM.
 *
 * please see the LICENSE
 */

var path = require('path')
  , FileGateway = require('file-gateway')
  , mkdirp = require('mkdirp')


/**
 * EPM repository
 * 
 * Initialize a new EpmRepo.
 *
 * @param {String} dir
 * @param {Object} ops
 */
var EpmRepo = module.exports = function(dir, ops) {
  var self = this

  if(false === (self instanceof EpmRepo)) {
    return new EpmRepo()
  }

  ops = ops || {}
  self.name = ops.name || "main"

  // configure file gateway
  self.path = dir

  self.file = new FileGateway(path.join(dir, ".epm"))
  self.file.config({
    process: true,
    cache: {
      expire: ((1000 * 60) * 10 ),
      length: 30
    },
    extend: true,
    encoding: 'utf-8'
  })

  self.configure()

  return self
}

// overide toString
EpmRepo.prototype.toString = function() {
  return "[EpmRepo name=" + this.name + "]"
}

EpmRepo.prototype.configure = function() {
  var self = this

  // set files
  self.file.add([
    { 
      key: "config-file",
      mode: "dynamic", type: "file", name: "CONFIG", json: true,
      defaults: { engine: "sep", name: self.name }
    },
    { 
      key: "packages-file",
      mode: "dynamic", type: "file", name: "files/PACKAGES", json: true,
      defaults: { packages: {}, files: {} }
    },
    { 
      key: "files-file",
      mode: "dynamic", type: "file", name: "files/FILES", json: true,
      defaults: {}
    },
    { 
      key: "tags-file",
      mode: "dynamic", type: "file", name: "cache/TAGS", json: true,
      defaults: {}
    },
    { 
      key: "remotes-file",
      mode: "dynamic", type: "file", name: "REMOTES", json: true,
      defaults: {}
    },
    { key: "cache-folder", mode: "cache", type: "folder", name: "cache" },
    { key: "tmp-folder", mode: "temp", type: "folder", name: "tmp" },
    { key: "data-folder", mode: "cache", type: "folder", name: "cache/data" },
    { key: "remote-folder", mode: "dynamic", type: "folder", name: "remote" }
  ])

  return self
}

EpmRepo.prototype.init = function(ops, cb) {
  var self = this

  if (typeof ops === "function") {
    cb = ops
    ops = {}
  }

  mkdirp(self.file.root, function(err){
    if (err) return cb && cb(err)
    self.file.init(true)
    cb && cb(null)
  })

  return self
}