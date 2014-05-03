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
  ;

/**
 * 
 * Initialize a new EpmRemote
 *
 * @param {FileGateway} fg
 * @param {Object} ops
 */
var EpmRemote = module.exports = function(fg, ops) {
  var self = this;

  if(false === (self instanceof EpmRemote)) {
      return new EpmRemote();
  }
  
  // inherits
  events.EventEmitter.call(self);

  self.fs = fg;

  return self;
}

sys.inherits(EpmRemote, events.EventEmitter);


/**
 * 
 * Retrives remote list
 *
 * @param {Function} cb callback
 */
EpmRemote.prototype.list = function(cb) {
  var self = this;

  var remotes = self.fs.getSync("remotes-file");

  cb && cb(null, remotes);

  return self;
}

/**
 * 
 * Add `repo` to remotes repositories
 *
 * @param {Function} cb callback
 */
EpmRemote.prototype.add = function(repo, cb) {
  var self = this;

  var remotes = self.fs.getSync("remotes-file");

  var r = remotes[repo.name];

  if (r !== undefined) {
    cb && cb(new Error("remote `" + repo.name + "` exists"));
    return self;
  }

  var rn = remotes[repo.name] = {};

  //
  //TODO: check url
  //

  rn.url = repo.url;

  self.fs.setSync("remotes-file", remotes);
  
  var res = _.clone(rn);
  res.name = repo.name;

  self.emit('added', res);

  cb && cb(null, remotes);

  return self;
}

/**
 * 
 * Remove `name` remote repository
 *
 * @param {Function} cb callback
 */
EpmRemote.prototype.remove = function(name, cb) {
  var self = this;

  var remotes = self.fs.getSync("remotes-file");

  var r = remotes[name];

  if (r === undefined) {
    cb && cb(new Error("remote `" + name + "` not exists"));
    return self;
  }

  var rn = _.clone(remotes[name]);

  // dispose
  delete remotes[ops.name];

  // fetch information
  var rfile = self.fs.resolve("remote-folder", name);
  if (fs.existsSync(rfile)) {
    fs.unlinkSync(rfile);
  }

  self.fs.setSync("remotes-file", remotes);

  self.emit('removed', rn);

  cb && cb(null, remotes);

  return self;
}

/**
 * 
 * Remove `name` remote repository
 *
 * @param {Function} cb callback
 */
EpmRemote.prototype.get = function(name, cb) {
  var self = this;

  var remotes = self.fs.getSync("remotes-file");

  var r = remotes[name];

  if (r === undefined) {
    cb && cb(new Error("remote `" + name + "` not exists"));
    return self;
  }

  var rc = _.clone(r);
  rc.name = name;

  cb && cb(null, rc);

  return self;
}

/**
 * 
 * Remove `name` remote repository
 *
 * @param {Function} cb callback
 */
EpmRemote.prototype.getSync = function(name) {
  var self = this;

  var remotes = self.fs.getSync("remotes-file");

  var r = remotes[name];

  if (r === undefined) {
    throw new Error("remote `" + name + "` not exists")
  }

  var rc = _.clone(r);
  rc.name = name;

  return rc;
}

/**
 * 
 * Remove `name` remote repository
 *
 * @param {Function} cb callback
 */
EpmRemote.prototype.existsSync = function(name) {
  var self = this;

  var remotes = self.fs.getSync("remotes-file");

  return remotes[name] !== undefined;
}