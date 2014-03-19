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

var _cfg = epm.config

function init(dir, cb) {
  
  if (typeof dir === "function") {
    cb = dir
  }

  dir = dir || "."

  var folder = path.resolve(path.join(dir, _cfg.root_path))

  mkdirp(folder, function (err) {
      if (err) cb && cb(err)
      
      log.pause()

      repo(folder, function(e, re){
        log.resume()

        if (err) cb && cb(e)

        var action = re ? "reinitialized" : "created"

        log.info('init', 'repository ' + action + ' at ' + folder)

        cb && cb(null)
      })

  })

}

function repo(dir, cb) {

  async.parallel([

    // main config file
    function (pcb){
      var f = path.resolve(path.join(dir, _cfg.paths.config))
      var r = fs.existsSync(f)

      if (!r) {
        fs.writeFileSync(f, JSON.stringify(_cfg.defaults.config))
      }

      pcb && pcb(null, r)
    },
    // files
    function (pcb){
      var p = path.resolve(path.join(dir, _cfg.paths.files.folder))
        , f = path.resolve(path.join(dir, _cfg.paths.files.file))
      var r = fs.existsSync(f)

      mkdirp(p, function (e) {
        if (!r) {
          fs.writeFileSync(f, JSON.stringify(_cfg.defaults.packages))
        }
        pcb && pcb(e, r)
      })
    },
    // data
    function (pcb){
      var p = path.resolve(path.join(dir, _cfg.paths.data.folder))
        , f = path.resolve(path.join(dir, _cfg.paths.data.words))
      var r = fs.existsSync(f)

      mkdirp(p, function (e) {
        if (!r) {
          fs.writeFileSync(f, JSON.stringify(_cfg.defaults.words))
        }

        pcb && pcb(e, r)
      })
    }

  ], function (err, results){
    if (err) cb && cb(perr)

    // reinitialized flags
    var r = (results[0] || results[1] || results[2])

    cb && cb(null, r)
  })

}