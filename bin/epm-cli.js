#!/usr/bin/env node
;(function() {

  process.title = "epm"

  var epm = require("../lib/epm.js")
    , program = require("commander")
    , log = require('../lib/log');

  // keep the program
  epm.program = program

  // main program
  program
    .usage("[options] <command> [<args>]")
    .version(epm.version)
    .option("--engine <name>", "Define the package engine", "sep")
    .option("--verbose", "Verbose mode")


  //
  // init
  program
    .command("init [path] [name]")
    .description("initialize an epm repository on [path] (./) named [name] (main)")
    .action(function(path, name, options){
      var ops = {
          path: path,
          name: name
        }
      __exec("init", ops)
    })


  //
  // status
  program
    .command("status")
    .description("show info about the repository")
    .action(function(options){
      var ops = {}
      __exec("status", ops)
    })


  //
  // show
  var showCmd = program.command("show")
  showCmd
    .usage("<command> [<args>]")
    .description("gets repository data")
    .action(function(){
      if (arguments.length === 1) { 
        return showCmd.help()
      }
      showCmd.parse(process.argv.slice(1))
    })

  showCmd
    .command("all")
    .description("show all package information")
    .action(function(){
       __execSub("show", "all", {})
     })

  showCmd
    .command("exec <query>")
    .description("filter packages")
    .action(function(query){
       __execSub("show", "exec", {query: query})
     })


  //
  // remote
  var remoteCmd = program.command("remote")

  function _remoteDefault() {
    __execSub("remote", "list", {})
  }

  remoteCmd
    .usage("<command> [<args>]")
    .description("manage the remote repositories")
    .action(function(){
      if (arguments.length === 1) { 
        return _remoteDefault.apply(remoteCmd, arguments)
      }
      remoteCmd.parse(process.argv.slice(1))
    })

  remoteCmd
    .command("list")
    .description("list remote repositories")
    .action(_remoteDefault)

  remoteCmd
    .command("add <name> <url>")
    .description("add a new remote repository")
    .action(function(name, url){
       __execSub("remote", "add", {name: name, url: url})
     })

  remoteCmd
    .command("rm <name>")
    .description("remove a remote repository")
    .action(function(name){
       __execSub("remote", "rm", {name: name})
     })


  //
  // clone
  program
    .command("clone <url> [path] [name]")
    .description("clone a remote repository on [path] (./) ar [name] (main)")
    .action(function(url, path, name, options){
      var ops = { 
        url: url,
        path: path,
        name: name
      }
      __exec("clone", ops)
    })


  //
  // fetch
  program
    .command("fetch <remote>")
    .description("retrieves info about a <remote> repository")
    .action(function(remote, options){
      var ops = { remote: remote }
      __exec("fetch", ops)
    })


  //
  // pull
  program
    .command("pull <remote>")
    .description("sync with a <remote> repository")
    .action(function(remote, options){
      var ops = { remote: remote }
      __exec("pull", ops)
    })


  //
  // serve
  program
    .command("serve [path] [port]")
    .description("serve [path] (./) repositories on [port] (3220)")
    .action(function(path, port, options){
      var ops = { 
        path: path,
        port: port
      }
      __exec("serve", ops)
    })


  //
  // parse the args
  program.parse(process.argv)

  if (process.argv.length == 2) {
    program.help();    
  }

  // exec
  function __exec(cmd, ops){
    epm.commands[cmd].apply(epm, [ops, callback])
  }

  // exec subcommand
  function __execSub(cmd, subCmd, ops){
    epm.commands[cmd].apply(epm, [subCmd, ops, callback])
  }

  // cli callback
  function callback(er){
    var code = 0

    if (er) {
      log.error(er.stack || er.message)
      code = 1
    }
    process.exit(code)
  }

})()
