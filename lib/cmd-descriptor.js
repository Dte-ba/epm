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
  }

}