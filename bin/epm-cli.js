#!/usr/bin/env node
;!function() {

  process.title = "epm"

  var epm = require("../lib/epm.js")
    , program = require("commander")
  
  program
   .version(epm.version)

  // handle the commands
  Object.keys(epm.descriptors).forEach(function(cmd) {
    var d = epm.descriptors[cmd]

    // catch the global options
    if (cmd == "*" && d.options !== undefined) {

      Object.keys(d.options).forEach(function(k) {
        var op = d.options[k]

        program
          .option(op.option, op.description, function(value) {
            epm.cliOps[k] = value;
          }, op.default)
      })

      return
    }

    // catch the commands
    program
     .command(d.usage)
     .description(d.description)
     .action(function() {
      var args = Array.prototype.slice.call(arguments, 0, arguments.length-1)
      epm.commands[cmd].apply(epm, args)
    })

  })

  program.parse(process.argv)

  if (process.argv.length == 2) {
    program.help();    
  }

}()