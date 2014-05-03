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
  , puller = require("./puller.js")
  ;

/**
 * 
 * Initialize a new EpmPull
 *
 * @param {FileGateway} fg
 * @param {Object} ops
 */
var EpmPull = module.exports = function(repo, remote, ops) {
  var self = this;

  if(false === (self instanceof EpmPull)) {
      return new EpmPull();
  }
    
  ops = ops || {};
  ops = ops.resolveFunction;

  // inherits
  events.EventEmitter.call(self);

  self.fs = repo.fs;
  self.repo = repo;

  // define _remote
  Object.defineProperty(self, '_remote', {
    get: function() {
        return remote;
    }
  });

  return self;
}

sys.inherits(EpmPull, events.EventEmitter);

/**
 * 
 * Pull `remote` repository
 *
 * @param {String} name
 */
EpmPull.prototype.remote = function(name, filter) {
  var self = this;

  if (!self._remote.existsSync(name)) {
    throw new Error("remote `" + name + "` not exists")
  }

  var repo = self._remote.getSync(name);
  var fet = new fetcher(repo, self.fs);

  return new puller(self.repo, fet, { filter: filter });
}
