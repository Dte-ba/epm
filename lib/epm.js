/*!
 * EPM
 *
 * Copyright(c) 2014 Dirección de Tecnología Educativa de Buenos Aires (Dte-ba)
 * GPL Plublic License v3
 */

'use strict';

var sys = require('sys')
  , events = require('events')
  , path = require('path')
  , mkdirp = require('mkdirp')
  , FsExplorer = require('./epm/fs-explorer.js')
  , EpmFiles = require('./epm/epm-files.js')
  , fs = require('graceful-fs')
  , log = require("./log.js")
  ;

process.env.ASYNC_LIMIT = 10

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

  self.REPONAME = ops.name || "main";
  self.PATH = dir;
  self.EPM_PATH = path.join(self.PATH, ".epm");

  // instance actors
  self.fs = new EpmFiles(self.EPM_PATH, { reponame: self.REPONAME });
  self.explorer = new FsExplorer(self.PATH, self.fs);

  if (fs.existsSync(self.EPM_PATH)){
    var conf = self.fs.getSync("config-file");
    self.REPONAME = conf.name;
  }
  
  self.logger = log;

  // catch logs
  self.explorer.on('log', self.dispatchLog);

  return self;
}

sys.inherits(Epm, events.EventEmitter);

/**
 * 
 * Log dispatcher
 *
 * @param {Object} msg
 */
Epm.prototype.dispatchLog = function(msg) {
  var self = this;

  self.logger.log( msg );

  return self;
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
      mkdirp.sync(self.EPM_PATH);
    }

    self.fs.init(true);
    self.emit('init', { path: self.EPM_PATH, created: !has });
  }
  catch (err){
    self.emit('error', err);
  }

  return self;
};