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
  , request = require('request')
  , progress = require('request-progress')
  ;

/**
 * 
 * Initialize a new EpmDownloader
 *
 * @param {Object} file
 * @param {FileGateway} href
 * @param {Object} ops
 */
var EpmDownloader = module.exports = function(from, tmp, to, checksum, target) {
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
  self.target = target;

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
  var total;
  var speed;

  self.emit('status', 'downloading');

  var req = request(self.from)
            .once('response', function(res){
              var totalSize = Number(res.headers['content-length']);
              speed = new Speedometer(totalSize);
            });

  progress(req, {
    throttle: 2000,  // Throttle the progress event to 2000ms, defaults to 1000ms
    delay: 500      // Only start to emit after 1000ms delay, defaults to 0ms
  })
  .on('progress', function (state) {

    if (speed === undefined){
      speed = new Speedometer(state.total);
    }

    speed.received(state.received)

    var progress = {
      percentage: state.percent,
      received: state.received,
      total: state.total,
      speed: speed.speed
    };

    self.emit('download.progress', { progress: progress, target: self.target });
    total = state.total;
  })
  .on('error', function (err) {
      if (fs.existsSync(self.tmp)){
        fs.unlinkSync(self.tmp)  
      }

      self.emit('error', err);
  })
  .pipe(ws)
  .on('error', function (err) {

      if (fs.existsSync(self.tmp)){
        fs.unlinkSync(self.tmp)  
      }

      self.emit('error', err);
  })
  .on('close', function (err) {
    
    var endtime = (new Date().valueOf()) - starttime;
    var sec = endtime/1000;
    if (sec === undefined){
      sec = 0;
    }

    self.emit('download.complete', { endtime: sec, average: speed.average() });

    self.check();
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

  self.emit('check', self);

  checksum.file(self.tmp, function (err, sum) {
    if (err) {
      return self.emit('error', err);
    }

    if (self.checksum !== sum){
      return self.emit('error', new Error("Checksum error"));
    }

    self.emit('check.complete', self);
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

  self.emit('move', self);

  fs.rename(self.tmp, self.to, function(err){
    if (err) {
      return self.emit('error', err);
    }

    self.emit('move.complete', self.to);
    self.emit('complete', self);
  });

  return self;
}


// Speed

var Speedometer = function(total){
  var self = this;

  self.start = (new Date().valueOf());
  self.times = 0;
  self.size = 0;
  self.speed = 0;
  self.speeds = [];
  self.total = total || 0;

  self.received = function(bytes){
    self.times = (new Date().valueOf()) - self.start;
    self.secods = trimSeconds(self.times);

    self.size = bytes;

    if (self.secods === 0){
      self.speed = bytes;
    } else {
      self.speed = self.size/self.secods;
    }

    self.speeds.push(self.speed);
  };

  self.average = function(){
    if (self.speeds.length === 0){
      return self.total;
    }

    var sum = 0
    for (var i = self.speeds.length - 1; i >= 0; i--) {
      sum += self.speeds[i];
    }

    var average = sum/self.speeds.length;

    return average;
  };

  return self;

  function trimSeconds(time){
    return Math.floor((time/1000));
  }
}