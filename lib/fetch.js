/*!
 * This file is part of EPM.
 *
 * please see the LICENSE
 */

module.exports = fetch

var log = require("./log")
  , fs = require("graceful-fs")
  , epm = require("./epm.js")
  , check = require("./check")
  , url = require("url")
  , async = require("async")
  , request = require("request")
  , path = require("path")

var _cfg = epm.config

function fetch(ops, cb) {
  
  if (typeof ops === "function") {
    cb = ops
  }
 
}
