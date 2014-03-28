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

var _cfg = epm.config

function init(dir, name, cb) {
  
  if (typeof name === "function") {
    cb = name
    name = undefined
  } if (typeof dir === "function") {
    cb = dir
    dir = undefined
    name = undefined
  }

  dir = dir || "."
  name = name || "main"

  var folder = path.resolve(path.join(dir, _cfg.root_path))

  mkdirp(folder, function (err) {
      if (err) cb && cb(err)
      
      log.pause()

      repo(folder, function(e, re){
        log.resume()

        if (err) cb && cb(e)

        _cfg.set(dir, "name", name)

        var action = re ? "reinitialized" : "created"

        log.info('init', 'repository ' + action + ' at ' + folder)

        cb && cb(null)
      })

  })

}

//
// private

function repo(dir, cb) {

  // TODO merge the files with non setted properties

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
          _make(_cfg.file.resolve(fd.name, dir, false), JSON.stringify(fd.defaults), cb)
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
  
  var c = fs.existsSync(f)
  if (!c){
    fs.writeFile(f, def, function(err){
      if (err) return cb && cb(err)

      cb && cb(null, c)        
    })
    return 
  } 

  cb && cb(null, true)
}
