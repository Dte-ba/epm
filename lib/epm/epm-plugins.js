/*!
 * This file is part of EPM.
 *
 * please see the LICENSE
 */

'use strict';

var sys = require('sys')
  , events = require('events')
  , fs = require('graceful-fs')
  , path = require('path')
  , _ = require('underscore')
  ;

/**
 * 
 * Initialize a new EpmPlugins
 *
 * @param {Epm} repo
 * @param {Object} ops
 */
var EpmPlugins = module.exports = function(repo, ops) {
  var self = this;

  if(false === (self instanceof EpmPlugins)) {
      return new EpmPlugins();
  }
  
  // inherits
  events.EventEmitter.call(self);

  self.repo = repo;

  self.plugins = [];

  return self;
}

sys.inherits(EpmPlugins, events.EventEmitter);

/**
 * 
 * Register a new plugin
 *
 */
EpmPlugins.prototype.loadPlugins = function(dir) {
  var self = this;

  dir = dir || self.repo.PLUGINS_FILE;

  if ( !fs.existsSync(self.repo.PLUGINS_FILE) ) return self;

  var plugs = require(self.repo.PLUGINS_FILE);

  if (plugs.installeds === undefined) return self;


  plugs.installeds.forEach(function(pname){
    self.register(pname);
  });

  return self;
}

EpmPlugins.prototype.getEngines = function() {
  var self = this;

  return self.plugins.filter(function(p){
    return p.type === 'epm-package-engine';
  });
}

/**
 * 
 * Register a new plugin
 *
 */
EpmPlugins.prototype.register = function(pname) {
  var self = this;

  try{

    var plugClass = require(pname);

    var plug = {
      name: pname,
      type: plugClass.type,
      version: plugClass.version,
      files: plugClass.files
    };

    plug.require = function(){
      return plugClass;
    };

    self.plugins.push(plug)

  } catch(err){
    console.error(err);
  }

  return self;
}

/**
 * 
 * Get plugin by name
 *
 */
EpmPlugins.prototype.getByName = function(name) {
  var self = this;

  return _.find(self.plugins, function(p){ return p.name === name; });
};


/**
 * 
 * Resolve the name of the engine if exists for `filename`
 *
 */
EpmPlugins.prototype.resolveEngine = function(filename) {
  var self = this;

  var ext = path.extname(filename);

  if (ext === undefined || ext === "") return undefined;

  return _.find(self.getEngines(), function(p){
    return _.contains(p.files, ext );
  });

}
