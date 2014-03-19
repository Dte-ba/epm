/*!
 * This file is part of EPM.
 *
 * please see the LICENSE
 */
 
var fs = require('fs')
  , mkdirp = require('mkdirp')
  , path =require('path')
  , wrench = require('wrench')
  , XRegExp = require('xregexp').XRegExp
  ;

/**
 * Expose functions
 */
exports.write = write;
exports.emptyDirectory = emptyDirectory;
exports.emptyDirectorySync = emptyDirectorySync;
exports.mkdir = mkdir;
exports.mkdirSync = mkdirSync;
exports.getDirectories = getDirectories;
exports.readUtf8 = readUtf8;
exports.readdirRecursive = readdirRecursive;
exports.readdirRecursiveSync = readdirRecursiveSync;
exports.getType = getType;
exports.getFiles = getFiles;

/**
 * echo `str` > `file`.
 *
 * @param {String} filename
 * @param {String} str
 * @param {Boolean} log
 */

function write(file, str, log, fn) {
  if (log && typeof log === 'function') {
   fn = log;
   log = false;
  }

  fs.writeFile(file, str, function(err){
    if (log)
      console.log('   \x1b[36msaved\x1b[0m :', file);  
    fn && fn(err);

  });
  
}


/**
 * Mkdir -p.
 *
 * @param {String} dir
 * @param {Function} fn
 */

function mkdir(dir, log, fn) {
  if (log && typeof log === 'function') {
   fn = log;
   log = false;
  }

  mkdirp(dir, 0755, function(err){
    if (err) throw err;
    if (log) {
      console.log(' \x1b[36mcreated\x1b[0m :', dir);  
    }
    fn && fn(null);
  });
}

/**
 * Mkdir -p sync.
 *
 * @param {String} dir
 */

function mkdirSync(dir, log) {
 
  mkdirp.sync(dir, 0755);

  if (log) {
    console.log(' \x1b[36mcreated\x1b[0m :', dir);  
  }

}

/**
 * Check if the given directory `dir` is empty.
 *
 * @param {String} dir
 * @param {Function} fn
 * @param {Boolean} log
 */

function emptyDirectory(dir, fn) {

  fs.readdir(dir, function(err, files){
    if (err && 'ENOENT' != err.code) throw err;
    fn(!files || !files.length);
  });
}

/**
 * Check if the given directory `dir` is empty (synchronously).
 *
 * @param {String} dir
 * @param {Function} fn
 * @param {Boolean} log
 */

function emptyDirectorySync(dir, fn) {

  var files = fs.readdirSync(dir);

  return !files || !files.length;

}


/**
 * Get list of directories `dir` from synchronously
 *
 * @param {String} dir
 */
function getDirectories(dir) {
  return fs.readdirSync(dir)
      .filter(function(item){
        return fs.statSync(path.join(dir, item)).isDirectory();
      });
}

/**
 * Read the `file` with utf8 enconding
 *
 * @param {String} file
 */
 function readUtf8(file, fn){

    fs.readFile(file, 'utf8', fn);

 }


/**
 * Read the `dir` and returns an array like filtered by `ignore`
 * [{ target: 'filename', type: 'file' }
 * { target: 'foldername', type: 'directory' }]
 *
 * @param {String} dir
 * @param {Array} ignore
 */
function readdirRecursiveSync(dir, ignore) {

  return readdir(dir, ignore);

}

/**
 * Read the `dir` and returns an array like filtered by `ignore`
 * [{ target: 'filename', type: 'file' }
 * { target: 'foldername', type: 'directory' }]
 *
 * @param {String} dir
 * @param {Array} ignore
 */
function readdirRecursive(dir, ignore, fn) {

  var files = wrench.readdirSyncRecursive(dir);

  var toignore = XRegExp.union( ignore );

  var res = files
            .filter(function(item){
                return !toignore.test( item );
            })
            .map(function(item){
              return { target: item, type: getType( path.join(dir, item) ) }
            });
  
  fn && fn(null, res);

  return res;
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

  fs.readdir(dir, function(err, files){
    if (err) return fn && fn(err);

    var ff = files.filter(function(f){
      if (!fs.statSync(path.join(dir, f)).isFile()) return false;
      
      if (pattern === undefined) return true

      return pattern.test(f);
    });

    fn && fn(null, ff);

  });

}

/**
 * Return the type of `target`
 * - file
 * - directory
 *
 * @param {String} target
 */
function getType(target) {
  var stat = fs.statSync(target);

  if (stat.isDirectory()) return 'directory';

  if (stat.isFile()) return 'file';

  return 'undefined'
}