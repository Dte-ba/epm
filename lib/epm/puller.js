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
 * Initialize a new EpmPuller
 *
 * @param {Object} fetcher
 * @param {FileGateway} fg
 * @param {Object} ops
 */
var EpmPuller = module.exports = function(fetcher, fg, ops) {
  var self = this;

  if(false === (self instanceof EpmPuller)) {
      return new EpmPuller();
  }
  
  // inherits
  events.EventEmitter.call(self);

  ops = ops || {};
  self.filter = ops.filter;

  self.fs = fg;
  self.fetcher = fetcher;

  return self;
}

sys.inherits(EpmPuller, events.EventEmitter);

/**
 * 
 * Start retrieve `remote` repository
 *
 * @param {Function} cb callback
 */
EpmPuller.prototype.retrieve = function() {
  var self = this;

  self.fetcher
    .on('status', function(msg){
      self.emit('status', msg);
    })
    .on('complete', function(data){
      self.emit('status', 'Fetched complete');

      var trackeds = self.fs.getSync('packages-file');

      try{
        var status = analize(trackeds.packages, data, self.filter);
        self.emit('status', status);
      } catch(err){
        console.log(err);
        self.emit('error', err);
      }
    })
    .retrieve();

  return self;
}

//
// helpers
function analize(local, remote, filter){

  var lkeys = Object.keys(local);
  var rkeys = remote.map(function(p){ return p.uid; });
  var remotes = _.object(rkeys, remote);

  var diff = _.difference(rkeys, lkeys);

  var intersect = _.intersection(lkeys, rkeys);
  var updates = [];

  if (intersect.length > 0) {
    intersect.forEach(function(uid){
      
      var lp = local[uid];
      var rp = remotes[uid];

      if (parseInt(lp.build) < parseInt(rp.build)){
        updates.push(uid);
      }
    });
  }

  var news = [], olds = [];

  diff.forEach(function(uid){
    news.push({
      uid: uid,
      checksum: remotes[uid].checksum,
      build: remotes[uid].build,
      filename: remotes[uid].filename
    });
  });

  intersect.forEach(function(uid){
    olds.push({
      uid: uid,
      checksum: remotes[uid].checksum,
      build: remotes[uid].build,
      filename: remotes[uid].filename
    });
  });

  return {
    news: news,
    olds: olds
  };

}