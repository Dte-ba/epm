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
      packages: "files/PACKAGES",
      files: "files/FILES"
    },
    data: {
      folder: "data",
      words: "data/TAGS"
    }
  },

  defaults: {
    config: { 
      engine: "sep"
    },
    packages: {
      packages: {},
      files: {}
    },
    files: {

    },
    words: {
      
    }
  }
  
 }