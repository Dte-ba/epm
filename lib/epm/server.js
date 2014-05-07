/*!
 * This file is part of EPM.
 *
 * please see the LICENSE
 */

'use strict';

module.exports = function(Epm) {

  var sys = require('sys')
    , events = require('events')
    , http = require('http')
    , fs = require('graceful-fs')
    , path = require('path')
    , url = require("url")
    , querystring = require("querystring")
    , mime = require("mime")
    , async = require("async")
    ;

  /**
   * 
   * Initialize a new EpmServer instance for `dir` with `ops`.
   *
   * @param {String} dir
   * @param {Object} ops
   */
  var EpmServer = function(dir, ops) {
    var self = this;

    if(false === (self instanceof EpmServer)) {
        return new EpmServer();
    }

    // inherits
    events.EventEmitter.call(self);

    self.PATH = dir;
    self.repos = {};
    self.version = require('../../package.json').version;
    self.routes = {};

    self.configureRotes();
    
    return self;
  }

  sys.inherits(EpmServer, events.EventEmitter);


  /**
   * 
   * Start to listen
   *
   * @param {Object} ops
   */
  EpmServer.prototype.listen = function(ops){
    var self = this;

    ops = ops || {};
    ops.port = ops.port || 3220;

    self.findRepositories(function(err, direpms){
      
      // instance Epm's
      var epms = direpms.map(function(edir){
        var e = new Epm(edir);
        return e;
        //self.repos[e.REPONAME] = e;
      });

      var watchTasks = epms.map(function(e){
        return function(cb){
          e.once('ready', function(data){
            console.log(e.REPONAME + ' ready');
            self.repos[e.REPONAME] = e;

            cb && cb(null, e);
          });

          e.read(true);
        };
      });

      // instance the repo
      self.server = http.createServer(function(req, res){
        self.handler.apply(self, [req, res]);
      });

      // watch all repos
      async.series(
        watchTasks
        , function(err, results){

          // create routes for repos
          Object.keys(self.repos).forEach(function(rname){
            self.routes["/" + rname + ".epm"] = function(req, res){
              var repo = self.repos[rname];
              repo.request.apply(repo, [self, req, res])
            };
          });

          // now listen
          self.server.listen(ops.port, function(err) {
            if (err) {
              self.emit('error', err);
              return;
            }

            self.emit('listen', { url: 'http://127.0.0.1:' + ops.port, path: self.PATH, public_repos: Object.keys(self.repos) });
            
          });

        });

      

    });

    return self;
  }

  /**
   * 
   * Configure server routes
   *
   */
  EpmServer.prototype.configureRotes = function(){
    var self = this;

    // info route
    self.routes["/"] = function(req, res){
      res.setHeader('Content-Type', 'application/json')
      res.writeHead(200)
      res.end( JSON.stringify( self.info() ) )
    };

    return self;
  }

  /**
   * 
   * Start to listen
   *
   * @param {Object} ops
   */
  EpmServer.prototype.info = function(){
    var self = this;

    return {
      type: 'epm',
      version: self.version,
      repos: Object.keys(self.repos)
    };
  }

  /**
   * 
   * Server hanlder function
   *
   * @param {Object} req
   * @param {Object} res
   */
  EpmServer.prototype.handler = function(req, res){
    var self = this;

    if (req.method !== 'GET') {
      self.writeError(new Error('Unsupported request method'), res, 405);
      return self;
    }

    var purl = url.parse(req.url);
    var route = self.routes[purl.pathname];
    
    if (route === undefined) {
      self.writeError(new Error('Not Found'), res, 404);
      return self;
    }

    route.apply(self, [req, res]);

    return self;
  }

  /**
   * 
   * Find repositories on `self.PATH`
   *
   * @param {Object} ops
   * @param {Function} fn
   */
  EpmServer.prototype.findRepositories = function(ops, cb){
    var self = this;

    if (typeof ops === 'function'){
      cb = ops 
      ops = { watch: false }
    }

    getDirectories(self.PATH, function(err, dirs){

      // is root folder a repo
      if (isRepoSync(dirs)) {
        cb && cb(null, [self.PATH]);
      } else {

        var epms = dirs
                  .map(function(dir){ return path.join(self.PATH, dir)})
                  .filter(function(dir){
                    return isRepoSync(dir);
                  });
        cb && cb(null, epms);
      }

      if (ops.watch){
        //TODO: watch
      }
      
    });

    return self;
  }

  /**
   * Write request error on `res`
   *
   * @param {Object} obj
   * @param {Object} res
   * @param {int} statusCode
   */
  EpmServer.prototype.write = function(info, res, statusCode) {
    var self = this;

    statusCode = statusCode || 200;

    if (info.type === 'json'){

      res.setHeader('Content-Type', 'application/json');
      res.writeHead(statusCode);
      res.end(JSON.stringify(info.data));

    } else if (info.type === 'file') {

      res.writeHead(statusCode, {
          'Content-Type': mime.lookup(info.filename),
          'Content-Length': info.stats.size,
          'Content-disposition': 'attachment; filename=' + info.attached
      });

      var rs = fs.createReadStream(info.filename);
      
      rs.pipe(res);
    }

    return self;
  }

  /**
   * Write request error on `res`
   *
   * @param {Error} err
   * @param {Object} res
   * @param {int} statusCode
   */
  EpmServer.prototype.writeError = function(err, res, statusCode) {
    var self = this;

    statusCode = statusCode || 500;
    res.setHeader('Content-Type', 'application/json');
    res.writeHead(statusCode);
    res.end(JSON.stringify({ error: err.toString() }));

    return self;
  }

  //
  // helpers

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

  return EpmServer;
}