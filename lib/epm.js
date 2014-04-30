/*!
 * EPM
 *
 * Copyright(c) 2014 Dirección de Tecnología Educativa de Buenos Aires (Dte-ba)
 * GPL Plublic License v3
 */

'use strict';

var sys = require('sys')
  , events = require('events')
  , FsExplorer = require('./epm/fs-explorer.js')
  , EpmFiles = require('./epm/epm-files.js')
  , fs = require('graceful-fs')
  , log = require("../log")
  ;

/**
 * 
 * Initialize a new Epm instance for `dir` with `ops`.
 *
 * @param {String} dir working directory
 * @param {Object} ops
 */
var Epm = module.exports function(dir, ops) {

  if(false === (this instanceof Epm)) {
      return new Epm();
  }
  
  // inherits
  events.EventEmitter.call(this);

  ops = ops || {};

  self.REPONAME = ops.name || "main";
  self.PATH = dir;
  self.EPM_PATH = path.join(dir, ".epm");

  if (fs.path.existsSync(self.PATH)){
    var conf = self.file.getSync("config-file");
    self.REPONAME = conf.name;
  }
  
  self.logger = log;

  // instance actors
  self.fs = new EpmFiles(self.EPM_PATH, { reponame: self.REPONAME });
  self.explorer = new FsExplorer(self.PATH, self.fs);

  // catch logs
  self.fs.on('log', self.dispatchLog);

  return self;
}

sys.inherits(Epm, events.EventEmitter);

/**
 * 
 * Log dispatcher
 *
 */
Epm.prototype.dispatchLog = function(msg) {
  var self = this;

  self.logger.log( msg );

  return self;
};