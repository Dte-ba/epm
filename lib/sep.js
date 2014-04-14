/*!
 * This file is part of EPM.
 *
 * please see the LICENSE
 */

var path = require('path')
  , AdmZip = require('adm-zip')
  , words = require("./utils/words")

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
