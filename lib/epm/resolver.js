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
  , path = require("path")
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

  if (query.file !== undefined)
    return self.fileRequested(query.file, req)

  /*if (query.filter !== undefined)
    return __packages(reponame, req, res, query.filter)

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

/**
 * 
 * Resolve a server `req`
 *
 * @param {Object} req
 */
EpmResolver.prototype.fileRequested = function(uid) {
  var self = this;

  var pkgs = self.repo.fs.getSync('packages-file');
  var file = pkgs.packages[uid].filename;

  if (file === undefined){
    self.emit('error', new Error('Unknown requested file for ' + uid ));
    return self;
  }

  var filename = self.repo.resolve(file);

  var stats = fs.statSync(filename);

  self.emit('complete', {type: 'file', filename: filename, stats: stats, attached: uid + path.extname(filename) });

  return self;
}


/*

Extracted from te old server.js

function __packages(reponame, req, res, filter) {
  
  var repo = _repos[reponame]

  if (repo === undefined) {
    log.error("Doesn't matches for " + reponame)
    return writeError("Repository doesn't exists", res, 404)
  }

  repo.packages({ filter: filter}, function(err, data){
    if (err) return writeError(err, res)
    
    var result = []

    Object.keys(data).forEach(function(uid){
      var obj = {}
      var p = data[uid]

      obj.uid = uid
      obj.build = p.build
      obj.filename = p.filename
      //obj.checksum = pkgs.files[p.filename].checksum
      result.push(obj)
    })

    res.setHeader('Content-Type', 'application/json')
    res.writeHead(200)
    res.end(JSON.stringify(result))

    log.verbose("serv", "response writed")
  })
  

function __asset(reponame, uid, asset, req, res) {
  var repo = _repos[reponame]

  if (repo === undefined) {
    log.error("Doesn't matches for " + reponame)
    return writeError("Repository doesn't exists", res, 404)
  }

  repo.packages(function(err, data){
    if (err) return writeError(err, res)
        
    var p = data[uid]

    if (p === undefined){
      log.error("Doesn't matches for " + uid)
      return writeError("Packages `" + uid + "` doesn't exists", res, 404)
    }

    repo.engine.asset(repo, p, asset, res, function(err){
      if (err) return writeError(err, res)

      log.verbose("serv", "asset resolved " + asset)  
    })
    
  })
}

*/