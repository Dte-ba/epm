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

console.log(res)

      cb && cb(null)
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
      s.mtime = stat.mtime
      s.size = stat.size

    })

    cb && cb(null, st)
  })
  
}

// needs `syncFiles`
function syncPackages(st, cb) {

  var pkgFilename = path.resolve(path.join(_ops.path, _cfg.root_path, _cfg.paths.files.packages))
  var pkgs = JSON.parse(fs.readFileSync(pkgFilename, 'utf-8'))

  var tasks = Object.keys(st).map(function(f){
    return function(fn) {
      var file = path.join(_ops.path, f)

      epm.engine.readMetadata(file, function(err, meta){
        //console.log(meta)
        var cf = path.basename(file)
        var p = pkgs[meta.uid] = (pkgs[meta.uid] || {})
        p.fstat = st[cf]
        p.meta = meta

        fn && fn(null, meta)
      })
    }
  })

  async.parallelLimit(tasks, 10, function(err, results){
    fs.writeFileSync(pkgFilename, JSON.stringify(pkgs))
    cb && cb(null, pkgs)
  })
  
}
