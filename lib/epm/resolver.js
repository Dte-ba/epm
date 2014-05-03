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
  , querystring = require("querystring")
  , mapper = require("./mapper.js")
  ;

/**
 * 
 * Initialize a new EpmResolver
 *
 * @param {FileGateway} fg
 * @param {Object} remote
 * @param {Object} ops
 */
var EpmResolver = module.exports = function(repo) {
  var self = this;

  if(false === (self instanceof EpmResolver)) {
      return new EpmResolver();
  }
  
  // inherits
  events.EventEmitter.call(self);

  self.repo = repo;

  return self;
}

sys.inherits(EpmResolver, events.EventEmitter);

/**
 * 
 * Resolve a server `req`
 *
 * @param {Object} req
 */
EpmResolver.prototype.request = function(req) {
  var self = this;
  
  var purl = url.parse(req.url)
  var query = querystring.parse(purl.query)

  if (Object.keys(query).length === 0)
    return self.metadataRequested();

  /*if (query.filter !== undefined)
    return __packages(reponame, req, res, query.filter)

  if (query.file !== undefined)
    return __file(reponame, query.file, req, res)

  if (query.asset !== undefined){
    if (query.uid !== undefined){
      return __asset(reponame, query.uid,query.asset, req, res)
    }
  }*/

  self.emit('error', new Error('Unknown request'));
  
  return self;
}

/**
 * 
 * Resolve a server `req`
 *
 * @param {Object} req
 */
EpmResolver.prototype.metadataRequested = function() {
  var self = this;

  var meta = [];

  var pkgs = self.repo.fs.getSync('packages-file');
  var files = self.repo.fs.getSync('files-file');

  mapper.metadata(pkgs, files, function(err, results){
    if (err){
      self.emit('error', err);
      return;
    }
    self.emit('complete', {type: 'json', data: results});
  });

  return self;
}
