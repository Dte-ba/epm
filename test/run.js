
var chai = require('chai');
var path = require("path");
var Epm = require('../index.js');
var fs = require('graceful-fs');
var mkdirp = require('mkdirp');
var utils = require('./utils');

// plugins
chai.use(require('chai-fs'));

var temp = path.join(__dirname, './repos/');

var assert = chai.assert;
var expect = chai.expect;

var epm;

describe("EPM", function(){

  before(function(done){
    utils.rmdirSync(temp);
    mkdirp.sync(temp);
    done();
  });

 describe("#constructor()", function(){
   it("should be an instance of Epm without errors", function(){
    epm = new Epm(temp)
    expect(epm).to.be.an('object');
    assert(epm instanceof Epm, 'epm is an Epm object');
   });
 });

 describe("#init()", function(){
   it("should be init the repository without problem", function(done){
    
    epm.once('error', function(err){
      throw err;
    });

    epm.once('init', function(info){
      var cpath = path.join(temp, ".epm");

      expect(path.join(cpath, 'cache')).to.be.a.directory();
      expect(path.join(cpath, 'tmp')).to.be.a.directory();
      expect(path.join(cpath, 'cache/data')).to.be.a.directory();
      expect(path.join(cpath, 'remote')).to.be.a.directory();
      
      expect(path.join(cpath, 'CONFIG')).to.be.a.file('');
      expect(path.join(cpath, 'files/PACKAGES')).to.be.a.file('');
      expect(path.join(cpath, 'files/FILES')).to.be.a.file('');
      expect(path.join(cpath, 'cache/TAGS')).to.be.a.file('');
      expect(path.join(cpath, 'REMOTES')).to.be.a.file('');

      done();
    });

    epm.init();

   });
 });
});