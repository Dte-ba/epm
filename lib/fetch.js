/*!
 * This file is part of EPM.
 *
 * please see the LICENSE
 */

module.exports = fetch

var log = require("./log")
  , fs = require("graceful-fs")
  , epm = require("./epm.js")
  , check = require("./check")
  , url = require("url")
  , async = require("async")
  , request = require("request")
  , path = require("path")

var _cfg = epm.config

function fetch(ops, cb) {
  
  if (typeof ops === "function") {
    cb = ops
  }

  ops.path = ops.path || "."

  if (ops.remote === undefined) 
  	return cb && cb(new Error('Unknown remote'))

  log.verbose('fetch', 'checking repository')
  log.pause()

  async.waterfall([
  	
  	function(cb){
  		check.repo(ops.path, cb)
  	},
  	function(cb){
  		__readRemote(ops, cb)
  	},
  	function(remote, cb){
  		__fetch(remote, ops, cb)
  	}

	], function(err){
		log.resume()
		if (err) return cb && cb(err)

		return cb && cb(null)	
  })
 
}

function __readRemote(ops, cb){
	var rf = _cfg.file.resolve("remotes-file", ops.path, true)
	fs.readFile(rf, 'utf-8', function(err, data){
		if (err) return cb && cb (err)

		var rtes = JSON.parse(data)

		if (rtes[ops.remote] === undefined) 
			return cb && cb(new Error('Unknown remote `' + ops.remote + '`'))

		var obj = rtes[ops.remote]
		obj.name = ops.remote

		cb && cb(null, obj)
	})
}

function __fetch(remote, ops, cb){
	var uri = url.parse(remote.url)

	var isUrl = (uri.slashes === true && uri.protocol !== undefined)

	// is a url
	if (isUrl){
		return __fetchExternal(uri, remote, ops, cb)
	}

	return __fetchLocal(uri, remote, ops, cb)

}

function __fetchExternal(uri, remote, ops, cb){
	

	var servUri = uri.href.substring(0, uri.href.lastIndexOf('/') + 1)
	
	async.waterfall([
		function(cb){
			log.verbose('fetch', 'fetching ...')
			log.pause()

			request(servUri, function (err, res, body) {
				log.resume()
				if (err) return cb && cb(err)

				if (res.statusCode == 200) {
					var info = JSON.parse(body)

					if (info.type !== 'epm')
						return cb && cb(new Error('`' + servUri + '` is not a EPM repository'))

					log.verbose('fetch', 'finded EPM repository ' + info.version + ' at `' + servUri + '`')

					cb && cb(null, info)
				} // TODO: do something with diferent code

			})

		},
		function(info, cb){
			log.verbose('fetch', 'fetching ' + remote.name + ' ...')
			log.pause()

			request(uri.href, function (err, res, body) {
				log.resume()

				if (res.statusCode == 200) {
					var pkgs = JSON.parse(body)
					log.verbose('fetch', 'finded ' + Object.keys(pkgs).length + ' packages')

					cb && cb(null, pkgs)
				}
			})

		}
	], function(err, result){
		if (err) return cb && cb(err)
		
		var rfolder = _cfg.file.resolve('remote-folder', ops.path, true)
		var rfilename = path.resolve(path.join(rfolder, remote.name + '.json'))

		fs.writeFile(rfilename, JSON.stringify(result, null, 2), function(er){
			if (er) return cb && cb(er)

			cb && cb(null)
		})
		
	})
	
}

function __fetchLocal(uri, remote, ops, cb){
	log.verbose('fetch', 'fetching local')
	cb && cb(null)
}