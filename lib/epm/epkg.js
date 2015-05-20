/*!
 * This file is part of EPM.
 *
 * please see the LICENSE
 */

'use strict';

var sys = require('sys')
  , events = require('events')
  , path = require('path')
  , async = require('async')
  , _ = require('underscore')
  , Q = require('q')
  , fs = require('graceful-fs')
  , PkgReader = require('./pkg-reader.js')
  ;

/**
 * 
 * Initialize a new Epkg instance.
 *
 * @param {Explorer} explorer
 * @param {EpmFiles} empfs
 * @param {Object} engine
 * @param {Object} ops
 */
var Epkg = module.exports = function(empfs, explorer, engine, ops) {
  var self = this;

  if(false === (self instanceof Epkg)) {
      return new Epkg();
  }

  // inherits
  events.EventEmitter.call(self);

  self.engine = engine;
  self.fs = empfs;
  self.explorer = explorer;
  self.resolve = _resolve;
  self.PATH = ops.path;

  self.queue = async.queue(function (task, cb) {
    self.processTask(task, function(){
      if (self.readPromise !== undefined) {
        self.readPromise.notify({ 
          progress: self.currentProcresing - self.queue.length(),
          currents: self.currentProcresing
        });
      }
      cb && cb();
    });
  }, 1);

  self.currentProcresing = 0;

  self.queue.drain = function() {
    //console.log('queue drain');
    if (self.readPromise !== undefined) {
      var pkgs = self.fs.getSync("packages-file");
      self.readPromise.resolve(pkgs);
      self.readPromise = undefined;
      self.queue.pause();
    }
  };

  return self;

  function _resolve(){
    var fargs = Array.prototype.slice.call(arguments, 0);

    var tojoin = [self.PATH].concat(fargs);

    return path.join.apply(self, tojoin);
  }
}

sys.inherits(Epkg, events.EventEmitter);

/**
 * 
 * Read current repository and `watch`?
 *
 * @param {requestCallback} cb
 */
Epkg.prototype.read = function() {
  var self = this;

  if (self.readPromise !== undefined) {
    return self.readPromise.promise;
  };

  var deferred = self.readPromise = Q.defer();

  self.explorer.discover(function(err, tracked){

    // Untrack the missings packages
    var pkgs = self.fs.getSync("packages-file");
    var tags = self.fs.getSync("tags-file");

    var missings = Object.keys(pkgs.packages).filter(function(uid){
      return tracked[pkgs.packages[uid].filename] === undefined;
    });

    missings.forEach(function(uid){
      var p = _.clone(pkgs.packages[uid]);
      p.uid = uid;
      
      delete pkgs.packages[uid];
      delete pkgs.files[p.filename];
      delete tags[uid];

      var fdata = self.fs.resolve("data-folder", uid);

      if (fs.existsSync(fdata)){
        fs.unlinkSync(fdata)  // remove file
      }

      self.emit('untrack', p.uid);
    });

    var mapped = _.map(Object.keys(tracked), function(key){
      var obj = tracked[key];
      obj.filename = key;
      return obj;
    })

    self.queue.pause();
    self.currentProcresing = mapped.length;
    self.queue.push(mapped);
    self.queue.resume();

  });

  return deferred.promise;
};

/**
 * 
 * Process a file
 *
 * @param {Object} tesk
 * @param {requestCallback} cb
 */
Epkg.prototype.processTask = function(task, cb) {
  var self = this;

  // task.code
  // -1: file deleted
  //  0: file unchange
  //  1: file added
  //  2: file has changes

  switch(task.code){
    case -1: return self.untrackFile(task.filename, cb);
    case 1: return self.registerFile(task.filename, cb);
    case 2: return self.updateFile(task.filename, cb);
    case 0: 
    default:
      return self.checkFile(task.filename, cb);  
  }

  return self;
};

/**
 * 
 * Deleteds files
 *
 * @param {String} filename
 * @param {Function} next
 */
Epkg.prototype.untrackFile = function(filename, next) {
  var self = this;

  var pkgs = self.fs.getSync("packages-file");
  var tags = self.fs.getSync("tags-file");

  var uid = _.clone(pkgs.files[filename]);

  if (uid === undefined){
    //missing info
    next && next();
    return self;
  }

  var p = _.clone(pkgs.packages[uid]);
  
  //
  //TODO: check `p`
  //

  delete pkgs.packages[uid];
  delete pkgs.files[filename];
  delete tags[uid];

  var fdata = self.fs.resolve("data-folder", uid);

  if (fs.existsSync(fdata)){
    fs.unlinkSync(fdata)  // remove file
  }

  //
  //TODO: clean cache
  //

  // save && next
  self.fs.setSync("packages-file", pkgs);
  self.fs.setSync("tags-file", tags);

  p.uid = uid;
  
  self.emit('untrack', p.uid);

  next && next();

  return self;
}

/**
 * 
 * Added files
 *
 * @param {String} filename
 * @param {Function} next
 */
Epkg.prototype.registerFile = function(filename, next) {
  var self = this;

  var pkgs = self.fs.getSync("packages-file");
  
  var eng = self.engine;
  
  var reader = new PkgReader(self.resolve(filename), eng);

  reader.once('error', function(err){
    console.log(err);
    next && next(reader);
  });

  reader.once('read', function(data){
    var meta = data.meta;
    
    //
    //TODO: check if the same uid && build exists
    //

    pkgs.packages[meta.uid] = { 
      build: meta.build,
      filename: filename
    };

    pkgs.files[filename] = meta.uid;
    
    // save metadata
    self.fs.setSync("data-folder", meta.uid, meta, {json: true});

    //save tags
    if (eng.getTags) {
      var tags = self.fs.getSync("tags-file");
      tags[meta.uid] = eng.getTags(meta);
      
      self.fs.setSync("tags-file", tags);
    }

    // save packages
    self.fs.setSync("packages-file", pkgs);

    self.emit('register', data.uid);

    next && next();

  });

  reader.read();
  
  return self;
}

/**
 * 
 * Changed files
 *
 * @param {String} filename
 * @param {Function} next
 */
Epkg.prototype.updateFile = function(filename, next) {
  var self = this;

  var pkgs = self.fs.getSync("packages-file");

  var reader = new PkgReader(self.resolve(filename), self.engine);

  reader.on('error', function(err){
    console.log(err);
    next && next();
  });

  reader.on('read', function(data){
    var meta = data.meta;
    
    pkgs.packages[meta.uid] = { 
      build: meta.build,
      filename: filename
    };
    
    // save metadata
    self.fs.setSync("data-folder", meta.uid, meta, {json: true});

    //save tags
    var tags = self.fs.getSync("tags-file");
    tags[meta.uid] = self.engine.getTags(meta);

    self.fs.setSync("tags-file", tags);

    // save packages
    self.fs.setSync("packages-file", pkgs);

    self.emit('update', data.uid);
    next && next();

  });

  reader.read();

  return self;
}

/**
 * 
 * Unchanged files
 *
 * @param {String} filename
 * @param {Function} next
 */
Epkg.prototype.checkFile = function(filename, next) {
  var self = this;

  var pkgs = self.fs.getSync("packages-file");

  var uid = pkgs.files[filename];

  if (uid === undefined){
    return self.registerFile(filename, next);
  }

  //
  //TODO: check another things
  //

  next && next();

  return self;
}