/*!
 * This file is part of EPM.
 *
 * please see the LICENSE
 */

'use strict';

var sys = require('sys')
  , events = require('events')
  , _ = require('underscore')
  , TagsLexer = require('./tags-lexer.js')
  ;

/**
 * 
 * Initialize a new EpmTags instance with `ops`.
 *
 * @param {FileGetawey} fg
 * @param {Object} ops
 */
var EpmTags = module.exports = function(fg, ops) {
  var self = this;

  if(false === (self instanceof EpmTags)) {
      return new EpmTags();
  }

  // inherits
  events.EventEmitter.call(self);

  self.fs = fg;
  self.lexer = new TagsLexer(self.fs, ops);

  return self;
}

sys.inherits(EpmTags, events.EventEmitter);

/**
 * 
 * Parse all tags a return them
 *
 */
EpmTags.prototype.all = function(ops, cb){
  var self = this;

  if (typeof ops === 'function'){
    cb = ops;
    ops = {}
  }

  var scapes = self.lexer.all();

  var res = Object.keys(scapes).map(function(w){
    return scapes[w][0];
  });

  cb && cb(null, res);

  return self;
}