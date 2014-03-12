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
    description: "Initialize an epm repository"  
  },

  "status": {
    usage: "status",
    description: "Show info about the repository"
  },

  "show": {
    usage: "show [type]",
    description: "Gets repository data"
  },

  "remote": {
    usage: "remote <cmd> [name] [url]",
    description: "Manage the remote repositories"
  },

  "clone": {
    usage: "clone <url> [path]",
    description: "Clone a remote repository"
  },

  "fetch": {
    usage: "fetch <remote>",
    description: "Retrieves info about a remote repository"
  },

  "pull": {
    usage: "pull <remote>",
    description: "Sync with a remote repository"
  }


}