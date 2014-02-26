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

  epm.descriptors = { }
  epm.cliOps = { } // command line options
  epm.commands = { } // epm commands
  epm.version = require("../package.json").version
  
  if (require.main !== module) {
    require("../bin/epm-cli.js")
  }

}()