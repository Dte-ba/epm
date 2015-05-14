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
  , _ = require('underscore')
  //, checksum = require('checksum')
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
};

sys.inherits(Explorer, events.EventEmitter);

/**
 * 
 * Discover the current repository
 *
 * @param {requestCallback} cb
 */
Explorer.prototype.discover = function(cb) {
  var self = this;

  var tracked = self.fs.getSync("files-file");

  getFiles(self.PATH, function(err, files){
    if (err && typeof cb === 'function') {
      return cb.apply(self, [err]);
    }

    async.mapLimit(
      // the repository files
      files,
      // limit of tasks
      (process.env.ASYNC_LIMIT || 5),
      // process the files
      function(obj, fn){
        var prev = tracked[obj.filename];

        fileStatus(prev, obj.stats, obj.filename, self.PATH, function(err, st){
          fn && fn(null, { 
            filename: obj.filename,
            hasError: err !== null,
            stats: st.stats,
            code: st.code
          });
        });
      }
    , function(err, results){

      if (err && typeof cb === 'function') {
        return cb.apply(self, [err]);
      }

      var res = {
        deleted: [],
        added: [],
        changed: [],
        unchanged: [],
      };

      // find added, change, deleted, uncahge

      // refresh with current information
      results.forEach(function(fobj){

        // override information
        tracked[fobj.filename] = {
          stats: { mtime: fobj.stats.mtime.valueOf(), size: fobj.stats.size },
          code: fobj.code,
          checksum: fobj.checksum
        };

      });

      var cfnames = results.map(function(fobj){ return fobj.filename; });

      // search deleteds
      var deleteds = _.difference(Object.keys(tracked), cfnames);

      if (deleteds.length > 0) {
        // untrack deleteds
        var delobjs = {};

        deleteds.forEach(function(fname){
          delobjs[fname] = _.clone(tracked[fname]);
          delete tracked[fname];
        });

        res.deleted = Object.keys(delobjs);
      }
      
      // search added
      var addeds = filterTrackeds(tracked, 1);

      if (Object.keys(addeds).length > 0) {
        res.added = Object.keys(addeds);
      }

      // search change
      var changes = filterTrackeds(tracked, 2);

      if (Object.keys(changes).length > 0) {
        res.changed = Object.keys(changes);
      }
      
      // search unchange
      var unchanges = filterTrackeds(tracked, 0);

      if (Object.keys(unchanges).length > 0) {
        res.unchanged = Object.keys(unchanges);
      }

      self.fs.setSync("files-file", tracked);
      cb.apply(self, [null, res, tracked]);

    });

  });

  return self;
};

//
// helpers

function filterTrackeds(tracked, code){
  return _.omit(tracked, Object.keys(tracked).filter(function(fname){ return tracked[fname].code !== code; }));
}


/**
 * Get the file status code
 *
 * and returns async on fn:
 *    -1: file deleted
 *     0: file unchange
 *     1: file added
 *     2: file has changes
 *
 * @param {Object} prev current file status
 * @param {String} filename
 * @param {String} dir file folder
 * @param {requestCallback} fn callbacks
 *
 */
function fileStatus(prev, stat, filename, dir, fn) {
  var fullname = path.join(dir, filename)

  // is a deleted file?
  if (!fs.existsSync(fullname)) {
    return fn && fn(null, { stats: undefined, code: -1});
  }

  // is a file added?
  if (prev == undefined) {
    
    checksum.file(fullname, function (err, sum) {
      fn && fn(null, { stats: stat, code: 1, checksum: sum});
    });

    return;
  }

  var mtimeChange = stat.mtime.valueOf() != prev.stats.mtime;
  var sizeChange = stat.size != prev.stats.size;

  // has changes ?
  if (!mtimeChange && !sizeChange) {
    return fn && fn(null, { stats: stat, code: 0});
  }

  // the file has change
  fn && fn(null, { stats: stat, code: 2});

  // REMOVE THE CHECKSUM TO MANY MEMORY
  // has really changes ?
  // check the file with the checksum
  /*checksum.file(fullname, function (err, sum) {

    var change = prev.checksum !== sum;
    var code = change ? 2 : 0;

    fn && fn(null, { stats: stat, code: code, checksum: sum});
  });*/

}

/**
 * Get files from the `dir` filtered with `pattern`
 *
 * @param {String} dir
 * @param {Regex} pattern
 * @param {requestCallback} fn callback
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