/*!
 * This file is part of EPM.
 *
 * please see the LICENSE
 */

'use strict';

var sys = require('sys')
  , events = require('events')
  , async = require('async')
  , _ = require('underscore')
  , Q = require('q')
  , eql = require("eql-engine")
  , path = require("path")
  , fs = require("graceful-fs")
  , mapper = require("./mapper.js")
  ;

/**
 * 
 * Initialize a new EpmPackages
 *
 * @param {EpmFiles} empfs
 * @param {Epkg} epkg
 */
var EpmPackages = module.exports = function(empfs, epkg, engine) {
  var self = this;

  if(false === (self instanceof EpmPackages)) {
      return new EpmPackages();
  }
  
  // inherits
  events.EventEmitter.call(self);

  self.fs = empfs;
  self.epkg = epkg;
  self.engine = engine;
  
  return self;
};

sys.inherits(EpmPackages, events.EventEmitter);

/**
 * 
 * Read current repository and `watch`?
 *
 * @returns {Q:promise}
 */
EpmPackages.prototype.get = function(query) {
  var self = this;

  var deferred = Q.defer();

  self.epkg.read()
    .progress(function(info){
      deferred.notify(info);
    })
    .done(function(pkgs){

      if (query == undefined){
        query = 'all';
      }

      self.execQuery(query, pkgs, function(err, results){
        if (err) {
          return deferred.reject(err);  
        }
        deferred.resolve(results);
      });
      
    });

  return deferred.promise;
};

EpmPackages.prototype.info = function(cb) {
  var self = this;

  var meta = [];

  var pkgs = self.fs.getSync('packages-file');
  var files = self.fs.getSync('files-file');

  mapper.metadata(pkgs, files, function(err, results){
    if (err){
      return cb(err);
    }
    return cb(null, results);
  });

  return self;
};

/**
 * 
 *
 * @param {Function} cb callback
 */
EpmPackages.prototype.execQuery = function(query, trackeds, cb) {
  var self = this;

  if (query === 'info') {
    return self.info(cb);
  }

  var q = "all";

  try {

    if (query !== "" && query !== "all"){
      q = eql.parse(query);  

      if (q.where === undefined){
        throw new Error('Query error');
      }
      
      if (q.where.predicate === undefined){
        throw new Error('Predicate error');
      }
    }
    
  } catch(err){
    cb && cb(err);
    return self;
  }

  var res = [];

  var engines = {};

  var pkgs = trackeds.packages;

  //var engine = self.plugins.resolveEngine(filename);

  var tasks = Object.keys(pkgs).map(function(uid){
    return function(fn){
      var p = pkgs[uid];

      var eng = self.engine;
      
      _getMeta(uid, p, eng, function(err, meta){
        
        var im = (q === "all" || eng.isMatch(meta, q));

        fn && fn(null, { 
          uid: uid, 
          match: im,
          content: meta.content
        } )
      });
    }
  });

  async.series(
      tasks
    , function(err, results){

      var matches = results.filter(function(obj){
        return obj.match;
      });

      var maps = matches.map(function(obj){
        return { uid: obj.uid, content: obj.content };
      });

      cb && cb(null, maps);

    });

  return self;

  function _getMeta(uid, p, eng, mcb){
    var fmeta = self.fs.resolve('cache-folder', 'data/' + uid);

    if ( !fs.existsSync(fmeta) ) {
      eng.readMetadata(self.repo.resolve(p.filename), function(err, meta){
        if (err || meta === undefined) {
          mcb && mcb(new Error(p.filename + " is corrupted"))
        }

        meta = JSON.parse(meta);

        mcb && mcb(null, meta);
      });
    } else {
      var meta = self.fs.getSync('cache-folder', 'data/' + uid, { json: true });
      mcb && mcb(null, meta);
    }

  }
};