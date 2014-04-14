/*!
 * This file is part of EPM.
 *
 * please see the LICENSE
 */
var log = require("../log")
 , epm = require("../epm.js")
 , http = require("http")
 , XRegExp = require('xregexp').XRegExp
 , util = require('util')
 , path = require('path')
 , check = require("../check")
 , io = require("../utils/io")
 , url = require("url")
 , querystring = require("querystring")
 , refresh = require("../refresh")
 , fs = require("graceful-fs")
 , mime = require('mime')

var server = module.exports = {}

var rlib = {
  repo: XRegExp('^\/(?<repo>[a-zA-Z0-9_\-]+)\\.epm$', 'g')
}

var rotes = {
  "/": __info
}

var _repos = {}
  , _repoPath = ''

server.createServer = function(ops){
  
  _repoPath = path.resolve(ops.path)
  // get repos on ops.path
  // and seva data on _repos
  _repos = __refreshRepos()
  __listenRepos()

  var se = http.createServer(_handler)

  se.on('close', function(){
    log.info("serve", "close")
    epm.serving = false
  })

  se.on('error', function(err){
    log.error('serve', err)
  })

  return se
}

//
// private function


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

function __resolve(reponame, query, req, res) {
  if (Object.keys(query).length === 0)
    return __metadata(reponame, req, res)

  if (query.file !== undefined)
    return __file(reponame, query.file, req, res)
}

function __metadata(reponame, req, res) {
  
  var repo = _repos[reponame]

  if (repo === undefined) {
    log.error("Doesn't matches for " + reponame)
    return writeError("Repository doesn't exists", res, 404)
  }

  repo.packages(function(err, data){
    if (err) return writeError(err, res)
    
    res.setHeader('Content-Type', 'application/json')
    res.writeHead(200)
    res.end(JSON.stringify(data))

    log.verbose("serv", "response writed")
  })
  
}

function __file(repo, uid, req, res) {
  var repo = _repos[reponame]

  if (repo === undefined) {
    log.error("Doesn't matches for " + reponame)
    return writeError("Repository doesn't exists", res, 404)
  }

  repo.packages(function(err, data){
    if (err) return writeError(err, res)
    
    var p = data.trackeds[uid]

    if (p === undefined){
      log.error("Doesn't matches for " + uid)
      return writeError("Packages `" + uid + "` doesn't exists", res, 404)
    }

    res.setHeader('Content-Type', 'application/json')
    res.writeHead(200)
    res.end(JSON.stringify(data))
    
    var filename = repo.resolve(p.filename)

    var stat = fs.statSync(filename);

    res.writeHead(200, {
        'Content-Type': mime.lookup(filename),
        'Content-Length': stat.size,
        'Content-disposition': 'attachment; filename=' + uid + path.extname(filename)
    })

    var rs = fs.createReadStream(filename)
    
    rs.pipe(res)

    log.verbose("serv", "file sended " + p.filename)
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
  
  var res = {}

  var dirs = io.getDirectories(_repoPath)

  if (dirs.length === 0) throw new Error('`' + + '` has not repos')

  // is root folder a repo
  if (isRepo(dirs)) {
    var nr = new epm.EpmRepo(_repoPath)
    res[nr.name] = nr

    return res
  }

  dirs.forEach(function(dir){

    var sub = path.join(_repoPath, dir)

    if (isRepo(sub)) {
      var nr = new epm.EpmRepo(sub)
      res[nr.name] = nr
    }

  })

  return res
}

function isRepo(dir){
  var dirs

  if (dir instanceof Array){
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