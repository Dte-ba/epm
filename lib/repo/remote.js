/*!
 * This file is part of EPM.
 *
 * please see the LICENSE
 */
var fs = require("graceful-fs")
var remote = module.exports = {}

remote.list = function(repo, cb){
  var remotes = repo.file.getSync("remotes-file")

  return cb && cb(null, remotes)
}

remote.add = function(repo, ops, cb){
  var remotes = repo.file.getSync("remotes-file")

  var r = remotes[ops.name]

  if (r !== undefined) {
    return fn && fn(new Error("remote `" + ops.name + "` exists"))
  }

  var rn = remotes[ops.name] = {}

  rn.url = ops.url

  repo.file.setSync("remotes-file", remotes)
  return cb && cb(null, remotes)
}

remote.remove = function(repo, ops, cb){
  var remotes = repo.file.getSync("remotes-file")

  var r = remotes[ops.name]

  if (r === undefined) {
    return fn && fn(new Error("remote `" + ops.name + "` not exists"))
  }

  // dispose
  delete remotes[ops.name]
  var rfile = repo.file.resolve("remote-folder", ops.name)
  if (fs.existsSync(rfile)) {
    fs.unlinkSync(rfile)  
  }

  repo.file.setSync("remotes-file", remotes)

  return cb && cb(null, remotes)
}