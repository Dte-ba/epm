/*!
 * This file is part of EPM.
 *
 * please see the LICENSE
 */

module.exports = remote

var log = require("./log")
 , epm = require("./epm.js")
 , path = require("path")
 
var _cfg = epm.config

var handlers = {
  "add": __add,
  "list": __list,
  "rm": __rm
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
  var repo = new epm.EpmRepo(ops.path)

  return handlers[cmd](repo, ops, cb)
}

function __add(repo, ops, fn) {

  repo.remote.add(ops, function(err){
    if (err) return fn && fn(err)

    log.info("remotes", "added `" + ops.url  + "` as `" + ops.name + "`")
  })
}

function __list(repo, ops, fn) {

  repo.remote.list(ops, function(err, remotes){
    if (err) return fn && fn(err)

    var names = Object.keys(remotes)

    names.forEach(function(rn){
      console.log(rn);
    })
  })

}

function __rm(ops, fn) {
  repo.remote.remove(ops, function(err, remotes){
    if (err) return fn && fn(err)
    log.info("remotes", "removed `" + ops.name + "`")
  })
}