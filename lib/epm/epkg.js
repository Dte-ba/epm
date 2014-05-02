/*!
 * This file is part of EPM.
 *
 * please see the LICENSE
 */

'use strict';

var sys = require('sys')
  , events = require('events')
  , _ = require('underscore')
  , fs = require('graceful-fs')
  , PkgReader = require('./pkg-reader.js')
  , SepEngine = require('../sep.js')
  ;

/**
 * 
 * Initialize a new Epkg instance for `repo` with `ops`.
 *
 * @param {Epm} repo
 * @param {Object} ops
 */
var Epkg = module.exports = function(repo, ops) {
  var self = this;

  if(false === (self instanceof Epkg)) {
      return new Epkg();
  }

  // inherits
  events.EventEmitter.call(self);

  self.fs = repo.fs;
  self.explorer = repo.explorer;
  self.resolve = _resolve;

  //
  //TODO: refactor this
  //
  self.engine = new SepEngine();

  self.queue = [];

  return self;

  function _resolve(){
    return repo.resolve.apply(repo, arguments);
  }
}

sys.inherits(Epkg, events.EventEmitter);

/**
 * 
 * Read current repository
 *
 * @param {Boolean} w watch
 */
Epkg.prototype.read = function(w) {
  var self = this;

  self.explorer.on('file.deleted', function(data){
    console.log('file.deleted');
    self.incoming('file.deleted', data);
  });

  self.explorer.on('file.added', function(data){
    self.incoming('file.added', data);
  });

  self.explorer.on('file.change', function(data){
    self.incoming('file.change', data);
  });

  self.explorer.on('file.unchange', function(data){
    console.log('file.unchange');
    self.incoming('file.unchange', data);
  });

  self.explorer.read(w);

  return self;
}

/**
 * 
 * process incoming files
 *
 * @param {String} type
 * @param {Object} data
 */
Epkg.prototype.incoming = function(type, data) {
  var self = this;

  Object.keys(data).forEach(function(key){
    var f = data[key];
    self.queue.push({type: type, filename: key, checksum: f.checksum });
  });

  process.nextTick(function(){
    self.process();
  });

  return self;
}

/**
 * 
 * process files queue
 *
 * @param {Boolean} w watch
 */
Epkg.prototype.process = function() {
  var self = this;

  // nothing to do
  if (self.queue.length === 0) {
    self.emit('ready', {});
    return self; 
  }

  // wait to next tick when 
  // are precessing
  if (self.isProcessing === true){
    return self;
  }

  self.isProcessing = true;

  var file = _.clone(self.queue[0]);

  self.queue = self.queue.slice(1);

  return self.processFile(file, function(){
    self.isProcessing = false;
    self.process();
  });
}

/**
 * 
 * process file
 *
 * @param {Boolean} w watch
 */
Epkg.prototype.processFile = function(file, next) {
  var self = this;
  
  switch(file.type){
    case 'file.deleted': return self.untrackFile(file.filename, next);
    case 'file.added': return self.registerFile(file.filename, next);
    case 'file.change': return self.updateFile(file.filename, next);
    case 'file.unchange': 
    default:
      return self.checkFile(file.filename, next);  
  }
}

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

  var uid = pkgs.files[filename];

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

  self.emit('untrack', p);

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

  var reader = new PkgReader(self.resolve(filename), self.engine);

  reader.on('error', function(err){
    console.log(err);
    next && next();
  });

  reader.on('read', function(data){
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
    var tags = self.fs.getSync("tags-file");
    tags[meta.uid] = self.engine.getTags(meta);

    self.fs.setSync("tags-file", tags);

    // save packages
    self.fs.setSync("packages-file", pkgs);

    self.emit('register', data);
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

    self.emit('update', data);
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