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
  , url = require("url")
  , request = require("request")
  , async = require("async")
  ;

/**
 * 
 * Initialize a new EpmFetcher
 *
 * @param {FileGateway} fg
 * @param {Object} remote
 * @param {Object} ops
 */
var EpmFetcher = module.exports = function(remote, fg, ops) {
  var self = this;

  if(false === (self instanceof EpmFetcher)) {
      return new EpmFetcher();
  }
  
  // inherits
  events.EventEmitter.call(self);

  self.fs = fg;
  self.remote = remote;

  return self;
}

sys.inherits(EpmFetcher, events.EventEmitter);


/**
 * 
 * Start retrieve `remote` repository
 *
 * @param {Function} cb callback
 */
EpmFetcher.prototype.retrieve = function() {
  var self = this;

  var uri = url.parse(self.remote.url)
  var isUrl = (uri.slashes === true && uri.protocol !== undefined)

  return isUrl === true 
              ? self.retrieveExternal() 
              : self.retrieveLocal();
}

/**
 * 
 * Retrieve from extarnal source
 *
 * @param {Function} cb callback
 */
EpmFetcher.prototype.retrieveExternal = function() {
  var self = this;

  var uri = url.parse(self.remote.url);
  var servUri = uri.href.substring(0, uri.href.lastIndexOf('/') + 1)
  
  async.waterfall([
    function(cb){
      
      self.emit('status', 'Retrieving server information');

      request(servUri, function (err, res, body) {
        
        if (err) {
          self.emit('error', err);
          return cb && cb(err);
        }

        if (res.statusCode === 200) {

          try{
            var info = JSON.parse(body);

            if (info.type !== 'epm'){
              var eerr = new Error('`' + servUri + '` is not a EPM repository');
              self.emit('error', eerr);
              return cb && cb(eerr);
            }

            self.emit('status', 'Finded EPM repository ' + info.version + ' at `' + servUri + '`');

            cb && cb(null, info);
          } catch(ce){
            var cerr = new Error('Error trying parse requested body');
            self.emit('error', cerr);
            cb && cb(cerr);
          }
          
        } else {
          var serr = new Error('Unknown status ' + res.statusCode);
          self.emit('error', serr);
          return cb && cb(serr);
        }

      })

    },
    function(info, cb){
      self.emit('status', 'Fetching ' + uri.href);

      request(uri.href, function (err, res, body) {
        
        if (err) {
          self.emit('error', err);
          return cb && cb(err);
        }

        if (res.statusCode === 200) {

          try{
            var pkgs = JSON.parse(body);
            cb && cb(null, pkgs);
          } catch(ce){
            var cerr = new Error('Error trying parse requested body');
            self.emit('error', cerr);
            cb && cb(cerr);
          }

        } else {
          var serr = new Error('Unknown status ' + res.statusCode);
          self.emit('error', serr);
          return cb && cb(serr);
        }

      })

    }
  ], function(err, result){
    if (err) {
      self.emit('error', err);
    }

    self.fs.setSync('remote-folder', self.remote.name, result, { json: true });
    self.emit('complete', result);
  })

  return self;
}

/**
 * 
 * Start retrieve `remote` repository
 *
 * @param {Function} cb callback
 */
EpmFetcher.prototype.retrieveLocal = function() {
  var self = this;

  throw new Error('Not implemented');

  return self;
}