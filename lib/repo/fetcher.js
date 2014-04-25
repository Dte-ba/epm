/*!
 * This file is part of EPM.
 *
 * please see the LICENSE
 */

var fetcher = module.exports = {}

var log = require("../log")
  , fs = require("graceful-fs")
  , url = require("url")
  , async = require("async")
  , request = require("request")
  , path = require("path")


fetcher.fetch = fetch

function fetch(repo, ops, cb) {
  
  if (typeof ops === "function") {
    cb = ops
    ops = {}
  }

  if (ops.remote === undefined) 
    return cb && cb(new Error('Unknown remote'))

  log.verbose('fetch', 'checking repository')
  log.pause()

  async.waterfall([
    
    function(cb){
      __readRemote(repo, ops, cb)
    },
    function(remote, cb){
      __fetch(repo, remote, ops, cb)
    }

  ], function(err){
    log.resume()
    if (err) return cb && cb(err)

    return cb && cb(null) 
  })

}

function __readRemote(repo, ops, cb){
  
  var rtes = repo.file.getSync("remotes-file")

  if (rtes[ops.remote] === undefined) 
      return cb && cb(new Error('Unknown remote `' + ops.remote + '`'))

  var obj = rtes[ops.remote]
  obj.name = ops.remote

  cb && cb(null, obj)

}

function __fetch(repo, remote, ops, cb){
  var uri = url.parse(remote.url)

  var isUrl = (uri.slashes === true && uri.protocol !== undefined)

  // is a url
  if (isUrl){
    return __fetchExternal(repo, uri, remote, ops, cb)
  }

  return __fetchLocal(repo, uri, remote, ops, cb)

}

function __fetchExternal(repo, uri, remote, ops, cb){
  

  var servUri = uri.href.substring(0, uri.href.lastIndexOf('/') + 1)
  
  async.waterfall([
    function(cb){
      log.verbose('fetch', 'fetching ...')
      log.pause()

      request(servUri, function (err, res, body) {
        log.resume()
        if (err) return cb && cb(err)

        if (res.statusCode == 200) {
          var info = JSON.parse(body)

          if (info.type !== 'epm')
            return cb && cb(new Error('`' + servUri + '` is not a EPM repository'))

          log.verbose('fetch', 'finded EPM repository ' + info.version + ' at `' + servUri + '`')

          cb && cb(null, info)
        } // TODO: do something with diferent code

      })

    },
    function(info, cb){
      log.verbose('fetch', 'fetching ' + remote.name + ' ...')
      log.pause()

      request(uri.href, function (err, res, body) {
        log.resume()
        if (err) return cb && cb(err)

        if (res.statusCode == 200) {
          var pkgs = JSON.parse(body)
          log.verbose('fetch', 'finded ' + Object.keys(pkgs).length + ' packages')

          cb && cb(null, pkgs)
        }
      })

    }
  ], function(err, result){
    if (err) return cb && cb(err)
    
    repo.file.setSync('remote-folder', remote.name, result, { json: true })

    cb && cb(null, result)
  })
  
}

function __fetchLocal(repo, uri, remote, ops, cb){
  log.verbose('fetch', 'fetching local')
  cb && cb(null)
}