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

        self.emit('jobs', status);

        status.news.forEach(function(obj){

          var from = self.fetcher.remote.url + '?file=' + obj.uid;
          var tmp = path.join(tpmf, obj.uid + '.down');
          var to = self.repo.resolve(obj.uid + path.extname(obj.filename));
          var checksum = obj.checksum;

          self.queue.push(new EpmDownloader(from, tmp, to, checksum));
        });

        status.olds.forEach(function(obj){

          var from = self.fetcher.remote.url + '?file=' + obj.uid;
          var tmp = path.join(tpmf, obj.uid + '.down');
          var to = self.repo.resolve(obj.localFilename);
          var checksum = obj.checksum;

          self.queue.push(new EpmDownloader(from, tmp, to, checksum));
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
    self.emit('complete');
    return self; 
  }

  // wait if is precessing
  if (self.isProcessing === true){
    return self;
  }

  self.isProcessing = true;

  var file = _.clone(self.queue[0]);

  self.queue = self.queue.slice(1);

  file
    .on('error', function(err){
      console.log(file.from);
      console.log(err);
    })
    .on('status', function(info){
      //console.log(info);
    })
    .on('download.progress', function(info){
      self.emit('download.progress', info)
    })
    .on('complete', function(info){
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

  intersect.forEach(function(uid){
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
    olds: olds
  };

}
