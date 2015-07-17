/*!
 * This file is part of EPM.
 *
 * please see the LICENSE
 */

'use strict';

var sys = require('sys')
  , events = require('events')
  , async = require('async')
  , _ = require('underscore')
  , Q = require('q')
  , eql = require("eql-engine")
  , path = require("path")
  , fs = require("graceful-fs")
  , mapper = require("./mapper.js")
  ;

/**
 * 
 * Initialize a new EpmPackages
 *
 * @param {Db} db
 * @param {EpmFiles} empfs
 * @param {Epkg} epkg
 */
var EpmPackages = module.exports = function(db, empfs, epkg, engine) {
  var self = this;

  if(false === (self instanceof EpmPackages)) {
      return new EpmPackages();
  }
  
  // inherits
  events.EventEmitter.call(self);

  self.db = db;
  self.fs = empfs;
  self.epkg = epkg;
  self.engine = engine;
  
  return self;
};

sys.inherits(EpmPackages, events.EventEmitter);

/**
 * 
 * Read current repository and `watch`?
 *
 * @param {watch} watch
 * @returns {Q:promise}
 */
EpmPackages.prototype.read = function(watch) {
  var self = this;

  var deferred = Q.defer();

  self
    .epkg
    .read()
    .progress(function(info){
      deferred.notify(info);
    })
    .done(function(pkgs){
      deferred.resolve();
    });

  return deferred.promise;
};