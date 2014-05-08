/*!
 * This file is part of EPM.
 *
 * please see the LICENSE
 */

var fs = require('fs')
  , path = require('path')
  , AdmZip = require('adm-zip')
  , wordsUtils = require("./utils/words")
  , mkdirp = require("mkdirp")
  , mime = require("mime")
  , _ = require("underscore")

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

  var zip = new AdmZip(path.resolve(filename))
  zip.readAsTextAsync('package.json', function(metadata){
    
    //if (err) return cb && cb(err);

    if (metadata === undefined || metadata === "") {
      return cb && cb(new Error("metadata undefined"));
    }

    cb && cb(null, JSON.parse(metadata));

  });
  
}


SepEngine.prototype.cutUid = function(uid){
  return uid.substring(0, 7) + ".." + uid.substring(uid.length-7)
}

SepEngine.prototype.getTags = function(metadata){
  if (   metadata === undefined 
      || metadata.content === undefined 
      || metadata.content.tags === undefined) return []
    
  return wordsUtils.splitTags(metadata.content.tags)
}

SepEngine.prototype.isMatch = function(metadata, query){
  var self = this;

  var meta = metadata
    , res

  var where = _.clone(query.where);

  var prev;

  while (where !== undefined){
    //console.info(where);
    var pred = _.clone(where.predicate);

    var curr = self.isMatchPredicate(pred, metadata)

    if (res === undefined){
      res = curr
    } else if (prev === 'and'){
      res = res && curr;
      
      //if (curr === false) return false;

    } else {
      res = res || curr;
    }

    if (where.and !== undefined) {
      prev = 'and'
    } else {
      prev = 'or'
    }

    if (where.and !== undefined) {
      where = _.clone(where.and);
    } else if (where.or !== undefined) {
      where = _.clone(where.or);
    } else {
      where = undefined;
    }
  }

  return res
}

SepEngine.prototype.isMatchPredicate = function(predicate, metadata) {
  var self = this;

  try {
    var key = predicate.key.toLowerCase();

    if (key.match(/(uid|id)/gi)){
      return compareScape(
          predicate,
          metadata.uid
        );
    } else if (key.match(/(area|axis|block|title)/gi)){

      return compareScape(
          predicate,
          metadata.content[key]
        );
      
    } else if (key === 'tag'){
      var tags = wordsUtils.splitTags(metadata.content.tags);
      
      if (tags.length === 0) return false;

      return _.any(tags.map(function(t){
        return compareScape(predicate, t);
      }));
    }

  } catch(err){
    console.error(err);
    return false;
  }
}

function compareScape(predicate, text){
  var ps = wordsUtils.escape(predicate.value);
  var pv = wordsUtils.escape(text);

  if (pv === undefined || pv === '') return false;
  //console.log("'%s' '%s' '%s'", ps, predicate.operator, pv);
  switch(predicate.operator){
    
    case '!=': return ps !== pv;

    case 'contains': return pv.indexOf(ps) !== -1;

    case '=':
      default: return ps === pv;
  }
}

SepEngine.prototype.asset = function(repo, info, meta, asset, cb){
  var self = this

  var key = info.uid + '-' + info.build
  var cf = repo.fs.resolve('cache-folder', key)

  var aFilename = self.resolveAsset(meta, asset)

  if (aFilename === undefined){
    cb && cb(new Error('Unknown asset ' + asset))
    return self
  }

  var full = repo.fs.resolve('cache-folder', key, aFilename)

  if (fs.existsSync(full)) {
    cb && cb(null, full)
    return self
  }

  mkdirp(cf, function(err){
    if (err) return cb && cb(err)

    var zip = new AdmZip(repo.resolve(info.filename))
    zip.extractAllTo(cf, true);

    cb && cb(null, full)
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