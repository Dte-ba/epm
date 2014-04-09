/*!
 * This file is part of EPM.
 *
 * please see the LICENSE
 */

module.exports = pull

var log = require("./log")
 , epm = require("./epm.js")
 , pkgs = require("./pkgs")
 , fetch = require("./fetch")
 , async = require("async")
 , fs = require("graceful-fs")
 , path = require("path")
 , _ = require("underscore")
 , http = require ("http")
 , statusBar = require ("status-bar")

var _cfg = epm.config

function pull(ops, cb) {
  
  if (typeof ops === "function") {
    cb = ops
  }

  ops.path = ops.path || "."

  if (ops.remote === undefined) return cb && cb(new Error('Unknown remote'))

	log.verbose('pull', 'checking repository')
  log.pause()

  async.waterfall([
  	
  	function(fn){
  		check.repo(ops.path, fn)
  	},
    function(fn){
      fetch(ops, fn)
    },
  	function(fn){
  		var rf = _cfg.file.resolve("remotes-file", ops.path, true)

			fs.readFile(rf, 'utf-8', function(err, data){
				if (err) return fn && fn(err)

				var remote = JSON.parse(data)[ops.remote]

				if (remote === undefined) 
					 return fn && fn(new Error('Unknown remote `' + ops.remote + '`'))

				remote.name = ops.remote

				// is fetched
				var rf = _cfg.file.resolve("remote-folder", ops.path, true)
				var rfilename = path.join(rf, ops.remote + '.json')

				if (!fs.existsSync(rfilename))
					return fn && fn(new Error('The remote `' + ops.remote + '` has not been fetched'))

				remote.packages = JSON.parse(fs.readFileSync(rfilename, 'utf-8'))

				fn && fn(null, remote)

			})
  	},
  	function(remote, fn){
  		__pull(remote, ops, function(er, jobs){

  			fn && fn(null, jobs)

  		})
  	},
    function(jobs, fn){
      __down(jobs, ops, fn)
    },
    function(objs, fn){
      __sync(objs, ops, fn)
    }

	], function(err, jobs){
		log.resume()
		if (err) return cb && cb(err)

		return cb && cb(null)	
  })

}

function __pull(remote, ops, cb){

	log.pause()
	async.waterfall([
		
		function(fn){
  		pkgs(ops, function(err, data){
		    if (err) return fn && fn(err)
		  
		    fn && fn(null, data)
		  })
  	},
  	function(data, fn){

  		var locals = Object.keys(data);
  		var remotes = Object.keys(remote.packages)

  		var diff = _.difference(remotes, locals)

  		log.verbose('pull', diff.length + ' packages to clone')

  		var intersect = _.intersection(locals, remotes)
  		var updates = []

  		if (intersect.length > 0) {
  			intersect.forEach(function(uid){
  				var lp = data[uid]
  				var rp = remote.packages[uid]
  				if (parseInt(lp.build) < parseInt(rp.build)){
  					updates.push(uid)
  				}
  			})
  		}

  		log.verbose('pull', updates.length + ' packages to update')
  		var jobs = {
  			clone: diff,
  			update: updates
  		}
  		
  		fn && fn(null, jobs)
  	}

	], function(err, result){
		log.resume()
		if (err) return cb && cb(err)

		return cb && cb(null, result)	
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

function __down(jobs, ops, cb){

  __readRemote(ops, function(err, remote){
    if (err) return cb && cb (err)

    // to download
    var tpmf = _cfg.file.resolve('tmp-folder', ops.path, true)
    var objs = []

    // TODO: WARNING replacing file

    jobs.clone.forEach(function(uid){
      objs.push({
        type: 'clone',
        uid: uid,
        from: remote.url + '?file=' + uid,
        to: path.join(tpmf, uid + '.down'),
        replace: path.join(ops.path, uid + '.zip')
      })
    })

    jobs.update.forEach(function(uid){
      objs.push({
        type: 'update',
        uid: uid,
        from: remote.url + '?file=' + uid,
        to: path.join(tpmf, uid + '.down'),
        replace: path.join(ops.path, uid + '.zip')
      })
    })

    var tasks = objs.map(function(inf){
      return function(fn) {
        __downfile(inf, true, fn)
      }
    })
    
    async.series(
      tasks,
      function(err, results){
        
        if (err) return cb && cb(err)
        
        //console.log(results)

        cb && cb(null, results)
      })
    
  })

}

function __downfile(obj, progress, cb){
  if (typeof progress === "function") {
    cb = progress
    progress = false
  }

  var ws = fs.createWriteStream(obj.to)
  var speeds = []
  var starttime = (new Date().valueOf())

  log.pause()
  http.get(obj.from, function (res){
    bar = statusBar.create ({ total: res.headers["content-length"] })
          .on("render", function (stats){
            process.stdout.write ("Receiving package: " + epm.engine.cutUid(obj.uid) + " " +
                this.format.percentage (stats.percentage).trim () +
                " (" + stats.currentSize + "/" + stats.totalSize + "), " +
                this.format.storage (stats.currentSize).trim () + " | " +
                this.format.speed (stats.speed).trim ())
            process.stdout.cursorTo (0)
            speeds.push(stats.speed)
          })
          .on("finish", function(){
            // clean line
            var endtime = (new Date().valueOf()) - starttime

            process.stdout.cursorTo(0)
            for (var i = process.stdout.columns - 1; i >= 0; i--) {
              process.stdout.write(' ')
            }
            process.stdout.cursorTo (0)

            var sum = 0
            for (var i = speeds.length - 1; i >= 0; i--) {
              sum += speeds[i]
            }

            log.resume()
            log.verbose('down', 
              'complete `' + epm.engine.cutUid(obj.uid) + 
              '` in ' + parseTime(endtime)  
              // ' | ' + bar.format.speed(sum/speeds.length)
            )

            ws.close()
            cb && cb(null, obj)

          })

      res.pipe(ws)
      res.pipe(bar)
    })
  .on ("error", function (err){
      if (bar) bar.cancel()
      log.resume()
      fs.unlink(to)
      cb && cb(err)
  })

}

function __sync(objs, ops, cb){
  
  objs.forEach(function(obj){
    try{

      fs.renameSync(obj.to, obj.replace)
      
    } catch(err) {
      log.error(err)
      return cb && cb(err)
    }
    
  })

  return cb && cb(null)
}

function parseTime(time){
  if (time < 1000) return time + " ms"

  if ((time/1000) < 60) return (time/1000) + " s"

  if ( ((time/1000) / 60) < 60) return ((time/1000) / 60) + " m"

  return ((time/1000) / 60 * 2) + " hs"
}