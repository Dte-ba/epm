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
 , mkdirp = require('mkdirp')
 , async = require('async')
 , _ = require('underscore')
 , extend = require('extend')

var _cfg = epm.config

function init(ops, cb) {
  
  if (typeof ops === "function") {
    cb = ops
    ops = {}
  }

  dir = ops.path || "."
  name = ops.name || "main"

  var folder = path.resolve(path.join(dir, _cfg.root_path))

  mkdirp(folder, function (err) {
      if (err) cb && cb(err)
      
      log.pause()

      repo(folder, function(e, re){
        log.resume()

        if (err) cb && cb(e)

        if (!re) {
          _cfg.set(dir, "name", name)  
        } else {
          name = _cfg.get(dir, "name")  
        }
        
        var action = re ? "reinitialized" : "created"

        log.info('init', 'repository `' + name + '`' + action + ' at ' + folder)

        cb && cb(null)
      })

  })

}

//
// private

function repo(dir, cb) {

  var descriptors = _cfg.files

  var folders = Object.keys(descriptors).map(function(key){
    var f = descriptors[key]
    return f.dir
  })

  folders = _.uniq(folders.filter(function(f){ return f !== '/' && f !== './' }))

  folders = folders.map(function(f){
    return path.resolve(path.join(dir, f))
  })
  
  var filesdes = Object.keys(descriptors).filter(function(key){
    var f = descriptors[key]
    return f.type === "file"
  })

  var files = filesdes.map(function(key){
    return {
      name: key,
      filename: _cfg.file.relative(key),
      defaults:  _cfg.file.defaults(key)
    }
  })

  async.eachSeries(folders, mkdirp, function(err, results){
      
      var tasks = files.map(function(fd){
        return function(cb) {
          _make(_cfg.file.resolve(fd.name, dir, false), fd.defaults, cb)
        }
      })

      async.parallel(
          
          // make all files on parallel
          tasks

        , function (err, results){
            if (err) cb && cb(err)

            // reinitialized flags
            var r = (results[0] || results[1] || results[2])

            cb && cb(null, r)
      })

  })

}

function _make(f, def, cb) {
  if (fs.existsSync(f)){
    // extend
    return _makeExtend(f, def, cb)
  }

  _makeFirst(f, def, cb)
}

function _makeFirst(f, def, cb) {
  // write a file
  fs.writeFile(f, JSON.stringify(def), function(err){
    if (err) return cb && cb(err)

    cb && cb(null, false)        
  })
}

function _makeExtend(f, def, cb) {
  fs.readFile(f, 'utf-8', function(err, data){
    if (err) return cb && cb(err)

    try {
      var obj = JSON.parse(data)
      var ext = extend(true, obj, def)

      // write a file
      fs.writeFile(f, JSON.stringify(ext), function(err){
        if (err) return cb && cb(err)

        cb && cb(null, true)
      })
    } catch (ie) {
      log.warn('init', 'corrupted config file ' + f)
      log.error(ie)
      return _makeFirst(f, def, cb)
    }
    
  })
}