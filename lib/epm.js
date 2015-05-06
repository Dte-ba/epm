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
  , mkdirp = require('mkdirp')
  , EpmFiles = require('./epm/epm-files.js')
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
 * events: [ 'init' ]
 *
 * @param {Object} msg
 */
Epm.prototype.init = function(ops) {
  var self = this

  ops = ops || {};

  if (ops.name !== undefined){
    self.REPONAME = ops.name;
  }
  
  var has = fs.existsSync(self.EPM_PATH);

  try {

    if (!has){
      mkdirp.sync(self.EPM_PATH, { mode: 744 });
    }

    self.fs.init(true);
    var conf = self.fs.getSync('config-file');
    conf.name = self.REPONAME;
    self.fs.setSync('config-file', conf);

    self.emit('init', { path: self.EPM_PATH, created: !has });
  }
  catch (err){
    self.emit('error', err);
  }

  return self;
};