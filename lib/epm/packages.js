/*!
 * This file is part of EPM.
 *
 * please see the LICENSE
 */

'use strict';

var sys = require('sys')
  , events = require('events')
  , _ = require('underscore')
  , async = require("async")
  , eql = require("eql-engine")
  , path = require("path")
  , fs = require("graceful-fs")
  ;

/**
 * 
 * Initialize a new EpmPackages
 *
 * @param {EpmRepo} repo
 */
var EpmPackages = module.exports = function(repo) {
  var self = this;

  if(false === (self instanceof EpmPackages)) {
      return new EpmPackages();
  }
  
  // inherits
  events.EventEmitter.call(self);

  self.fs = repo.fs;
  self.plugins = repo.plugins;
  self.repo = repo;

  return self;
}

sys.inherits(EpmPackages, events.EventEmitter);

/**
 * 
 * Start retrieve `remote` repository
 *
 * @param {Function} cb callback
 */
EpmPackages.prototype.execQuery = function(query, cb) {
  var self = this;

  var q;

  try{
    q = eql.parse(query);
  } catch(err){
    cb && cb(err);
  }

  var res = [];

  var engines = {};

  var trackeds = self.fs.getSync('packages-file');

  var pkgs = trackeds.packages;

  //var engine = self.plugins.resolveEngine(filename);

  var tasks = Object.keys(pkgs).map(function(uid){
    return function(fn){
      var p = pkgs[uid];
      
      var ext = path.extname(p.filename);
      var engine = self.plugins.resolveEngine(p.filename);

      if (engines[ext] === undefined){
        engines[ext] = new (engine.require())();
      }

      var eng = engines[ext];
      
      _getMeta(uid, p, eng, function(err, meta){
        fn && fn(null, { 
          uid: uid, 
          match: eng.isMatch(meta, q),
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
}