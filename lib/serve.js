/*!
 * This file is part of EPM.
 *
 * please see the LICENSE
 */

module.exports = serve

var log = require("./log")
 , epm = require("./epm.js")
 , http = require("http")
 , XRegExp = require('xregexp').XRegExp
 , util = require('util')
 , path = require('path')
 , check = require("./check")
 , io = require("./utils/io")
 , url = require("url")
 , querystring = require("querystring")
 , refresh = require("./refresh")
 , fs = require("graceful-fs")
 , mime = require('mime')


var _dir
var _server
var _cfg = epm.config

function serve(ops, cb) {
  
  if (typeof ops === "function") {
    cb = ops
    ops = {}
  }

  ops.port = ops.port || 3220
  ops.path = ops.path || "."

  _dir = path.resolve(ops.path )

  serveRepos(ops, cb)
  
}


//
// private function

var rlib = {
  repo: XRegExp('^\/(?<repo>[a-zA-Z0-9_\-]+)\\.epm$', 'g')
}

var rotes = {
  "/": __info
}

var _repos = []
  , _repoPath = ''

function serveRepos(ops, cb) {

  _repoPath = path.resolve(ops.path)
  // get repos on ops.path
  // and seva data on _repos
  _repos = __refreshRepos()
  __listenRepos()

  _server = http.createServer(_handler)

  _server.on('close', function(){
    log.info("serve", "close")
    epm.serving = false
  })

  _server.on('error', function(err){
    log.error('serve', err)
  })

  _server.listen(ops.port, function(err) {
    if (err) return cb && cb(err)

    log.info("serve", "serving `" + ops.path + "` repos at http://127.0.0.1:" + ops.port)
    epm.serving = true
  })
}

function _handler(req, res) {

  if (req.method !== 'GET') {
    res.writeHead(405)
    res.end('Unsupported request method', 'utf8')
    return
  }
  var purl = url.parse(req.url)
  var query = querystring.parse(purl.query)

  // is retriving a repo
  var match = XRegExp.exec(purl.pathname, rlib.repo)
  if (match && match.length > 0) {
    var l = match[1]
    __resolve(l, query, req, res)
    return
  }

  var route = rotes[req.url]

  if (route === undefined) {
    res.writeHead(404)
    res.end('Not Found', 'utf8')
    return
  }

  return route(req, res)
}

function __info(req, res) {

  res.setHeader('Content-Type', 'application/json')
  res.writeHead(200)
  res.end(JSON.stringify({ type: 'epm', version: epm.version}))

}

function __resolve(repo, query, req, res) {
  if (Object.keys(query).length === 0)
    return __metadata(repo, req, res)

  if (query.file !== undefined)
    return __file(repo, query.file, req, res)
}

function __file(repo, uid, req, res) {
  var matches = _repos.filter(function(r){
    return r.name === repo.toLowerCase()
  })

  if (matches.length === 0) {
    log.error("Doesn't matches for " + repo)
    return writeError("Repository doesn't exists", res, 404)
  }

  var p = matches[0].path

  refresh({ path: p }, function(err, data){
    if (err) {
      log.error(err)
      return writeError(err, res, 500)
    }
    var files = data.trackeds.files

    var f = Object.keys(files).filter(function(f){
      return files[f] === uid
    })

    if (f.length === 0){
      log.error("Doesn't matches for " + uid)
      return writeError("Packages `" + uid + "` doesn't exists", res, 404)
    }

    var filename = path.join(p, f[0])

    var stat = fs.statSync(filename);

    res.writeHead(200, {
        'Content-Type': mime.lookup(filename),
        'Content-Length': stat.size,
        'Content-disposition': 'attachment; filename=' + uid + path.extname(filename)
    });

    var rs = fs.createReadStream(filename);
    
    rs.pipe(res);

  })
}

function __metadata(repo, req, res) {
  
  var matches = _repos.filter(function(r){
    return r.name === repo.toLowerCase()
  })

  if (matches.length === 0) {
    log.error("Doesn't matches for " + repo)
    return writeError("Repository doesn't exists", res, 404)
  }

  var p = matches[0].path

  check.repo(p, function(err){
    if (err) {
      log.error(err)
      return writeError("Repository doesn't exists", res, 404)
    }

    epm.response.stdout = res
    epm.commands["show"]('all', { path: p  }, function(err, data){
      if (err) return writeError(err, res)
      
      log.verbose("serv", "response writed")
    })
  })
  
}

function writeError(err, res, statusCode) {
  statusCode = statusCode || 500
  res.setHeader('Content-Type', 'application/json')
  res.writeHead(statusCode)
  res.end(JSON.stringify({error: err}))
}

// refresh repos information sync
function __refreshRepos(){
  
  var res = []

  var dirs = io.getDirectories(_repoPath)

  if (dirs.length === 0) throw new Error('`' + + '` has not repos')

  // is root folder a repo
  if (isRepo(dirs)) {
    res.push({
      path: _repoPath,
      name: _cfg.get(_repoPath, "name")
    })

    return res
  }

  dirs.forEach(function(dir){

    var sub = path.join(_repoPath, dir)

    if (isRepo(sub)) {
      res.push({
        path: sub,
        name: _cfg.get(sub, "name")
      })
    }

  })

  return res
}

function isRepo(dir){
  var dirs

  if (typeof dir === "object" || typeof dir === "array"){
    dirs = dir
  } else {
    dirs = io.getDirectories(dir)
  }

  var res = dirs.filter(function(name){ 
    return name.match(/\.epm/ig)
  })

  return res.length > 0
}

function __listenRepos(){
  // TODO: listen repos at runtime
}