/*!
 * This file is part of EPM.
 *
 * please see the LICENSE
 */

var path = require('path')
  , AdmZip = require('adm-zip')

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
    cb && cb(err)
  }

  cb && cb(null, JSON.parse(metadata))
  
}