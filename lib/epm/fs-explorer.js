/*!
 * This file is part of EPM.
 *
 * please see the LICENSE
 */

'use strict';

var sys = require('sys')
  , events = require('events')
  , watch = require('watch')
  , async = require('async')
  , fs = require('graceful-fs')
  , path = require('path')
  ;

/**
 * 
 * Initialize a new Explorer instance for `dir` with `ops`.
 *
 * @param {String} dir
 * @param {EpmFiles} ef FileGateway
 * @param {Object} ops
 */
var Explorer = module.exports = function(dir, ef, ops) {
  var self = this;

  if(false === (self instanceof Explorer)) {
      return new Explorer();
  }

  // inherits
  events.EventEmitter.call(self);

  self.PATH = dir;
  self.fs = ef;

  return self;
}

sys.inherits(Explorer, events.EventEmitter);

/**
 * 
 * Read current repository
 *
 * @param {Boolean} w watch
 */
Explorer.prototype.read = function(w) {
  var self = this;

  w = w === undefined ? false : w;

  getFiles(self.PATH, function(err, files){
    if (err){
      console.error(err);
    }
    console.log(files);
  });

  if (w) {
    self.watch();
  }

  return self
};

/**
 * 
 * Watch current repository
 *
 * @param {Boolean} w watch
 */
Explorer.prototype.watch = function() {
  var self = this;

  if (self.isWatching === true) { return self; }

  self.isWatching = true;

  return self
};


//
// helpers

/**
 * Get the file status code
 *
 * and returns async on fn:
 *    -1: file deleted
 *     0: file unchange
 *     1: file added
 *     2: file has changes
 *
 * @param {Object} prevStats current file status
 * @param {String} filename
 * @param {String} dir file folder
 * @param {Function} fn callbacks
 *
 */
function fileStatus(prevStats, filename, dir, fn) {
  var fullname = path.join(dir, filename)

  // is a deleted file?
  if (!fs.existsSync(fullname)) return fn && fn(null, { stats: undefined, code: -1})

  // is a file added?
  if (prevStats == undefined) return fn && fn(null, { stats: fs.statSync(fullname), code: 1})

  var stat = fs.stat(fullname, function(err, stat){
    var mtimeChange = stat.mtime.valueOf() != prevStats.stats.mtime
    var sizeChange = stat.size != prevStats.stats.size

    // has changes ?
    if (!mtimeChange && !sizeChange) return fn && fn(null, { stats: stat, code: 0})

    // has really changes ?
    // check the file with the checksum
    checksum.file(fullname, function (err, sum) {

      var change = prevStats.checksum !== sum
      var code = change ? 2 : 0

      fn && fn(null, { stats: stat, code: code, checksum: sum})
    })
  })
}

/**
 * Get files from the `dir` filtered with `pattern`
 *
 * @param {String} dir
 * @param {Regex} pattern
 * @param {Function} fn callback
 */
function getFiles(dir, pattern, fn) {

  if ("function" === typeof pattern) {
    fn = pattern;
    pattern = undefined;
  }

  pattern = pattern || /.*/ig;

  fs.readdir(dir, function(err, files){
    if (err) return fn && fn(err);

    async.map(
      files,
      function(f, cb) {
        fs.stat(path.join(dir, f), function(err, stats){
          if (err) return cb && cb(err);

          cb && cb(null, { filename: f, stats: stats })  
        })
      },
      function(err, stats){
        if (err) return fn && fn(err);

        var fstats = stats.filter(function(f){
          return f.stats.isFile() && pattern.test(f.filename);
        });

        fn && fn(null, fstats);
    });

  });
}