/*!
 * EPM
 *
 * Copyright(c) 2014-2015 Dirección de Tecnología Educativa de Buenos Aires (Dte-ba)
 * GPL Plublic License v3
 */

'use strict';

var sys = require('sys')
  , events = require('events')
  , path = require('path')
  , fs = require('graceful-fs')
  , fse = require('fs-extra')
  , async = require('async')
  , _ = require('underscore')
  , Q = require('q')
  , EpmFiles = require('./epm/epm-files.js')
  , FsExplorer = require('./epm/fs-explorer.js')
  ;

process.env.ASYNC_LIMIT = process.env.ASYNC_LIMIT = 10;

/**
 * 
 * Initialize a new Epm instance for `dir` with `ops`.
 *
 * @param {String} dir working directory
 * @param {Object} ops
 */
var Epm = module.exports = function(dir, ops) {
  var self = this;

  if(false === (self instanceof Epm)) {
      return new Epm();
  }
  
  // inherits
  events.EventEmitter.call(self);

  ops = ops || {};

  if (typeof dir !== 'string' || !fs.existsSync(dir)) {
    throw new Error('The working directory doesn\'t exists: `'+dir+'`');
  }

  self.REPONAME = ops.name || "main";
  self.PATH = dir;
  self.EPM_PATH = path.join(self.PATH, ".epm");

  // instance actors
  self.fs = new EpmFiles(self.EPM_PATH, { reponame: self.REPONAME });
  self.explorer = new FsExplorer(self.PATH, self.fs);

  self.queue = async.queue(function (task, cb) {
    //console.log(task.filename);
    setTimeout(function(){
      cb();
    }, 100);
  }, 1);

  self.queue.drain = function() {
    console.log('queue drain');
    if (self.readPromise !== undefined) {
      self.readPromise.resolve();
      self.readPromise = undefined;
      self.queue.pause();
    }
  }
    
  return self;
};

// inherits
sys.inherits(Epm, events.EventEmitter);

/**
 * 
 * Resolve paths with repository folder as root
 *
 */
Epm.prototype.resolve = function() {
  var self = this;

  var fargs = Array.prototype.slice.call(arguments, 0);

  var tojoin = [self.PATH].concat(fargs);

  return path.join.apply(self, tojoin);
};

/**
 * 
 * Initialize or create a repository
 *
 * @event Epm:init~init
 * @event Epm:init~error
 * @param {Object} ops
 * @param {requestCallback} cb
 */
Epm.prototype.init = function(ops, cb) {
  var self = this

  if (typeof ops === 'function'){
    cb = ops;
    ops = {};
  }

  ops = ops || {};

  if (ops.name !== undefined){
    self.REPONAME = ops.name;
  }
  
  var has = fs.existsSync(self.EPM_PATH);

  try {

    if (!has){
      fse.ensureDirSync(self.EPM_PATH, { mode: 744 });
      //hidde?
      fs.chmodSync(self.EPM_PATH, 4000);
    }

    self.fs.init(true);
    var conf = self.fs.getSync('config-file');
    conf.name = self.REPONAME;
    self.fs.setSync('config-file', conf);

    var res = { path: self.EPM_PATH, created: !has };

    self.emit('init', res);

    if (typeof cb === 'function') {
      cb.apply(self, [null, res]);
    }
  }
  catch (err){
    self.emit('error', err);
    if (typeof cb === 'function') {
      cb.apply(self, [err]);
    }
  }

  return self;
};

/**
 * 
 * Read current repository and `watch`?
 *
 * @event Epm:read~ready
 * @event Epm:read~error
 * @param {requestCallback} cb
 */
Epm.prototype.read = function() {
  var self = this;

  if (self.readPromise !== undefined) {
    return self.readPromise.promise;
  };

  var deferred = self.readPromise = Q.defer();

  self.explorer.discover(function(err, tracked){
    var deleted = tracked.deleted;
    var deletedMapped = _.map(deleted, function(key){
      var obj = {};
      obj.status = 'deleted';
      obj.filename = key;
      return obj;
    })
    var added = tracked.added;
    var addedMapped = _.map(Object.keys(added), function(key){
      var obj = added[key];
      obj.status = 'added';
      obj.filename = key;
      return obj;
    })
    var changed = tracked.changed;
    var changedMapped = _.map(Object.keys(changed), function(key){
      var obj = changed[key];
      obj.status = 'changed';
      obj.filename = key;
      return obj;
    })
    var unchanged = tracked.unchanged;
    var unchangedMapped = _.map(unchanged, function(key){
      var obj = {};
      obj.status = 'unchanged';
      obj.filename = key;
      return obj;
    })

    self.queue.pause();

    var all = [].concat(deletedMapped, addedMapped, changedMapped, unchangedMapped);
    self.queue.push(all);
    self.queue.resume();

  });

  return deferred.promise;
}

/**
 * 
 * Read current repository and `watch`?
 *
 * @returns {Q:promise}
 */
Epm.prototype.get = function(query) {
  var self = this;

  var deferred = Q.defer();

  self.queue.pause();

  self
    .read()
    .then(function(){
      deferred.resolve();
    });

  return deferred.promise;
}