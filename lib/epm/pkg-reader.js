/*!
 * This file is part of EPM.
 *
 * please see the LICENSE
 */

'use strict';

var sys = require('sys')
  , events = require('events')
  , path = require('path')
  ;

/**
 * 
 * Initialize a new PkgReader instance for `repo` with `ops`.
 *
 * @param {Epm} repo
 * @param {Object} ops
 */
var PkgReader = module.exports = function(filename, engine) {
  var self = this;

  if(false === (self instanceof PkgReader)) {
      return new PkgReader();
  }

  self.filename = filename;
  self.engine = engine;

  // inherits
  events.EventEmitter.call(self);
}

sys.inherits(PkgReader, events.EventEmitter);

PkgReader.prototype.read = function() {
  var self = this;
  
  self
    .engine
    .readMetadata(self.filename)
    .fail(function(err){
      self.emit('error', new Error(self.filename + " is corrupted"));
    })
    .done(function(meta){
      var res = {};

      res.filename = path.basename(self.filename);
      res.uid = meta.uid;
      res.build = meta.build == undefined ? 1 : parseInt(meta.build);
      res.meta = meta;

      self.emit('read', res);

    });

  return self;
}