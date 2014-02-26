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

  epm.descriptors = require('./cmd-descriptor')
  epm.config = require('./conf')
  epm.cliOps = { } // command line options
  epm.commands = { } // epm commands
  epm.version = require("../package.json").version
  
  var cmdList = [ "init" ]
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

        cmd.apply(epm, args)
      }

      Object.keys(cmd).forEach(function (k) {
        commandCache[c][k] = cmd[k]
      })

      return commandCache[c]
    }, enumerable: cmdList.indexOf(c) !== -1 })

  })

  function defaultCb (er, data) {
    if (er) log.err(er.stack || er.message)
    else log.warn('default callback called')

    console.log(data);
  }

  if (require.main !== module) {
    require("../bin/epm-cli.js")
  }

}()