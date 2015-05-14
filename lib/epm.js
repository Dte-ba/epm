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
  , EpmFiles = require('./epm/epm-files.js')
  , FsExplorer = require('./epm/fs-explorer.js')
  ;

process.env.ASYNC_LIMIT = 10;

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
 * @param {Boolean} watch
 * @param {requestCallback} cb
 */
Epm.prototype.read = function(watch, cb) {
  var self = this;

  if (typeof watch === 'function'){
    cb = watch;
    watch = false;
  }

  self.explorer.discover(cb);

  return self;
}