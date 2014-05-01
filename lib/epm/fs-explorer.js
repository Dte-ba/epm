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
  , checksum = require('checksum')
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

  var tracked = self.fs.getSync("files-file");

  getFiles(self.PATH, function(err, files){
    if (err){
      return self._error(err);
    }
    
    async.mapLimit(
      files,
      (process.env.ASYNC_LIMIT || 5),
      function(obj, cb){ 
        var prev = tracked[obj.filename];

        fileStatus(prev, obj.stats, obj.filename, self.PATH, function(err, st){
          cb && cb(null, { 
            filename: obj.filename,
            hasError: err !== null,
            stats: st.stats,
            code: st.code,
            checksum: st.checksum || prev.checksum
          });
        });

      },
      function(err, currents){ 
        if (err){
          return self._error(err);
        }

        // find added, change, deleted, uncahge

        // refresh with current information
        currents.forEach(function(fobj){

          // override information
          tracked[fobj.filename] = {
            stats: { mtime: fobj.stats.mtime.valueOf(), size: fobj.stats.size },
            code: fobj.code,
            checksum: fobj.checksum
          };

        });

        var cfnames = currents.map(function(fobj){ return fobj.filename; });

        // search deleteds
        var deleteds = _.difference(Object.keys(tracked), cfnames);

        if (deleteds.length > 0) {
          // untrack deleteds
          var delobjs = {};

          deleteds.forEach(function(fname){
            delobjs[fname] = _.clone(tracked[fname]);
            delete tracked[fname];
          });

          self.emit('file.deleted', delobjs);
        }
        
        // search added
        var addeds = filterTrackeds(tracked, 1);

        if (Object.keys(addeds).length > 0) {
          self.emit('file.added', addeds);
        }

        // search change
        var changes = filterTrackeds(tracked, 2);

        if (Object.keys(changes).length > 0) {
          self.emit('file.change', changes);
        }
        
        // search unchange
        var unchanges = filterTrackeds(tracked, 0);

        if (Object.keys(unchanges).length > 0) {
          self.emit('file.unchange', unchanges);
        }

        self.fs.setSync("files-file", tracked);
      }
    );

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

  watch.createMonitor(self.PATH, function (monitor) {
      
    //TODO: set objects from engines
    monitor.files[self.PATH + '/.zip']

    monitor.on("created", function (f, stat) {
      return self._handler("created", { filename: f, stat: stat });
    });

    monitor.on("changed", function (f, curr, prev) {
      return self._handler("changed", { filename: f, stat: curr, prevStat: prev });
    });

    monitor.on("removed", function (f, stat) {
      return self._handler("removed", { filename: f, stat: stat });
    });

    self.isWatching = true;
  });

  return self
};

Explorer.prototype._handler = function(type, info) {
  var self = this;
  
  var tracked = self.fs.getSync("files-file");
  var filename = path.basename(info.filename);

  var prev = tracked[filename];

  fileStatus(prev, info.stat, filename, self.PATH, function(err, data) {
    if (err){
      self.emit("file.error", err);
      return self;
    }
    
    var res = {};
    res[filename] = {};

    var ev = "file.";

    switch(data.code){
       case -1: //*    -1: file deleted
        ev += "deleted";
        res[filename] = prev;
       break;
       case  0: //*     0: file unchange
        ev += "unchange";
        res[filename] = prev;
       break;
       case  1: //*     1: file added
        ev += "added";
        res[filename] = {
            stats: { mtime: data.stats.mtime.valueOf(), size: data.stats.size },
            code: data.code,
            checksum: data.checksum
          };
       break;
       case  2: //*     2: file has changes
        ev += "change";
        res[filename] = {
            stats: { mtime: data.stats.mtime.valueOf(), size: data.stats.size },
            code: data.code,
            checksum: data.checksum
          };
       break;
    }
    
    // update trackeds
    tracked[filename] = res[filename];
    self.fs.setSync("files-file", tracked);

    self.emit(ev, res);

  });

  return self
};

/**
 * 
 * Reside errors
 *
 * @param {Error} err
 */
Explorer.prototype._error = function(err) {
  var self = this;

  self.emit('error', err);

  return self
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
 * @param {Function} fn callbacks
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

  // has really changes ?
  // check the file with the checksum
  checksum.file(fullname, function (err, sum) {

    var change = prev.checksum !== sum;
    var code = change ? 2 : 0;

    fn && fn(null, { stats: stat, code: code, checksum: sum});
  });

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