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

      repo(folder, name, function(e, re){
        log.resume()

        if (err) cb && cb(e)

        var action = re ? "reinitialized" : "created"

        log.info('init', 'repository ' + action + ' at ' + folder)

        cb && cb(null)
      })

  })

}

function repo(dir, name, cb) {

  // TODO merge the files with non setted properties

  async.parallel([

    // main config file
    function (pcb){
      var f = path.resolve(path.join(dir, _cfg.paths.config))
      var r = fs.existsSync(f)

      if (!r) {
        var cfg = _cfg.defaults.config
        cfg.name = name
        fs.writeFileSync(f, JSON.stringify(cfg))
      }

      pcb && pcb(null, r)
    },
    // files
    function (pcb){
      var p = path.resolve(path.join(dir, _cfg.paths.files.folder))
        , pp = path.resolve(path.join(dir, _cfg.paths.files.packages))
        , pf = path.resolve(path.join(dir, _cfg.paths.files.files))

      var rp = fs.existsSync(pp)
      var rf = fs.existsSync(pf)

      mkdirp(p, function (e) {
        if (!rp) {
          fs.writeFileSync(pp, JSON.stringify(_cfg.defaults.packages))
        }

        if (!rf) {
          fs.writeFileSync(pf, JSON.stringify(_cfg.defaults.files))
        }

        pcb && pcb(e, (rp || rf))
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