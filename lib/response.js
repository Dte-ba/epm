/*!
 * This file is part of EPM.
 *
 * please see the LICENSE
 */

var epm = require('./epm')
  , log = log = require('./log')

/**
 * Initialize a new EpmResponse.
 *
 */
var EpmResponse = module.exports = function(stdout) {
  var self = this

  if(false === (self instanceof EpmResponse)) {
    return new EpmResponse()
  }

  self.stdout = stdout
  self.printers = {}
  self.printers["default"] = defaultPrint
  self.printers["status"] = printStatus

  return self
}

EpmResponse.prototype.send = function(data) {
  if (epm.serving) return this._send(data)

  return this._sendStdout(data, true)
}

EpmResponse.prototype._sendStdout = function(data, decorate) {
  var self = this
  // ignore de stdout use the console
  
  var type = data.type || "default"
  var printer = self.printers[type]

  if (printer === undefined) printer = defaultPrint

  printer(self.stdout, data)

  return self
}

EpmResponse.prototype._send = function(data) {
  var self = this

  // write only de body
  self.stdout.write(JSON.stringify(data.body))

  return self
}

//
// private functions
function defaultPrint(stdout, data) {
  stdout.write(JSON.stringify(data))
}

function printStatus(stdout, data) {
  var d = data.body
  log.info("status", "the repository has " + Object.keys(d.trackeds.packages).length + " packages files");

  if (stdout)
    stdout.write(JSON.stringify(data, null, 2))
}