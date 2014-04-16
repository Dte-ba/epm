/*!
 * This file is part of EPM.
 *
 * please see the LICENSE
 */

// set async parallel limit
process.env.ASYNC_LIMIT = 10

var path = require('path')
  , FileGateway = require('file-gateway')
  , mkdirp = require('mkdirp')
  , async = require('async')
  , SepEngine = require('../sep')
  , _ = require('underscore')
  , fs = require("graceful-fs")
  , log = require("../log")

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

  var fullpath = path.join(dir, ".epm")

  self.file = new FileGateway(fullpath)
  self.configure()

  if (fs.existsSync(fullpath)){
    var conf = self.file.getSync("config-file")
    self.name = conf.name
    // configure the engine
  }

  //
  self.engine = new SepEngine()

  self.filer = require('./filer')
  self.manager = require('./manager')

  return self
}

// overide toString
EpmRepo.prototype.toString = function() {
  return "[EpmRepo name=" + this.name + "]"
}

EpmRepo.prototype.resolve = function() {
  var self = this

  var fargs = Array.prototype.slice.call(arguments, 0);

  var tojoin = [self.path].concat(fargs)

  return path.join.apply(self, tojoin)
}


EpmRepo.prototype.configure = function() {
  var self = this

  self.file.config({
    process: true,
    cache: {
      expire: ((1000 * 60) * 10 ),
      length: 30
    },
    extend: true,
    encoding: 'utf-8'
  })

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

  if (typeof ops === "function"){
    cb = ops
    ops = {}
  }
  
  mkdirp(self.file.root, function(err){
    if (err) return cb && cb(err, null)

    self.file.init(true)

    return cb && cb(null)
  })

}

EpmRepo.prototype.load = function(ops, cb) {
  var self = this

  if (typeof ops === "function"){
    cb = ops
    ops = {}
  }

  async.waterfall([

      function(fn){
        self.filer.load(self, { pattern: self.engine.filepattern }, fn)
      },
      function(files, fn){
        // has not files change
        if (!filesChange(self.lastFiles, files)){
          
          log.verbose("cache", "no files changes")
          var pkgs = self.file.getSync("packages-file")

          // check if all are trackeds
          var non = _.some(Object.keys(pkgs.packages), function(uid){
            return !_.contains(Object.keys(files), pkgs.packages[uid].filename)
          })

          if (!non) return fn && fn(null, self.lastPkgs)
        }

        self.lastFiles = files


        self.manager.refresh(self, files, ops, function(err, pkgs){
          if (err) return fn && fn(err, pkgs)
        
          self.lastPkgs = pkgs

          return fn && fn(null, pkgs)
        })
      }

    ], function(err, result){
      if (err) return cb && cb(err, result)

      return cb && cb(null, result)
  })

}

EpmRepo.prototype.packages = function(ops, cb) {
  var self = this

  if (typeof ops === "function"){
    cb = ops
    ops = {}
  }

  async.waterfall([

      function(fn){
        self.load(fn)
      },
      function(pkgs, fn){
        
        var res = {}

        Object.keys(pkgs.trackeds).forEach(function(uid){
          res[uid] = pkgs.trackeds[uid]
        })

        Object.keys(res).forEach(function(uid){
          
          pk = res[uid]

          // hasn't metadata
          if (pk.meta === undefined) {
            // set metadata on demand
            pk.meta = function() {
              return self.file.getSync("data-folder", uid)
            }

          }

        })

        return cb && cb(null, res)
      }

    ], function(err, result){
      if (err) return cb && cb(err, result)

      return cb && cb(null, result)
  })

}

EpmRepo.prototype.status = function(ops, cb) {
  var self = this

  if (typeof ops === "function"){
    cb = ops
    ops = {}
  }

  self.load(ops, function(err, data){
    if (err) return cb && cb(err, data)

    return cb && cb(null, data)
  })
  
}

EpmRepo.prototype.fetch = function(ops, cb) {
  var self = this

  if (typeof ops === "function"){
    cb = ops
    ops = {}
  }

  self.load(ops, function(err, data){
    if (err) return cb && cb(err, data)

    return cb && cb(null, data)
  })
  
}

//
// private functions

function filesChange(lastet, currents){

  if (!lastet) 
    return true

  if (Object.keys(lastet).length !== Object.keys(currents).length)
    return true

  return _.some(Object.keys(lastet), function(file){
    if (currents[file] === undefined) 
      return true

    return lastet[file].checksum !== lastet[file].checksum
  })
}