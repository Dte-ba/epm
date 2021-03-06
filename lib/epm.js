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
  , Q = require('q')
  , EpmFiles = require('./epm/epm-files.js')
  , FsExplorer = require('./epm/fs-explorer.js')
  , Epkg = require('./epm/epkg.js')
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
  
  try {
    if (has) {
      self.engine = require(self.ENGINENAME)();  
    }
  } catch (ex){
    console.log(ex);
    throw new Error('The engine is not defined');
  }

  self.ready = false;

  self.db = new Db(path.join(self.EPM_PATH, 'db'));
  self.explorer = new FsExplorer(self.PATH, self.db, self.fs);
  self.epkg = new Epkg(self.db, self.fs, self.explorer, self.engine, {path: self.PATH});

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
 * @param {Object} ops
 * @param {Function} cb callbacks
 */
Epm.create = function(ops, cb) {
  var self = this

  ops = ops || {};

  if (!fs.existsSync(ops.path)){
    return cb(new Error('The `path` is not defined o doesn\'t exists'));
  }

  var epath = path.join(ops.path, '.epm');

  var force = ops.force === true;
  
  var has = fs.existsSync(epath);

  if (!has || (has && force)){

    if (ops.name === undefined){
      return cb(new Error('No name defined'));
    }

    if (ops.engine === undefined){
      return cb(new Error('No engine defined'));
    }

    var efs = new EpmFiles(epath, { reponame: ops.name, engine: ops.engine });

    fse.ensureDirSync(epath);
    
    try {
      efs.init(true);
      return cb(null);
    } catch (e){
       return cb(e);
    }
    
  } else if (!force) {
    return cb(new Error('The `path` is not empty, try with `force`'));
  }

};

/**
 * 
 * Read current repository and `watch`?
 *
 * @param {watch} watch
 * @returns {Q:promise}
 */
Epm.prototype.load = function(watch) {
  var self = this;

  var deferred = Q.defer();

  (function(def){

    if (self.ready === true) {
      return def.resolve();
    }

    self
      .epkg
      .read(watch)
      .progress(function(info){
        def.notify(info);
      })
      .done(function(){
        self.ready = true;
        def.resolve();
      });
  })(deferred)
  
  return deferred.promise;
};

Epm.prototype.find = function(){
  var self = this;
  return self.db.packages.find.apply(self.db.packages, arguments);
};

Epm.prototype.findOne = function(){
  var self = this;
  return self.db.packages.findOne.apply(self.db.packages, arguments);
};


Epm.prototype.stopWatch = function(){
  var self = this;
  self.explorer.stopWatch();
  return self;  
};
