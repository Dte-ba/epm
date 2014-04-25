/*!
 * This file is part of EPM.
 *
 * please see the LICENSE
 */

module.exports = show

var log = require("./log")
 , epm = require("./epm.js")
 , path = require("path")
 , eql = require("eql-engine")

var handlers = {
  "meta": __meta,
  "all": __all,
  "exec": __exec
}

function show(cmd, ops, cb) {
  
  if (typeof ops === "function") {
    cb = ops
    ops = {}
  }

  // check the command
  if (!(/^(meta|all|exec)$/g).test(cmd)) {
    return cb && cb(new Error("Unknown command ", cmd))
  }

  ops.path = ops.path || "."

  ops.path = path.resolve(ops.path)

  var repo = new epm.EpmRepo(ops.path, ops)

  var caller = cmd === "meta" ? repo.metadata : repo.packages

  caller.apply(repo, [function(err, data){
    log.resume()
    if (err) return cb && cb(err)

    return handlers[cmd](ops, data, cb)
  }])

}

function __meta(ops, data, fn) {
  console.log(data)

  fn && fn(null)
}

function __all(ops, data, fn) {
	
	/*Object.keys(data).forEach(function(uid){
		console.log(" * " + epm.engine.cutUid(uid))
	})*/

	__send(data)

	fn && fn(null)
}

function __exec(ops, data, fn) {
	var matches = []

	var query = eql.parse(ops.query)

	Object.keys(data).forEach(function(uid){
		var p = data[uid]
		p.uid = uid
		if (epm.engine.isMatch(p.meta, query)) {
			matches.push(uid)
		}
	})

	matches.forEach(function(m){
		console.log(" * " + epm.engine.cutUid(m))
	})


	fn && fn(null, matches)
}

function __send(data) {
  var out = {}
  out.type = "show"
  out.body = data

  epm.response.send(out)
}