/*!
 * EPM
 *
 * Copyright(c) 2014 Dirección de Tecnología Educativa de Buenos Aires (Dte-ba)
 * GPL Plublic License v3
 */

;!function() {

  var EventEmitter = require("events").EventEmitter
    , log = require('./log')
    , epm = module.exports = new EventEmitter
    , SepEngine = require('./sep')
    , EpmResponse = require('./response')
    , fs = require('graceful-fs')
    , EpmRepo = require('./repo')
    , EpmServer = require('./repo/server')

  epm.config = require('./conf')
  epm.cliOps = { } // command line options
  epm.commands = { } // epm commands
  epm.version = require("../package.json").version
  epm.program = undefined
  epm.serving = false
  epm.engine = new SepEngine()
  epm.log = log
  epm.EpmRepo = EpmRepo
  epm.server = EpmServer

  // as default transform on console
  epm.response = new EpmResponse()
  
  var cmdList = [ "init", "status", "show", "remote", "clone", "fetch", "pull", "serve" ]
    , commandCache = {}

  // set the commands
  cmdList.forEach(function(c){
    
    Object.defineProperty(epm.commands, c, { get : function () {
      if (commandCache[c]) return commandCache[c]

      var cmd = require(__dirname+"/"+c+".js")
      commandCache[c] = function () {
        var args = Array.prototype.slice.call(arguments, 0)

        if (typeof args[args.length - 1] !== "function") {
          args.push(defaultCb)
        }
        if (args.length === 1) args.unshift([])
        preCmd.apply(epm, args)
        cmd.apply(epm, args)
      }

      Object.keys(cmd).forEach(function (k) {
        commandCache[c][k] = cmd[k]
      })

      return commandCache[c]
    }, enumerable: cmdList.indexOf(c) !== -1 })

  })

  function preCmd() {
    if (epm.program.verbose===true) {
      epm.log.level = "verbose"
    }
  }

  function defaultCb (er, data) {
    if (er) log.error(er.stack || er.message)
    else log.warn('default callback called')

    // delete me
    if (data) console.log(data);
  }

  if (require.main === module) {
    require("../bin/epm")
  }

}()