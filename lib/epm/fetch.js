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
  , fetcher = require("./fetcher.js")
  ;

/**
 * 
 * Initialize a new EpmFetch
 *
 * @param {FileGateway} fg
 * @param {Object} ops
 */
var EpmFetch = module.exports = function(fg, remote, ops) {
  var self = this;

  if(false === (self instanceof EpmFetch)) {
      return new EpmFetch();
  }
  
  // inherits
  events.EventEmitter.call(self);

  self.fs = fg;

  // define _remote
  Object.defineProperty(self, '_remote', {
    get: function() {
        return remote;
    }
  });

  return self;
}

sys.inherits(EpmFetch, events.EventEmitter);


/**
 * 
 * Fetch `remote` repository
 *
 * @param {String} name
 */
EpmFetch.prototype.remote = function(name) {
  var self = this;

  if (!self._remote.existsSync(name)) {
    throw new Error("remote `" + name + "` not exists")
  }

  var repo = self._remote.getSync(name);

  return new fetcher(repo, self.fs);
}