/*!
 * This file is part of EPM.
 *
 * please see the LICENSE
 */

module.exports = remote

var log = require("./log")
 , epm = require("./epm.js")
 , refresh = require("./refresh")
 , check = require("./check")
 , path = require("path")
 , fs = require("graceful-fs")
 
var _cfg = epm.config

var handlers = {
  "add": __add,
  "list": __list
}

function remote(cmd, ops, cb) {
  
  if (typeof ops === "function") {
    cb = ops
    ops = {}
  }

  // check the command
  if (!(/^(add|rm|list)$/g).test(cmd)) {
    return cb && cb(new Error("Unknown command ", cmd))
  }

  ops.path = ops.path || "."
  ops.path = path.resolve(ops.path)

  check.repo(ops.path, function(er){
    if (er) return cb && cb(er)
  
    return handlers[cmd](ops, cb)
  })
  
}

function __add(ops, fn) {

  __readRemotes(ops.path, function(err, remotes){
    if (err) return fn && fn(err)

    var r = remotes[ops.name]

    if (r !== undefined) {
      return fn && fn(new Error("remote `" + ops.name + "` exists"))
    }

    var rn = remotes[ops.name] = {}

    rn.url = ops.url

    __saveRemotes(ops.path, remotes, function(err, remotes){
      if (err) return fn && fn(err)
      log.info("remotes", "added `" + ops.url  + "` as `" + ops.name + "`")
      fn && fn(null, remotes)
    })

  })
}

function __list(ops, fn) {

  __readRemotes(ops.path, function(err, remotes){
    if (err) return cb && cb(err)

    var names = Object.keys(remotes)

    names.forEach(function(rn){
      console.log(rn);
    })

    fn && fn(null, names)
  })
}

//
// helpers 
function __readRemotes(dir, cb) {
  filename = _cfg.file.resolve("remotes-file", dir, true)
  fs.readFile(filename, 'utf-8', function(err, data){
    if (err) return cb && cb(err)

    cb && cb(null, JSON.parse(data))
  })
}

function __saveRemotes(dir, remotes, cb) {
  filename = _cfg.file.resolve("remotes-file", dir, true)

  fs.writeFile(filename, JSON.stringify(remotes), function(err){
    if (err) return cb && cb(err)

    cb && cb(null, remotes)
  })
}