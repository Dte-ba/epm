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
  , fsextra = require('fs-extra')
  , PkgReader = require('./pkg-reader.js')
  ;

var ERROR_WAIT_TIME = 1000*60;
var FILE_ERROR_MAX_ATTEMPTS = 30;
/**
 * 
 * Initialize a new Epkg instance.
 *
 * @param {Db} db
 * @param {Explorer} explorer
 * @param {EpmFiles} empfs
 * @param {Object} engine
 * @param {Object} ops
 */
var Epkg = module.exports = function(db, empfs, explorer, engine, ops) {
  var self = this;

  if(false === (self instanceof Epkg)) {
      return new Epkg();
  }

  // inherits
  events.EventEmitter.call(self);

  self.db = db;
  self.engine = engine;
  self.fs = empfs;
  self.explorer = explorer;
  self.resolve = _resolve;
  self.PATH = ops.path;

  self.currentProcessed = 0;

  self.fileErrorsAttemps = {};
  
  self.queue = async.queue(function (task, cb) {
    self.processTask(task, function(err){
      self.currentProcessed++;
      
      if (err){
        if (self.fileErrorsAttemps[task.filename] === undefined){
          // show the error first time
          console.log(err);
          console.log(task.filename + ' processed with error');
          self.fileErrorsAttemps[task.filename] = 0;
        }

        if (self.fileErrorsAttemps[task.filename]++ < FILE_ERROR_MAX_ATTEMPTS) {
          // wait a then proccess again
          setTimeout(function(){
            self.queue.push(task);
          }, ERROR_WAIT_TIME);
        } else {
          console.log(task.filename + ' was error on all attempts');
        }
        
        //self.queue.pause();
        //self.queue.resume();
      } else {
        //console.log(task.filename + ' processed');
      }
      if (self.readPromise !== undefined) {

        var left = self.explorer.currentProccesing - self.currentProcessed;
        var progress = self.currentProcessed / self.explorer.currentProccesing;
        //console.log('%d : %d : %d', self.explorer.currentProccesing, self.currentProcessed, progress);

        self.readPromise.notify({ 
          left: left,
          currents: self.currentProcessed,
          progress: progress
        });
      }
      cb && cb();
    });
  }, 1);

  self.queue.drain = function() {
    //console.log('queue drain');
    if (self.readPromise !== undefined) {
      //var pkgs = self.fs.getSync("packages-file");
      self.readPromise.resolve();
      self.readPromise = undefined;
      self.queue.pause();

      self.currentProcessed = 0;
    }
  };

  self.explorer.on('file', function(info){
    self.currentProccesing++;
    if (self.explorer.isWatching === true && self.queue.paused) {
      self.queue.resume();
    }
    
    self.queue.push(info);
  });

  self.explorer.on('file.error', function(error){
    console.log('file.error ', error);
  });

  self.explorer.on('error', function(error){
    console.log('error ', error);
  });

  self.explorer.on('queue.drain', function(info){
    //console.log('queue.drain ', info);
    /**/
    if (self.queue.length() === 0){
      if (self.readPromise !== undefined) {
        self.readPromise.resolve();
        self.readPromise = undefined;  
      }
    }
  });

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
 * @param {Boolean} watch
 * @param {requestCallback} cb
 */
Epkg.prototype.read = function(watch) {
  var self = this;

  if (self.readPromise !== undefined) {
    return self.readPromise.promise;
  };

  var deferred = self.readPromise = Q.defer();

  self.explorer.discover(watch);
  return deferred.promise;
};

/**
 * 
 * Process a file
 *
 * @param {Object} task
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
    case -1: return self.untrackFile(task, cb);
    case 1: return self.registerFile(task, cb);
    case 2: return self.updateFile(task, cb);
    case 0: 
    default:
      return self.checkFile(task, cb);  
  }

  return self;
};

/**
 * 
 * Deleteds files
 *
 * @param {Object} task
 * @param {Function} cb
 */
Epkg.prototype.untrackFile = function(task, cb) {

  var self = this;
  self.db.packages.findOne({filename: task.filename}, function(err, pkg){
    if (err){
      return cb(err);
    }
    if (pkg === null){
     return cb(); 
    }

    self.db.packages.remove({_id: pkg._id}, function(err){
      if (err){
        return cb(err);
      }
      var fdata = self.fs.resolve("cache-folder", pkg.uid);

      if (fs.existsSync(fdata)){
        fsextra.removeSync(fdata)  // remove file
      }
      self.emit('untrack', pkg.uid);
      cb(null, task);
    });

  });

  return self;
}

/**
 * 
 * Added files
 *
 * @param {Object} task
 * @param {Function} cb
 */
Epkg.prototype.registerFile = function(task, cb) {
  var self = this;
  
  var eng = self.engine;
  
  var reader = new PkgReader(self.resolve(task.filename), eng);

  reader.once('error', function(err){
    if (err) {
      return cb(err);
    }
    self.db.files.findOne({filename: task.filename}, function(ferr, prev){
      if (ferr){
        return cb(ferr);
      }
      prev.hasError = true;
      self.db.files.update({_id: prev._id}, prev, function(uerr){
        return cb(uerr);
      });
    });

    //cb && cb(err);
  });

  reader.once('read', function(data){
    var meta = data.meta;

    meta.filename = task.filename;
    meta.build = meta.build || 0;
    
    self.db.packages.findOne({uid: meta.uid}, function(err, pkg){
      if (err){
        return cb(err);
      }
      if (pkg !== null){
       return cb(new Error('The uid ' + meta.uid + ' is already in the collection')); 
      }

      self.db.packages.insert(meta, function(ierr){
        if (ierr){
          return cb(ierr);
        }
        self.emit('register', data.uid);
        cb();
      })
    });

  });

  reader.read();
  
  return self;
}

/**
 * 
 * Changed files
 *
 * @param {Object} task
 * @param {Function} cb
 */
Epkg.prototype.updateFile = function(task, cb) {
  var self = this;

  var reader = new PkgReader(self.resolve(task.filename), self.engine);

  reader.on('error', function(err){
    console.log(err);
    cb && cb();
  });

  reader.on('read', function(data){
    var meta = data.meta;

    meta.filename = task.filename;;
    meta.build = meta.build || 0;
    
    self.db.packages.findOne({uid: meta.uid}, function(err, pkg){
      if (err){
        return cb(err);
      }
      if (pkg === null){
       return cb(new Error('The uid ' + meta.uid + ' no found')); 
      }

      self.db.packages.update({_id: pkg._id}, meta, function(ierr){
        if (ierr){
          return cb(ierr);
        }
        self.emit('update', data.uid);
        cb();
      });
    });

  });

  reader.read();

  return self;
}

/**
 * 
 * Unchanged files
 *
 * @param {Object} task
 * @param {Function} cb
 */
Epkg.prototype.checkFile = function(task, cb) {
  var self = this;

  self.db.packages.findOne({filename: task.filename}, function(err, pkg){
    if (err){
      return cb(err);
    }

    if (pkg === null){
      task.code = 1;
     return self.registerFile(task, cb);
    }
    cb(null);
  });

  return self;
}