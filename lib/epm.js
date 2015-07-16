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
  , Epkg = require('./epm/epkg.js')
  , EpmPackages = require('./epm/packages.js')
  , Db = require('./epm/db.js')
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

  self.PATH = dir;
  self.EPM_PATH = path.join(self.PATH, ".epm");

  self.REPONAME = ops.name;
  self.ENGINENAME = ops.engine;

  var has = fs.existsSync(self.EPM_PATH);
  if (has) {
    var info = JSON.parse(fs.readFileSync(path.join(self.EPM_PATH, '/CONFIG'), 'utf-8'));
    self.REPONAME = info.name;
    self.ENGINENAME = info.engine;
  }
  
  // instance actors
  self.fs = new EpmFiles(self.EPM_PATH, { reponame: self.REPONAME, engine: ops.engine });
  self.explorer = new FsExplorer(self.PATH, self.fs);

  try {
    if (has) {
      self.engine = require(self.ENGINENAME)();  
    }
  } catch (ex){
    console.log(ex);
    throw new Error('The engine is not defined');
  }

  self.db = new Db(path.join(self.EPM_PATH, 'db'));
  self.epkg = new Epkg(self.fs, self.explorer, self.engine, {path: self.PATH});
  self.packages = new EpmPackages(self.fs, self.epkg, self.engine);

  return self;
};

// inherits
sys.inherits(Epm, events.EventEmitter);

// expose finder
Epm.finder = require('./utils/finder.js');

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
 */
Epm.prototype.init = function(ops) {
  var self = this

  ops = ops || {};
  
  var has = fs.existsSync(self.EPM_PATH);

  if (!has){
    if (ops.name === undefined){
      throw new Error('No name defined');
    }

    if (ops.engine === undefined){
     throw new Error('No engine defined'); 
    }

    fse.ensureDirSync(self.EPM_PATH, { mode: 744 });
    //hidde?
    fs.chmodSync(self.EPM_PATH, 4000);

    self.fs.init(true);
    var conf = self.fs.getSync('config-file');
    conf.name = ops.name;
    conf.engine = ops.engine;
    self.fs.setSync('config-file', conf);
    self.emit('init');
    return self;
  }

  self.fs.init(true);
  var conf = self.fs.getSync('config-file');
  self.REPONAME = conf.name;
  self.ENGINENAME = conf.engine;
  self.emit('init');
  return self;
};

/**
 * 
 * Read current repository and `watch`?
 *
 * @returns {Q:promise}
 */
Epm.prototype.get = function(query) {
  var self = this;
  return self.packages.get(query);
}

/**
 * 
 * Read current repository and `watch`?
 *
 * @param {uid:String}
 * @param {cb:Function}
 */
Epm.prototype.infoByUid = function(uid, cb) {
  var self = this;
  return self.packages.infoByUid(uid, cb);
}