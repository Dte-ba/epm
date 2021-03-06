/*!
 * This file is part of EPM.
 *
 * please see the LICENSE
 */

'use strict';

var sys = require('sys')
  , events = require('events')
  , path = require('path')
  , Datastore = require('nedb')
  ;

/**
 * 
 * Initialize a new customized Datastore instance in `dir`.
 *
 * @param {String} dir working directory
 * @param {Object} conf
 */
var Db = module.exports = function(dir) {
  var self = this;

  if(false === (self instanceof Db)) {
      return new Db();
  }

  if (dir === undefined || dir === '') {
    throw new Error('The param `dir` cann\'t be empty');
  }

  self.packages = new Datastore({ filename: path.join(dir, 'packages.db'), autoload: true });
  self.packages.ensureIndex({ fieldName: 'uid', unique: true });
  self.packages.ensureIndex({ fieldName: 'filename', unique: true });

  self.files = new Datastore({ filename: path.join(dir, 'files.db'), autoload: true });
  self.files.ensureIndex({ fieldName: 'filename' });
  
  // inherits
  events.EventEmitter.call(self);

  return self;
}

sys.inherits(Db, events.EventEmitter);