/*!
 * This file is part of EPM.
 *
 * please see the LICENSE
 */

var fs = require('graceful-fs');
var path = require('path');

module.exports = finder = {};

// Find epm repositories
finder.find = function(folder, cb) {
  if (folder === undefined) {
    return cb && cb(null, []);
  }
  
  folder = path.resolve(folder);
  
  getDirectories(folder, function(err, dirs){

    // is root folder a repo
    if (isRepoSync(dirs)) {
      cb && cb(null, [getInfoSync(folder)]);
    } else {

      var epms = dirs
                .map(function(dir){ return path.join(folder, dir)})
                .filter(function(dir){
                  return isRepoSync(dir);
                });
      cb && cb(null, epms.map(getInfoSync));
    }
    
  });

};

//
// helpers

/**
 * Get the info of the repository on `dir` sync
 *
 * @param {String} dir
 */

function getInfoSync(dir) {
  var fullname = path.join(dir, '.epm/CONFIG');
  if (!fs.existsSync(fullname)) {
    return {
      name: 'unknown',
      engine: 'unknown',
      path: dir
    };
  }

  var info = JSON.parse(fs.readFileSync(fullname, 'utf-8'));

  return {
      name: info.name || 'unknown',
      engine: info.engine || 'unknown',
      path: dir
    };
};

/**
 * Get list of directories `dir` from asynchronously
 *
 * @param {String} dir
 * @param {Function} cb
 */
function getDirectories(dir, cb) {
  fs.readdir(dir, function(err, objects){
    if (err) { return cb && cb(err); }

    var dirs = objects.filter(function(item){
      return fs.statSync(path.join(dir, item)).isDirectory();
    });

    cb && cb(null, dirs)
  })
}

/**
 * Get list of directories `dir` from synchronously
 *
 * @param {String} dir
 * @param {Function} cb
 */
function getDirectoriesSync(dir) {
  return fs.readdirSync(dir)
      .filter(function(item){
        return fs.statSync(path.join(dir, item)).isDirectory();
      });
}

/**
 * Define if `dir` is a Epm repository
 *
 * @param {String} dir
 */
function isRepoSync(dir){
  var dirs

  if (dir instanceof Array){
    dirs = dir
  } else {
    dirs = getDirectoriesSync(dir)
  }

  var res = dirs.filter(function(name){ 
    return name.match(/\.epm/ig)
  });
  return res.length > 0;
}