/*!
 * This file is part of EPM.
 *
 * please see the LICENSE
 */

'use strict';

var sys = require('sys')
  , events = require('events')
  , _ = require('underscore')
  , wordsUtils = require('../utils/words.js') // move to [epm-words]
  ;

/**
 * 
 * Initialize a new TagsLexer instance with `ops`.
 *
 * @param {FileGetawey} fg
 * @param {Object} ops
 */
var TagsLexer = module.exports = function(fg, ops) {
  var self = this;

  if(false === (self instanceof TagsLexer)) {
      return new TagsLexer();
  }

  // inherits
  events.EventEmitter.call(self);

  self.fs = fg;

  return self;
}

sys.inherits(TagsLexer, events.EventEmitter);

/**
 * 
 * Parse all tags a return them
 *
 */
TagsLexer.prototype.all = function(){
  var self = this;

  var ftags = self.fs.getSync('tags-file');

  var scapes = {};

  Object.keys(ftags).forEach(function(uid){
    var tags = ftags[uid];
    tags.forEach(function(tag){
      
      var we = wordsUtils.escape(tag);

      if (scapes[we] === undefined){
        scapes[we] = [];
      }

      if (!_.contains(scapes[we], we)) {
        scapes[we].push(we);
      }

    });
  });

  return scapes;

}