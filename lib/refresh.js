/*!
 * This file is part of EPM.
 *
 * please see the LICENSE
 */

module.exports = refresh

var log = require("./log")
 , epm = require("./epm.js")
 , fs = require("graceful-fs")
 , path = require("path")
 , io = require("./utils/io")
 , async = require("async")
 , checksum = require("checksum")
 , _ = require("underscore")
 , check = require("./check")

var _cfg = epm.config
var _ops = {}
var TASK_LIMIT = 5

function refresh(ops, cb) {
  var res = {};

  if (typeof ops === "function") {
    cb = ops
    ops = {}
  }

  _ops.path = ops.path || "."

  // resolve repo folder
  _ops.path = path.resolve(_ops.path)

  log.verbose("core", "cheking the repo")
  
  check.repo(_ops.path, function(er){
    if (er) return cb && cb(er)
    log.verbose("core", "refresh the repo ...")

    // TODO: move this line to package engine
    _ops.pattern = epm.engine.filepattern

    // sync files information
    async.waterfall([
        
        // read file information
        // save the status
          syncFiles

        // parse the files information
        // save the package info
        , syncPackages

        // control the cached metadata
        , syncCache

      ], function(err, res){
        if (err) cb && cb(err)

        cb && cb(null, res)
      })

  })
 
}

//
// private functions

function syncFiles(cb) {
  var fFilename = _cfg.file.resolve("files-file", _ops.path, true)
  var tracked = JSON.parse(fs.readFileSync(fFilename, 'utf-8'))
  var fileCount = 0
  
  // clean tracked deleted files at last time
  var deleteds = Object.keys(tracked).filter(function(t){
    return tracked[t].code === -1
  })

  deleteds.forEach(function(f){
    delete tracked[f]
  })

  // get currents files
  io.getFiles(_ops.path, _ops.pattern, function(err, files){
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
          , _ops.path
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

            checksum.file(path.join(_ops.path, filename), function (err, sum) {
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
      var files = {}
      results.forEach(function(r){
        var o = files[r.filename] = {}
        o.stats = r.stats
        o.code = r.code
        o.checksum = r.checksum
      })

      fs.writeFileSync(fFilename, JSON.stringify(files, null, 2))
      log.resume()
      cb && cb(null, files)
    })

  })
  
}

// needs `syncFiles`
function syncPackages(files, cb) {

  var root = path.resolve(path.join(_ops.path, _cfg.root_path))
  var pkgFilename = _cfg.file.resolve("packages-file", _ops.path, true)
  var trackeds = JSON.parse(fs.readFileSync(pkgFilename, 'utf-8'))

  // files to untrack
  var deleteds = Object.keys(files).filter(function(t){
    return files[t].code === -1
  })

  log.verbose("files", deleteds.length + " for delete")

  // to refresh information
  var toProcess = Object.keys(files).filter(function(t){
    return (files[t].code === 1 || files[t].code === 2)
  })

  log.verbose("files", toProcess.length + " to procces")
  
  if (deleteds.length > 0) {
    var tagsFilename = _cfg.file.resolve("tags-file", _ops.path, true)
    var tags = JSON.parse(fs.readFileSync(tagsFilename, 'utf-8'))

    // delete de packages
    deleteds.forEach(function(filename){
      var uid = trackeds.files[filename]
      delete trackeds.packages[uid]
      delete trackeds.files[filename]
      delete tags[uid]
      var dfolder = _cfg.file.resolve("data-folder", _ops.path, true)
      var fdata = path.join(dfolder, uid)
      fs.unlinkSync(fdata); // remove file
      
      log.verbose("files", filename + " untracked")
    })

    fs.writeFileSync(tagsFilename, JSON.stringify(tags, null, 2))
  }

    // procces packages jobs
  var tasks = toProcess.map(function(f){
    return function(fn) {
      var file = path.join(_ops.path, f)
      proccesFile(
          root
        , file
        , trackeds
        , trackeds[f]
        , fn
      )
    }
  })

  log.pause()
  async.parallelLimit(tasks, TASK_LIMIT, function(err, results){

    var pkgs = trackeds

    // refresh packages information
    results.forEach(function(r){
      pkgs.files[r.filename] = r.uid
      pkgs.packages[r.uid] = {
       build: r.build
      }
    })

    // save the information
    fs.writeFileSync(pkgFilename, JSON.stringify(pkgs, null, 2))

    // save TAGS
    var tagsFilename = _cfg.file.resolve("tags-file", _ops.path, true)
    var tags = JSON.parse(fs.readFileSync(tagsFilename, 'utf-8'))

    results.forEach(function(r){
      tags[r.uid] = epm.engine.getTags(r.meta)
    })

    fs.writeFileSync(tagsFilename, JSON.stringify(tags, null, 2))

    // create keys for uid
    var currents = {}
    results.forEach(function(r){
      currents[r.uid] = r
    })

    // set the added metadata to the next step
    Object.keys(currents).forEach(function(uid){
      pkgs.packages[uid].meta = currents[uid].meta
    })
    
    log.resume()
    cb && cb(null, { trackeds: pkgs, files: files })
  })

}

function proccesFile(root, file, pkgs, status, fn) {
  // here comes added files and changes files
  var res = {}
  log.pause()
  log.verbose('core', 'proccesing file ' + file)
  epm.engine.readMetadata(file, function(err, meta){
    log.resume()
    if (err) return fn && fn(err)

    if (meta === undefined) {
      log.warn("engine", file + " is corrupted")
      return
    }
    
    res.filename = path.basename(file)
    res.uid = meta.uid
    res.build = meta.build == undefined ? 1 : parseInt(meta.build)
    res.meta = meta

    // write metadata to easy acces
    var dfolder = _cfg.file.resolve("data-folder", root)
    var fdata = path.join(dfolder, meta.uid)

    log.pause()
    fs.writeFile(fdata, JSON.stringify(meta), function(err){
      log.resume()
      if (err) return fn && fn(err)
      log.verbose("pkgs", epm.engine.cutUid(meta.uid) + " change or added")
      fn && fn(null, res)
    })
    
  })

}

function syncCache(data, cb){
  var pks = data.trackeds.packages

  var tasks = []

  Object.keys(pks).forEach(function(uid){
      pk = pks[uid]

      var dfolder = _cfg.file.resolve("data-folder", _ops.path, true)
      var mfilename = path.join(dfolder, uid)

      // if the metedata file is not cached
      // add to tasks
      if (fs.existsSync(mfilename)) return

      var pFilename

      Object.keys(data.trackeds.files).forEach(function(f){
        if (data.trackeds.files[f] === uid) {
          pFilename = f
        }
      })

      var pFile = path.join(_ops.path, pFilename)

      var f = function(fn) {
        
        epm.engine.readMetadata(pFile, function(err, meta){
          if (err) fn && fn(err)

          fs.writeFile(mfilename, JSON.stringify(meta), function(err){
            log.verbose('cache', 'caching missing meta-file for ' + epm.engine.cutUid(uid))
            pk.meta = meta
            fn && fn(null)
          })

        })
      }
      // add function to tasks
      tasks.push(f)

  })

  log.pause()
  async.parallelLimit(tasks, TASK_LIMIT, function(err, results){
    log.resume()
    if (err) cb && cb(err)

    cb && cb(null, data)
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