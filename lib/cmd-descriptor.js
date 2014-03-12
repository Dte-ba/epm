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
    usage: "init [path]",
    description: "initialize an epm repository"  
  },

  "status": {
    usage: "status",
    description: "show info about the repository"
  },

  "show": {
    usage: "show [type]",
    description: "gets repository data"
  },

  "remote": {
    usage: "remote <cmd> [name] [url]",
    description: "manage the remote repositories"
  },

  "clone": {
    usage: "clone <url> [path]",
    description: "clone a remote repository"
  },

  "fetch": {
    usage: "fetch <remote>",
    description: "retrieves info about a remote repository"
  },

  "pull": {
    usage: "pull <remote>",
    description: "sync with a remote repository"
  }


}