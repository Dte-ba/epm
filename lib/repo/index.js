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
  , eql = require("eql-engine")

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
  self.fetcher = require('./fetcher')
  self.puller = require('./puller')

  self.log = log;

  //
  var _remote = require('./remote')
  self.remote = {}
  self.remote.list = function(ops, cb){ 
    _remote.list(self, cb)
    return self
  }
  self.remote.add = function(ops, cb){ 
    _remote.add(self, ops, cb)
    return self
  }
  self.remote.remove = function(ops, cb){ 
    _remote.remove(self, ops, cb)
    return self
  }

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

  ops.force = ops.force === undefined ? false : ops.force

  async.waterfall([

      function(fn){
        self.filer.load(self, { pattern: self.engine.filepattern }, fn)
      },
      function(files, fn){
        // if not files change
        // not packages change?
        if (!ops.force && !filesChange(self.lastFiles, files)){
          
          log.verbose("cache", "no files changes")
          var pkgs = self.file.getSync("packages-file")

          // check if all are trackeds
          var non = _.some(Object.keys(pkgs.packages), function(uid){
            return !_.contains(Object.keys(files), pkgs.packages[uid].filename)
          })

          if (!non) return fn && fn(null, self.lastPkgs)
        }

        // save the files for server mode
        self.lastFiles = files

        self.manager.refresh(self, files, ops, function(err, pkgs){
          if (err) return fn && fn(err, pkgs)

          // DANGERUS
          // metadata file control
          Object.keys(pkgs.trackeds).forEach(function(uid){
            var obj = pkgs.trackeds[uid]

            if (!fs.existsSync(self.file.resolve("data-folder", uid))){
              log.verbose("manager", "recreating the metadata-cache for " + uid)

              self.engine.readMetadata(self.resolve(obj.filename), function(err, meta){
                
                if (err || meta === undefined) {
                  log.warn("engine", file + " is corrupted")

                  return fn && fn(null, { file: path.basename(file), hasError: true  })
                }

                self.file.setSync("data-folder", meta.uid, meta, {json: true})

              })
            }

          });
        
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
        self.load(ops, fn)
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
              return self.file.getSync("data-folder", uid, {json: true})
            }

          }

        })

        if (ops.filter !== undefined){
          
          try{
            var query = eql.parse(ops.filter)
            
            if (query !== undefined){
              
              var uf = Object.keys(res).filter(function(uid){
                return self.engine.isMatch(res[uid].meta, query)
              });

              var filtered = {}
              uf.forEach(function(uid){
                filtered[uid] = res[uid]
              });

              return cb && cb(null, filtered)
            }

          } catch(e){}
        }

        return cb && cb(null, res)
      }

    ], function(err, result){
      if (err) return cb && cb(err, result)

      return cb && cb(null, result)
  })
}

EpmRepo.prototype.metadata = function(ops, cb) {
  var self = this
  
  if (typeof ops === "function"){
    cb = ops
    ops = {}
  }

  async.waterfall([

      function(fn){
        self.load(ops, fn)
      },
      function(pkgs, fn){
        
        var res = []

        Object.keys(pkgs.trackeds).forEach(function(uid){
          var obj = {}
          var p = pkgs.trackeds[uid]

          obj.uid = uid
          obj.build = p.build
          obj.filename = p.filename
          obj.checksum = pkgs.files[p.filename].checksum
          res.push(obj)
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

  self.fetcher.fetch(self, ops, cb)

  return self
}

EpmRepo.prototype.pull = function(ops, cb) {
  var self = this

  if (typeof ops === "function"){
    cb = ops
    ops = {}
  }

  self.puller.pull(self, ops, cb)

  return self
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