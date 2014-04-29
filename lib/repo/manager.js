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

var manager = module.exports = {}

var TASK_LIMIT = process.env.ASYNC_LIMIT || 5

manager.refresh = refresh

function refresh(repo, files, ops, cb){

  if (typeof ops === "function"){
    cb = ops
    ops = {}
  }

  var trackeds = repo.file.getSync("packages-file")

  // files to untrack
  var deleteds = Object.keys(files).filter(function(t){
    return files[t].code === -1
  })

  log.verbose("files", deleteds.length + " for delete")

  // to refresh information
  var toProcess = Object.keys(files).filter(function(t){
    var has = Object.keys(trackeds.packages).filter(function(uid){
      return _.contains(Object.keys(files), trackeds.packages[uid].filename)
    })
    return has.length === 0 || (files[t].code === 1 || files[t].code === 2)
  })

  log.verbose("files", toProcess.length + " to procces")
  
  if (deleteds.length > 0) {
    var tags = repo.file.getSync("tags-file")

    // delete de packages
    deleteds.forEach(function(filename){
      var uid = trackeds.files[filename]
      delete trackeds.packages[uid]
      delete trackeds.files[filename]
      delete tags[uid]

      var fdata = repo.file.resolve("data-folder", uid)
      if (fs.existsSync(fdata)){
        fs.unlinkSync(fdata)  // remove file
      }
      
      log.verbose("files", filename + " untracked")
    })

    repo.file.setSync("tags-file", tags)
  }

  // untrack package if file not exists
  var missing = Object.keys(trackeds.packages).filter(function(uid){
    return files[trackeds.packages[uid].filename] === undefined
  })

  if (missing.length > 0){
    log.verbose("files", missing.length + " missing")
    missing.forEach(function(uid){
      delete trackeds.packages[uid]
      delete tags[uid]

      var fdata = repo.file.resolve("data-folder", uid)
      if (fs.existsSync(fdata)){
        fs.unlinkSync(fdata)  // remove file
      }
      
      log.verbose("files", uid + " untracked (file missing)")
    })  
    repo.file.setSync("tags-file", tags)
  }

    // procces packages jobs
  var tasks = toProcess.map(function(f){
    return function(fn) {
      var file = repo.resolve(f)
      proccesFile(
          repo
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
      if (r.hasError === true){
        return
      }
      pkgs.files[r.filename] = r.uid
      pkgs.packages[r.uid] = {
       build: r.build,
       filename: r.filename
      }
    })
    
    // save packages information
    repo.file.setSync("packages-file", pkgs)
    
    var tags = {}
    results.forEach(function(r){
      if (r.hasError === true){ return }

      tags[r.uid] = repo.engine.getTags(r.meta)
    })

    // save TAGS
    repo.file.setSync("tags-file", tags)

    // create keys for uid
    var currents = {}
    results.forEach(function(r){
      if (r.hasError === true){ return }
      currents[r.uid] = r
    })

    var errors = results.filter(function(r){ return r.hasError })

    var res = {}
    Object.keys(pkgs.packages).forEach(function(uid){
      res[uid] = {}
      res[uid].uid = uid
      res[uid].filename = pkgs.packages[uid].filename
      res[uid].build = pkgs.packages[uid].build
    })
    
    // set the added metadata to the next step
    Object.keys(currents).forEach(function(uid){
      if (res[uid] === undefined){ return }
      res[uid].meta = currents[uid].meta
    })
    
    log.resume()

    return cb && cb(null, { trackeds: res, files: files, errors: errors })
  })

}

function proccesFile(repo, file, pkgs, status, fn) {
  // here comes added files and changes files
  var res = {}
  log.pause()
  
  repo.engine.readMetadata(file, function(err, meta){
    log.resume()
    if (err || meta === undefined) {
      log.warn("engine", file + " is corrupted")

      return fn && fn(null, { file: path.basename(file), hasError: true  })
    }
    
    res.filename = path.basename(file)
    res.uid = meta.uid
    res.build = meta.build == undefined ? 1 : parseInt(meta.build)
    res.meta = meta

    // write metadata to easy acces
    var fdata = repo.file.resolve("data-folder", meta.uid)

    repo.file.setSync("data-folder", meta.uid, meta, {json: true})

    log.verbose("pkgs", repo.engine.cutUid(meta.uid) + " change or added")
    fn && fn(null, res)
   
  })

}
