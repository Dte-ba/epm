/*!
 * This file is part of EPM.
 *
 * please see the LICENSE
 */

'use strict';

var sys = require('sys')
  , events = require('events')
  , _ = require('underscore')
  , fs = require('graceful-fs')
  , url = require("url")
  , request = require("request")
  , async = require("async")
  ;

/**
 * 
 * Initialize a new EpmDownloader
 *
 * @param {Object} file
 * @param {FileGateway} href
 * @param {Object} ops
 */
var EpmDownloader = module.exports = function(file, fg, ops) {
  var self = this;

  if(false === (self instanceof EpmDownloader)) {
      return new EpmDownloader();
  }
  
  // inherits
  events.EventEmitter.call(self);

  self.file = file;
  self.fs = fg;

  return self;
}

sys.inherits(EpmDownloader, events.EventEmitter);