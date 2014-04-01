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


var _dir

function serve(dir, port, cb) {
  
  if (typeof port === "function") {
    cb = port
    dir = undefined
  }

  if (typeof dir === "function") {
    cb = port
    port = undefined
    dir = undefined
  }

  port = port || 322
  dir = dir || "."

  _dir = dir

  serveRepos(port, dir, function(){

     cb && cb(null, "TODO: clone")  
  })
  
}


//
// private function

var rlib = {
  repo: XRegExp('^\/(?<repo>[a-zA-Z0-9_\-]+)\\.epm$', 'g')
}

var rotes = {
  "/": __info
}

function serveRepos(port, dir, fn) {

  http.createServer(_handler).listen(port)
  log.info("serve", "serving " + dir + " repos at http://127.0.0.1:" + port)
  epm.serving = true
}

function _handler(req, res) {

  if (req.method !== 'GET') {
    res.writeHead(405)
    res.end('Unsupported request method', 'utf8')
    return
  }

  // is retriving a repo
  var match = XRegExp.exec(req.url, rlib.repo)
  if (match && match.length > 0) {
    var l = match[1]
    __metadata(l, req, res)
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

function __metadata(repo, req, res) {
  
  var p = path.resolve(path.join(_dir, repo))

  check.repo(p, function(err){
    if (err) {
      log.error(err)
      return writeError("Repository doesn't exists", res, 404)
    }

    epm.response.stdout = res
    epm.commands["status"]({ path: p  }, function(err, data){
      if (err) return writeError(err, res)
      
      log.info("status", "response writed")
    })
  })
  
}

function writeError(err, res, statusCode) {
  statusCode = statusCode || 500
  res.setHeader('Content-Type', 'application/json')
  res.writeHead(statusCode)
  res.end(JSON.stringify({error: err}))
}