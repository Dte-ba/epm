/*!
 * This file is part of EPM.
 *
 * please see the LICENSE
 */

'use strict';

var sys = require('sys')
  , events = require('events')
  , watch = require('watch')
  ;

/**
 * 
 * Initialize a new Explorer instance for `dir` with `ops`.
 *
 * @param {String} dir
 * @param {EpmFiles} ef FileGateway
 * @param {Object} ops
 */
var Explorer = module.exports function(dir, ef, ops) {
  var self = this;

  if(false === (this instanceof Explorer)) {
      return new Explorer();
  }
  
  // inherits
  events.EventEmitter.call(this);

  return self;
}

sys.inherits(Explorer, events.EventEmitter);

/**
 * 
 * Configure epm files and directories
 *
 * @param {Boolean} w watch
 */
EpmFiles.prototype.read = function(w) {
  var self = this;

  w = w === undefined ? false : w;

  return self
};