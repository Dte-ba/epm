/*!
 * This file is part of EPM.
 *
 * please see the LICENSE
 */
 
var writingLogFile = false, wroteLogFile = true
function writeLogFile (dir, cb) {
  if (writingLogFile) return cb()
  writingLogFile = true
  wroteLogFile = true

  var fstr = fs.createWriteStream(path.join(dir, "epm-debug.log"))
    , util = require("util")
    , os = require("os")
    , out = ""

  log.record.forEach(function (m) {
    var pref = [m.id, m.level]
    if (m.prefix) pref.push(m.prefix)
    pref = pref.join(' ')

    m.message.trim().split(/\r?\n/).map(function (line) {
      return (pref + ' ' + line).trim()
    }).forEach(function (line) {
      out += line + os.EOL
    })
  })

  fstr.end(out)
  fstr.on("close", cb)
}