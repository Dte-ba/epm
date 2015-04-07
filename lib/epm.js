/*!
 * EPM
 *
 * Copyright(c) 2015 Dirección de Tecnología Educativa de Buenos Aires (Dte-ba)
 * GPL Plublic License v3
 */

'use strict';

var sys = require('sys'),
    events = require('events');

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
  
  events.EventEmitter.call(self);

  return self;
}

// inherits
sys.inherits(Epm, events.EventEmitter);