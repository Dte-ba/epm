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
  , fs = require('graceful-fs')
  , FsExplorer = require('./epm/fs-explorer.js')
  , EpmFiles = require('./epm/epm-files.js')
  , Epkg = require('./epm/epkg.js')
  , EpmRemote = require('./epm/remote.js')
  , EpmFetch = require('./epm/fetch.js')
  , EpmPull = require('./epm/pull.js')
  , EpmResolver = require('./epm/resolver.js')
  , log = require("./log.js")
  , EpmPlugins = require("./epm/epm-plugins.js")
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
  self.PLUGINS_PATH = path.join(__dirname, '../plugins');

  self.plugins = new EpmPlugins(self);
  self.plugins.loadPlugins();

  // instance actors
  self.fs = new EpmFiles(self.EPM_PATH, { reponame: self.REPONAME });
  self.explorer = new FsExplorer(self.PATH, self.fs);
  self.epkg = new Epkg(self);
  self.remote = new EpmRemote(self.fs);
  self.fetch = new EpmFetch(self.fs, self.remote);
  self.pull = new EpmPull(self, self.remote);

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


Epm.createServer = function(dir, ops){
  var EpmServer = require('./epm/server.js')(Epm);
  ops = ops || {}
  return new EpmServer(dir, ops);
}

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
 * Resolve paths with repository folder as root
 *
 */
Epm.prototype.resolve = function() {
  var self = this;

  var fargs = Array.prototype.slice.call(arguments, 0);

  var tojoin = [self.PATH].concat(fargs);

  return path.join.apply(self, tojoin);
}

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

/**
 * 
 * Read current repository and `watch`?
 *
 */
Epm.prototype.read = function(watch) {
  var self = this;

  self.epkg.on('error', function(err){
    self.emit('error', err);
  });

  self.epkg.on('ready', function(data){
    self.emit('ready', data);
  });

  self.epkg.read(watch);

  return self;
}


/**
 * 
 * Request hanlder
 *
 */
Epm.prototype.request = function(server, req, res) {
  var self = this;

  //console.log('request on ' + self.REPONAME);
  
  var resolver = new EpmResolver(self);

  resolver
    .on('error', function(err){
      server.writeError(err, res);
    })
    .on('complete', function(result){
      server.write(result, res);
    })
    .request(req);

  return self;
}