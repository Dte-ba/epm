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
  , checksum = require("checksum")
  , http = require ("http")
  , statusBar = require ("status-bar")
  ;

/**
 * 
 * Initialize a new EpmDownloader
 *
 * @param {Object} file
 * @param {FileGateway} href
 * @param {Object} ops
 */
var EpmDownloader = module.exports = function(from, tmp, to, checksum) {
  var self = this;

  if(false === (self instanceof EpmDownloader)) {
      return new EpmDownloader();
  }
  
  // inherits
  events.EventEmitter.call(self);

  self.from = from;
  self.tmp = tmp;
  self.to = to;
  self.checksum = checksum;

  return self;
}

sys.inherits(EpmDownloader, events.EventEmitter);


/**
 * 
 * Download the file
 *
 */
EpmDownloader.prototype.download = function() {
  var self = this;

  var ws = fs.createWriteStream(self.tmp);

  var speeds = [];
  var starttime = (new Date().valueOf());
  var bar;

  self.emit('status', 'downloading');

  http.get(self.from, function (res){

    bar = statusBar.create ({ total: res.headers["content-length"] })
          .on("render", function (stats){

            var progress = {
              percentage: stats.percentage,
              currentSize: stats.currentSize,
              speed: stats.speed,
              totalSize: stats.totalSize
            };

            speeds.push(stats.speed);

            self.emit('download.progress', { progress: progress });
          })
          .on("finish", function(){
            var endtime = (new Date().valueOf()) - starttime;

            var sum = 0
            for (var i = speeds.length - 1; i >= 0; i--) {
              sum += speeds[i];
            }

            var average = bar.format.speed(sum/speeds.length);
            if (speeds.legth === 0){
               average = res.headers["content-length"];
            }

            ws.close();
            self.emit('download.complete', { totalSize: res.headers["content-length"], time: endtime, average: average });

            self.check();
          });

    res.pipe(ws);
    res.pipe(bar);

  })
  .on ("error", function (err){
      if (bar) { bar.cancel(); }

      if (fs.existsSync(self.tmp)){
        fs.unlinkSync(self.tmp)  
      }

      self.emit('error', err);

  });

  return self;
}

/**
 * 
 * Check with the checksum
 *
 */
EpmDownloader.prototype.check = function() {
  var self = this;

  self.emit('status', 'checking');

  checksum.file(self.tmp, function (err, sum) {
    if (err) {
      return self.emit('error', err);
    }

    if (self.checksum !== sum){
      return self.emit('error', new Error("Checksum error"));
    }

    self.emit('checking.complete');
    self.move();

  });

  return self;
}

/**
 * 
 * Move the download file to the final file
 *
 */
EpmDownloader.prototype.move = function() {
  var self = this;

  self.emit('status', 'moving');

  fs.rename(self.tmp, self.to, function(err){
    if (err) {
      return self.emit('error', err);
    }

    self.emit('complete', self.to);
  });

  return self;
}