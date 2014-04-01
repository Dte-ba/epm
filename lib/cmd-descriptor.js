/*!
 * This file is part of EPM.
 *
 * please see the LICENSE
 */

module.exports = {

  "*": {
    options: {
      "engine": {
        option: "--engine <name>",
        description: "Define the package engine, 'sep' as default",
        default: "sep"
      }
    }
  },

  "init": {
    usage: "init [path] [name]",
    description: "initialize an epm repository on [path] (./) named [name] (main)"
  },

  "status": {
    usage: "status",
    description: "show info about the repository"
  },

  "show": {
    usage: "show [type]",
    description: "gets repository [type] data"
  },

  "remote": {
    usage: "remote <cmd> [name] [url]",
    description: "manage the remote repositories"
  },

  "clone": {
    usage: "clone <url> [path] [name]",
    description: "clone a remote repository on [path] (./) ar [name] (main)"
  },

  "fetch": {
    usage: "fetch <remote>",
    description: "retrieves info about a <remote> repository"
  },

  "pull": {
    usage: "pull <remote>",
    description: "sync with a <remote> repository"
  },

  "serve": {
    usage: "serve [path] [port]",
    description: "serve [path] (./) repositories on [port] (322)"
  }

}