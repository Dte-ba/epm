/*!
 * This file is part of EPM.
 *
 * please see the LICENSE
 */

 module.exports = {

  engine: "sep",

  root_path: ".epm",

  paths: {
    config: "CONFIG",
    files: {
      folder: "files",
      packages: "files/PACKAGES"
    },
    data: {
      folder: "data",
      words: "data/WORDS"
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