/*!
 * This file is part of EPM.
 *
 * please see the LICENSE
 */

var log = require("../log")
 , fs = require("graceful-fs")
 , path = require("path")
 , io = require("../utils/io")
 , async = require("async")
 , checksum = require("checksum")
 , _ = require("underscore")

var filer = module.exports = {}

var TASK_LIMIT = process.env.ASYNC_LIMIT || 5

filer.load = load

function load(repo, ops, cb){

  if (typeof ops === "function"){
    cb = ops
    ops = {}
  }

  var tracked = repo.file.getSync("files-file")
  var fileCount = 0

  // clean tracked deleted files at last time
  var deleteds = Object.keys(tracked).filter(function(t){
    return tracked[t].code === -1
  })

  deleteds.forEach(function(f){
    delete tracked[f]
  })

  // get currents files
  io.getFiles(repo.path, ops.pattern, function(err, files){
    fileCount = files.length

    log.verbose("files", fileCount + " files on the repo")
    
    // currents filenames on repo
    var cFilenames = files.map(path.basename)

    // union trackeds files with
    // currents files on repo
    var all = _.union(Object.keys(tracked), cFilenames)

    // create the jobs
    // to gets each file status
    var tasks = all.map(function(filename){
      return function(fn) {
        fileStatus(
            tracked[filename]
          , filename
          , repo.path
          , function(err, status) {

            var s = tracked[filename]
              ,  res = {}

            res.filename = filename
            res.stats = {}
            if (status.stats) {
              res.stats.mtime = status.stats.mtime.valueOf()
              res.stats.size = status.stats.size
            }
            res.code = status.code
            res.checksum = s !== undefined ? s.checksum : undefined

            if (status.code !== 1) return fn && fn(null, res)

            checksum.file(repo.resolve(filename), function (err, sum) {
              if (err) return fn && fn(err)

              res.checksum = sum
              fn && fn(null, res)
            })
            
          }
        )
      }
    })

    log.pause()
    async.parallelLimit(tasks, TASK_LIMIT, function(err, results){
      if (err) return cb && cb(err)

      var files = {}
      results.forEach(function(r){
        var o = files[r.filename] = {}
        o.stats = r.stats
        o.code = r.code
        o.checksum = r.checksum
      })

      repo.file.setSync("files-file", files)
      log.resume()

      return cb && cb(null, files)
    })

  })
  
}

/**
 * Get the file status code
 *
 * and returns async on fn:
 *    -1: file deleted
 *     0: file unchange
 *     1: file added
 *     2: file has changes
 *
 * @param {Object} tStatus current file status
 * @param {String} filename
 * @param {String} dir file folder
 * @param {Function} fn callbacks
 *
 */
function fileStatus(tStatus, filename, dir, fn) {
  var fullname = path.join(dir, filename)

  // is a deleted file?
  if (!fs.existsSync(fullname)) return fn && fn(null, { stats: undefined, code: -1})

  // is a file added?
  if (tStatus == undefined) return fn && fn(null, { stats: fs.statSync(fullname), code: 1})

  var stat = fs.stat(fullname, function(err, stat){
    var mtimeChange = stat.mtime.valueOf() != tStatus.stats.mtime
    var sizeChange = stat.size != tStatus.stats.size

    // has changes ?
    if (!mtimeChange && !sizeChange) return fn && fn(null, { stats: stat, code: 0})

    // has really changes ?
    // check the file with the checksum
    checksum.file(fullname, function (err, sum) {

      var change = tStatus.checksum !== sum
      var code = change ? 2 : 0

      fn && fn(null, { stats: stat, code: code, checksum: sum})
    })
  })

}