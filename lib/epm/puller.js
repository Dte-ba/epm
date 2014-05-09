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
  , path = require("path")
  , EpmDownloader = require("./downloader.js")
  ;

/**
 * 
 * Initialize a new EpmPuller
 *
 * @param {Object} repo
 * @param {Object} fetcher
 * @param {FileGateway} fg
 * @param {Object} ops
 */
var EpmPuller = module.exports = function(repo, fetcher, ops) {
  var self = this;

  if(false === (self instanceof EpmPuller)) {
      return new EpmPuller();
  }
  
  // inherits
  events.EventEmitter.call(self);

  ops = ops || {};
  self.filter = ops.filter;
  self.repo = repo;

  self.fs = repo.fs;
  self.fetcher = fetcher;
  self.queue = [];
  self.processeds = [];

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
        
        var tpmf = self.fs.resolve('tmp-folder');

        self.emit('packages.status', status);

        status.news.forEach(function(obj){

          var from = self.fetcher.remote.url + '?file=' + obj.uid;
          var tmp = path.join(tpmf, obj.uid + '.down');
          var to = self.repo.resolve(obj.uid + path.extname(obj.filename));
          var checksum = obj.checksum;

          self.queue.push(new EpmDownloader(from, tmp, to, checksum, obj.uid));
        });

        status.olds.forEach(function(obj){

          var from = self.fetcher.remote.url + '?file=' + obj.uid;
          var tmp = path.join(tpmf, obj.uid + '.down');
          var to = self.repo.resolve(obj.localFilename);
          var checksum = obj.checksum;

          self.queue.push(new EpmDownloader(from, tmp, to, checksum, obj.uid));
        });

        self.processQueue();
      } catch(err){
        console.log(err);
        self.emit('error', err);
      }
    })
    .retrieve();

  return self;
}

/**
 * 
 * Start retrieve `remote` repository
 *
 * @param {Function} cb callback
 */
EpmPuller.prototype.processQueue = function() {
  var self = this;

  // nothing to do
  if (self.queue.length === 0) {
    self.emit('complete', self.fetcher.remote);
    return self; 
  }

  // wait if is precessing
  if (self.isProcessing === true){
    return self;
  }

  self.isProcessing = true;

  var file = self.queue.shift();
  
  self.emit('download.start', file);

  file
    .on('error', function(err){
      self.isProcessing = false;
      self.processQueue();

      self.emit('error', err, file);
    })
    .on('status', function(info){

    })
    .on('check', function(info){
      self.emit('check', info)
    })
    .on('check.complete', function(info){
      self.emit('check.complete', info)
    })
    .on('move', function(info){
      self.emit('move', info)
    })
    .on('move.complete', function(info){
      self.emit('move.complete', info)
    })
    .on('status', function(info){

    })
    .on('download.progress', function(info){
      self.emit('download.progress', info)
    })
    .on('download.complete', function(info){
      self.emit('download.complete', file, info);
    })
    .on('complete', function(){
      self.isProcessing = false;
      self.processQueue();
    })
    .download();

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

  updates.forEach(function(uid){
    olds.push({
      uid: uid,
      checksum: remotes[uid].checksum,
      build: remotes[uid].build,
      filename: remotes[uid].filename,
      localFilename: local[uid].filename
    });
  });

  return {
    news: news,
    olds: olds,
    remotes: rkeys
  };

}
