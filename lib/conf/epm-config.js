/*!
 * This file is part of EPM.
 *
 * please see the LICENSE
 */
var path = require("path")
  , fs = require("graceful-fs")

var config = module.exports = {}

var engine = "sep"

var root_path = ".epm"

var _files = {
  "config-file": { 
    type: "file",
    dir: "/",
    filename: "CONFIG",
    defaults: { engine: "sep" } 
  },
  "packages-file" : { 
    type: "file",
    dir: "/files",
    filename: "PACKAGES",
    defaults: { packages: {}, files: {} }
  },
  "files-file": { 
    type: "file",
    dir: "/files",
    filename: "FILES",
    defaults: { } 
  },
  "cache-folder": { 
    type: "folder",
    dir: "/cache"
  },
  "data-folder": { 
    type: "folder",
    dir: "/cache/data"
  },
  "tags-file": { 
    type: "file",
    dir: "/cache",
    filename: "TAGS",
    defaults: { } 
  },
  "remotes-file": { 
    type: "file",
    dir: "/",
    filename: "REMOTES",
    defaults: { } 
  }
}

Object.defineProperty(config, "engine", {
  get: function() {
    return engine
  },
  enumerable: true
})

Object.defineProperty(config, "root_path", {
  get: function() {
    return root_path
  },
  enumerable: true
})

Object.defineProperty(config, "files", {
  get: function() {
    return _files
  },
  enumerable: true
})

var files = {}

Object.defineProperty(config, "file", {
  get: function() {
    return files
  },
  enumerable: true
})

files.descriptor = function(name) {
  return _files[name]
}

files.defaults = function(name) {
  return files.descriptor(name).defaults
}

files.relative = function(name, root) {
  root = root || false
  var f = _files[name]
  if (f.type === "folder") {
    return root ? path.join(root_path, f.dir) : f.dir
  }
  var rel = path.join(f.dir, f.filename)
  if (!root) return rel
  return path.join(root_path, rel)
}

files.resolve = function(name, dir, root) {
  return path.join(dir, files.relative(name, root))
}

// setter
// TODO: refartor this
config.set = function(dir, key, value) {
  filename = files.resolve("config-file", dir, true)
  
  var cfg = JSON.parse(fs.readFileSync(filename), 'utf-8')
  cfg[key] = value

  fs.writeFileSync(filename, JSON.stringify(cfg))
}

