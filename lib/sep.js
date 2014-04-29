/*!
 * This file is part of EPM.
 *
 * please see the LICENSE
 */

var fs = require('graceful-fs')
  , path = require('path')
  , AdmZip = require('adm-zip')
  , words = require("./utils/words")
  , mkdirp = require("mkdirp")
  , mime = require("mime")

/**
 * Simple Package Engine
 * 
 * Initialize a new SepEngine.
 *
 * @param {Object} repo
 */
var SepEngine = module.exports = function() {
  var self = this

  if(false === (self instanceof SepEngine)) {
    return new SepEngine()
  }

  self.filepattern = /^[a-zA-Z0-9]+\.(zip|rar|tar|tar.gz)$/i

  return self
}


SepEngine.prototype.readMetadata = function(filename, cb) {
  var self = this
  var metadata = undefined
  try {

    var zip = new AdmZip(path.resolve(filename))
    var metadata = zip.readAsText('package.json');

    if (metadata === undefined) throw new Error("metadata undefined")

  } catch (err) {
    return cb && cb(err)
  }

  cb && cb(null, JSON.parse(metadata))
  
}


SepEngine.prototype.cutUid = function(uid){
  return uid.substring(0, 7) + ".." + uid.substring(uid.length-7)
}

SepEngine.prototype.getTags = function(metadata){
  if (   metadata === undefined 
      || metadata.content === undefined 
      || metadata.content.tags === undefined) return []
    
  return words.splitTags(metadata.content.tags)
}

SepEngine.prototype.isMatch = function(metadata, query){
  var meta = metadata
    , res = false
  
  if (typeof metadata === "function") {
    meta = metadata()
  }

  query.filters.forEach(function(f){
    if (f.key === "area") {
      res = meta.content.area == f.value
    }
  })

  return res
}

SepEngine.prototype.asset = function(repo, info, asset, res, cb){
  var self = this

  var key = info.uid + '-' + info.build
  var cf = repo.file.resolve('cache-folder', key)

  var meta = info.meta

  if (typeof info.meta === "function"){
    meta = info.meta()
  }

  var aFilename = self.resolveAsset(meta, asset)

  if (aFilename === undefined){
    cb && cb(new Error('Unknown asset ' + asset))
    return self
  }

  var full = repo.file.resolve('cache-folder', key, aFilename)

  if (fs.existsSync(full)) {
    writeFile(res, full)
    cb && cb(null)
    return self
  }

  mkdirp(cf, function(err){
    if (err) return cb && cb(err)

    var zip = new AdmZip(repo.resolve(info.filename))
    zip.extractAllTo(cf, true);

    writeFile(res, full)

    cb && cb(null)
  })

  return self
}

SepEngine.prototype.resolveAsset = function(metadata, asset){
  var self = this

  // image?
  if (asset.match(/(front|content)/ig)){
    var a = metadata.content.images.filter(function(i){
      return i.type === asset.toLowerCase()
    })

    if (a.length === 0) return undefined

    return a[0].src
  }

  return undefined
}


function writeFile(res, filename){
  var stat = fs.statSync(filename);

  res.writeHead(200, {
        'Content-Type': mime.lookup(filename),
        'Content-Length': stat.size,
        'Content-disposition': 'attachment; filename=' + path.basename(filename)
  })

  var rs = fs.createReadStream(filename)

  rs.pipe(res)
}