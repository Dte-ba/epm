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
  ;

/**
 * 
 * Initialize a new Explorer instance for `dir` with `ops`.
 *
 * @param {String} dir
 * @param {Db} db
 * @param {EpmFiles} ef FileGateway
 * @param {Object} ops
 */
var Explorer = module.exports = function(dir, db, ef, ops) {
  var self = this;

  if(false === (self instanceof Explorer)) {
      return new Explorer();
  }

  // inherits
  events.EventEmitter.call(self);

  self.db = db;
  self.PATH = dir;
  self.fs = ef;

  self.currentProccesing = 0;

  self.queue = async.queue(function (task, cb) {
    if (self.isWatching === true){
      //console.log(task);
    }
    self.processTask(task, function(err, file){
      if (err) {
        self.emit('file.error', task);
      } else {
        self.emit('file', task);
      }
      cb && cb(null, file);
    });
  }, 1);

  self.queue.drain = function() {
    self.emit('queue.drain', 53);
  };

  return self;
};

sys.inherits(Explorer, events.EventEmitter);

/**
 * 
 * Process a file
 *
 * @param {Object} tesk
 * @param {requestCallback} cb
 */
Explorer.prototype.processTask = function(task, cb) {
  var self = this;

  // task.code
  // -1: file deleted
  //  0: file unchange
  //  1: file added
  //  2: file has changes
  switch(task.code){
    case -1: return self.untrackFile(task, cb);
    case 1: return self.registerFile(task, cb);
    case 2: return self.updateFile(task, cb);
    case 0: 
    default:
      return cb(null, task);  
  }

  return self;
};

Explorer.prototype.untrackFile = function(task, cb) {
  var self = this;
  self.db.files.remove({filename: task.filename}, function(err){
    if (err){
      return cb(err);
    }
    cb(null, task);
  });
  return self;
};

Explorer.prototype.registerFile = function(task, cb) {
  var self = this;
  
  self.db.files.insert(task, function(err){
    if (err){
      return cb(err);
    }
    cb(null, task);
  });
  return self;
};

Explorer.prototype.updateFile = function(task, cb) {
  var self = this;

  self.db.files.update({filename: task.filename}, task, function(err){
    if (err){
      return cb(err);
    }
    cb(null, task);
  });
  return self;
};

/**
 * 
 * Discover the current repository
 *
 * @param {Boolean} callback
 */
Explorer.prototype.discover = function(watch) {
  var self = this;

  self.queue.pause();
  // get the files
  getFiles(self.PATH, function(err, files){
    if (err) {
      return self.emit('error', err);
    }

    async.waterfall([
        function(cb){
          self.currentProccesing = files.length;
          // remove the missing files
          self.db.files.find({filename: { $nin: files.map(function(f){ return f.filename; })}}, function(err, missings){
            if (err){
              return cb(err);
            }
            missings.forEach(function(m){
              m.code = -1;
              self.queue.push(m);
            });

            cb();
          });
        },
        function(cb){
          if (files.length === 0){
            return cb();
          }
          async.each(
            files,
            function(f, fcb){
              self.queue.pause();
              self.db.files.findOne({filename: f.filename}, function(err, prev){

                fileStatus(prev, f.stats, f.filename, self.PATH, function(err, st){
                  /*if (err){
                    return fcb(err);
                  }*/
                  self.queue.push({ 
                    filename: f.filename,
                    hasError: err !== null,
                    stats: st.stats,
                    code: st.code
                  });

                  fcb();
                });

              });
          }, function(err){
            self.queue.resume();
            if (err){
              return cb(err);
            }

            cb();
          });
        }
      ], function(err){
        if (err) {
          return self.emit('error', err);
        }

        if (self.queue.length() === 0) {
          self.emit('queue.drain', 187);
        }

        self.queue.resume();

        if (watch) {
          self.watch(files);
        }
        
    });

  });

  return self;
};

Explorer.prototype.watch = function(files) {
  var self = this;

  var fpathParsed = path.format(path.parse(path.normalize(self.PATH)));

  var debounce = { created: {}, changed: {}, removed: {}};

  // this files are already trackeds
  files.forEach(function(tf){
    debounce.created[tf] = (new Date()).valueOf();
  });

  if (self.isWatching === true) { return self; }

  watch.createMonitor(self.PATH, {filter: _filter, ignoreDotFiles: true}, function (monitor) {
    
    self.watchMonitor = monitor;
    monitor.on("created", function (f, stat) {
      
      if (!_isEvent("created", f)) return;

      //return self._handler("created", { filename: f, stat: stat });
      self.queue.push({ 
          filename: path.basename(f),
          hasError: false,
          stats: {mtime: stat.mtime, size: stat.size},
          code: 1
        });
      if (self.queue.paused === true){
        self.queue.resume();
      }
    });

    monitor.on("changed", function (f, curr, prev) {

      if (!_isEvent("changed", f)) return;
      
      //return self._handler("changed", { filename: f, stat: curr, prevStat: prev });
      self.queue.push({ 
          filename: path.basename(f),
          hasError: false,
          stats: {mtime: curr.mtime, size: curr.size},
          code: 2
        });
      if (self.queue.paused === true){
        self.queue.resume();
      }
    });

    monitor.on("removed", function (f, stat) {

      if (!_isEvent("removed", f)) return;
      
      //return self._handler("removed", { filename: f, stat: stat });
      self.queue.push({ 
          filename: path.basename(f),
          hasError: false,
          stats: {mtime: stat.mtime, size: stat.size},
          code: -1
        });

      if (self.queue.paused === true){
        self.queue.resume();
      }
    });

    self.isWatching = true;
    //console.log('watching ', self.PATH);
    self.emit('watching');
  });

  return self;

  //TODO: set objects from engines  
  function _filter(f){
    var fpath = path.format(path.parse(path.normalize(path.dirname(f))));

    if (fpath === fpathParsed) return true;

    return false;
  }

  function _isEvent(type, f){
    var vof = (new Date()).valueOf();

    if (debounce[type][f] === undefined){
      debounce[type][f] = vof;
      return true;
    }
    
    var diff = vof - debounce[type][f];

    return (diff > 100);
  }
};

Explorer.prototype.stopWatch = function() {
   var self = this;

   if (self.isWatching === true && self.watchMonitor !== undefined) { 
    self.watchMonitor.stop();
   }

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
  /*if (!fs.existsSync(fullname)) {
    return fn && fn(null, { stats: undefined, code: -1});
  }*/

  // is a file added?
  if (prev === undefined || prev === null) {

    fn && fn(null, { stats: {mtime: stat.mtime, size: stat.size}, code: 1});

    return;
  }

  var mtimeChange = stat.mtime.valueOf() != prev.stats.mtime.valueOf();
  var sizeChange = stat.size != prev.stats.size;

  // has changes ?
  if (!mtimeChange && !sizeChange) {
    return fn && fn(null, { stats: {mtime: stat.mtime, size: stat.size}, code: 0});
  }

  // the file has change
  fn && fn(null, { stats: {mtime: stat.mtime, size: stat.size}, code: 2});

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