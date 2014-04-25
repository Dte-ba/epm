/*!
 * This file is part of EPM.
 *
 * please see the LICENSE
 */

var puller = module.exports = {}

var log = require("../log")
 , async = require("async")
 , fs = require("graceful-fs")
 , path = require("path")
 , _ = require("underscore")
 , http = require ("http")
 , statusBar = require ("status-bar")

puller.pull = pull

function pull(repo, ops, cb) {

  if (typeof ops === "function") {
    cb = ops
    ops = {}
  }

  async.waterfall([
    
    function(fn){
      repo.fetch(ops, fn)
    },
    function(fn){
      var data = repo.file.getSync("remotes-file")
      var remote = data[ops.remote]

      if (remote === undefined) 
         return fn && fn(new Error('Unknown remote `' + ops.remote + '`'))

      remote.name = ops.remote

      // is fetched
      var rfilename = repo.file.resolve("remote-folder", ops.remote)

      if (!fs.existsSync(rfilename))
        return fn && fn(new Error('The remote `' + ops.remote + '` has not been fetched'))

      var rdata = repo.file.getSync("remote-folder", ops.remote, { json: true })
      remote.packages = {}
      rdata.forEach(function(p){
        remote.packages[p.uid] = p
      })

      fn && fn(null, remote)

    },
    function(remote, fn){
      __pull(repo, remote, ops, function(er, jobs){

        fn && fn(null, jobs)
      })
    },
    function(jobs, fn){
      __down(repo, jobs, ops, fn)
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


function __pull(repo, remote, ops, cb){

  log.pause()
  async.waterfall([
    
    function(fn){
      repo.metadata(ops, function(err, data){
        if (err) return fn && fn(err)
      
        fn && fn(null, data)
      })
    },
    function(metadata, fn){
      var data = {}
      metadata.forEach(function(p){
        data[p.uid] = p
      })
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

function __readRemote(repo, ops, cb){
  var rtes = repo.file.getSync("remotes-file")

  if (rtes[ops.remote] === undefined) 
    return cb && cb(new Error('Unknown remote `' + ops.remote + '`'))

  var obj = rtes[ops.remote]
  obj.name = ops.remote

  cb && cb(null, obj)
}

function __down(repo, jobs, ops, cb){

  __readRemote(repo, ops, function(err, remote){
    if (err) return cb && cb (err)

    // to download
    var tpmf = repo.file.resolve('tmp-folder')
    var objs = []

    // TODO: WARNING replacing file

    jobs.clone.forEach(function(uid){
      objs.push({
        type: 'clone',
        uid: uid,
        from: remote.url + '?file=' + uid,
        to: path.join(tpmf, uid + '.down'),
        replace: repo.resolve(uid + '.zip')
      })
    })

    jobs.update.forEach(function(uid){
      objs.push({
        type: 'update',
        uid: uid,
        from: remote.url + '?file=' + uid,
        to: path.join(tpmf, uid + '.down'),
        replace: repo.resolve(uid + '.zip')
      })
    })

    var tasks = objs.map(function(inf){
      return function(fn) {
        __downfile(repo, inf, true, fn)
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

function __downfile(repo, obj, progress, cb){
  if (typeof progress === "function") {
    cb = progress
    progress = false
  }

  var ws = fs.createWriteStream(obj.to)
  var speeds = []
  var starttime = (new Date().valueOf())
  var bar

  log.pause()
  http.get(obj.from, function (res){
    bar = statusBar.create ({ total: res.headers["content-length"] })
          .on("render", function (stats){
            process.stdout.write ("Receiving package: " + repo.engine.cutUid(obj.uid) + " " +
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
              'complete `' + repo.engine.cutUid(obj.uid) + 
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
      if (fs.existsSync(obj.to)){
        fs.unlinkSync(obj.to)  
      }
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