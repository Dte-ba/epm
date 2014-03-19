/*!
 * This file is part of EPM.
 *
 * please see the LICENSE
 */

 module.exports = {

  engine: "sep",

  root_path: ".epm",

  paths: {
    config: "config.json",
    files: {
      folder: "files",
      file: "files/packages.json"
    },
    data: {
      folder: "data",
      words: "data/words.json"
    }
  },

  defaults: {
    config: { 
      engine: "sep"
    },
    packages: {

    },
    words: {
      
    }
  }
  
 }