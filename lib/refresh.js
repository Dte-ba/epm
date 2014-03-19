/*!
 * This file is part of EPM.
 *
 * please see the LICENSE
 */

module.exports = refresh

var log = require("./log")
 , epm = require("./epm.js")
 , fs = require("fs")
 , path = require("path")
 , io = require("./utils/io")
 , async = require("async")
 , checksum = require("checksum")

var _cfg = epm.config
var _ops = {}


function refresh(ops, cb) {
  var res = {};

  if (typeof ops === "function") {
    cb = ops
    ops = {}
  }

  var dir = ops.path || "."

  // resolve repo folder
  _ops.path = path.resolve(dir)

  // TODO: move this line to package engine
  _ops.pattern = epm.engine.filepattern

  // sync files information
  async.waterfall([
      
      // read file information
      // save the status
      syncFiles,

      // parse the files information
      // save the package info
      syncPackages

    ], function(err, res){
      if (err) cb && cb(err)

      cb && cb(null, res)
    })
}

//
// private functions

function syncFiles(cb) {
  var st = {}

  io.getFiles(_ops.path, _ops.pattern, function(err, files){
    
    files.forEach(function(f){
      var stat = fs.statSync(f)

      var s = st[path.basename(f)] = {}
      s.mtime = stat.mtime.valueOf()
      s.size = stat.size

    })

    cb && cb(null, st)
  })
  
}

// needs `syncFiles`
function syncPackages(st, cb) {

  var root = path.resolve(path.join(_ops.path, _cfg.root_path))
  var pkgFilename = path.join(root, _cfg.paths.files.packages)
  var pkgs = JSON.parse(fs.readFileSync(pkgFilename, 'utf-8'))

  var tasks = Object.keys(st).map(function(f){
    return function(fn) {
      var file = path.join(_ops.path, f)
      proccesFile({
        root: root,
        file: file, 
        pkgs: pkgs, 
        st: st
      }, fn)
    }
  })

  async.parallelLimit(tasks, 10, function(err, results){
    fs.writeFileSync(pkgFilename, JSON.stringify(pkgs))
    cb && cb(null, pkgs)
  })
  
}

function proccesFile(ops, fn) {
  var root = ops.root
  var file = ops.file
  var pkgs = ops.pkgs
  var st = ops.st
  // gets info to compare
  var current = st[path.basename(file)]
  var idx = Object.keys(pkgs).filter(function(p){
    return pkgs[p].filename == path.basename(file)
  })

  var uid = idx.length == 0 ? undefined : idx[0]
    
  compare(current, pkgs[uid], file, function(er, code){
    
    current.code = code

    // if the file has not changes
    // return the cached data if exists
    var dfile = path.join(root, _cfg.paths.data.folder, uid)

    if (code == 0 && fs.existsSync(dfile)) {
      return fn && fn(null, JSON.parse(fs.readFileSync(dfile, 'utf-8')))
    }

    epm.engine.readMetadata(file, function(err, meta){
      if (meta === undefined) {
        log.warn("engine", file + " is corrupted")
        return
      }

      var cf = path.basename(file)
      var p = pkgs[meta.uid] = (pkgs[meta.uid] || {})
      p.filename = path.basename(file)
      p.fstat = st[cf]
      p.build = meta.build || "1"

      checksum.file(file, function (err, sum) {
        p.checksum = sum
       
        fs.writeFile(path.join(root, _cfg.paths.data.folder, meta.uid), JSON.stringify(meta), function(err){
          fn && fn(null, meta)  
        })
      })
      
    })

  })

  
}

/**
 * Compare two package information objects
 * and returns:
 *    -1: new
 *     0: unchanges
 *     1: file has changes
 */
function compare(current, indexed, file, fn) {
  if (indexed == undefined) return fn && fn(null, -1)

  var cstats = current
  var istats = indexed

  var mtimeChange = cstats.mtime != istats.fstat.mtime
  var sizeChange = cstats.size != istats.fstat.size

  // if has changes, check the file with the checksum
  if (!mtimeChange && !sizeChange) return fn && fn(null, 0)

  checksum.file(file, function (err, sum) {
    var change = istats.checksum !== sum
    var code = change ? 1 : 0

    fn && fn(null, code)
  })
}