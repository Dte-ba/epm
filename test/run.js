
var chai = require('chai');
var path = require("path");
var Epm = require('../index.js');
var fs = require('graceful-fs');
var fse = require('fs-extra');
var async = require('async');

// plugins
chai.use(require('chai-fs'));

var temp = path.join(__dirname, './repo/');
var packagesPath = path.join(__dirname, './packages/');

var assert = chai.assert;
var expect = chai.expect;

var epm;

describe("EPM", function(){

  before(function(done){
    fse.remove(temp, function(err){
      fse.mkdirsSync(temp);
      done();
    });
  });

 describe("#constructor()", function(){
   it("should be an instance of Epm without errors", function(){
    epm = new Epm(temp);
    expect(epm).to.be.an('object');
    assert(epm instanceof Epm, 'epm is an Epm object');
   });
 });

 describe("#init()", function(){
   it("should be init the repository without problems", function(done){
    
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

  describe("#explorer:discover() //empty", function(){

    it("should be discover an empty repository without problems", function(done){

      epm.explorer.discover(function(err,  res, trackeds){
        if (err) throw err;
        
        expect(trackeds).to.be.an('object', 'The results must be an array');
        expect(Object.keys(trackeds)).to.be.empty;

        done();
      });
    });

  });

  describe("#explorer:discover() //files", function(){

    var firsts, nexts;

    before(function(done){
      fs.readdir(packagesPath, function(err, files){
        if (files.length < 10) {
          throw new Error('The package files are less than 10');
        }
        firsts = files.slice(0, 8);
        nexts = files.slice(8, 10);
        
        async.each(firsts, function(f, cb){
          fse.copy(path.join(packagesPath, f), path.join(temp, f), cb);
        }, function(err){
          if (err) throw err
          done();
        });
      });
    });

    it("should be discover a repository without problems", function(done){

      epm.explorer.discover(function(err, res, trackeds){
        if (err) throw err;
        
        expect(trackeds).to.be.an('object', 'The results must be an array');
        assert(Object.keys(trackeds).length === 8, 'The results needs 8 results');
        assert(res.added.length === 8, 'Extect 8 added');
        assert(res.deleted.length === 0, 'Extect 0 deleted');
        assert(res.changed.length === 0, 'Extect 0 changed');
        assert(res.unchanged.length === 0, 'Extect 0 unchanged');
        
        done();
      });

    });

    it("should be discover a repository when are added files without problems", function(done){

      async.each(nexts, function(f, cb){
          fse.copy(path.join(packagesPath, f), path.join(temp, f), cb);
        }, function(err){
          if (err) throw err

          epm.explorer.discover(function(err, res, trackeds){
            if (err) throw err;

            expect(trackeds).to.be.an('object', 'The results must be an array');
            assert(Object.keys(trackeds).length === 10, 'The results needs 10 results');
            assert(res.added.length === 2, 'Extect 2 added');
            assert(res.deleted.length === 0, 'Extect 0 deleted');
            assert(res.changed.length === 0, 'Extect 0 changed');
            assert(res.unchanged.length === 8, 'Extect 8 unchanged');
            
            done();
          });
        });
      
    });

    it("should be discover a repository when are deleted files without problems", function(done){

      async.each(nexts, function(f, cb){
          fse.remove(path.join(temp, f), cb);
        }, function(err){
          if (err) throw err

          epm.explorer.discover(function(err, res, trackeds){
            if (err) throw err;

            expect(trackeds).to.be.an('object', 'The results must be an array');
            assert(Object.keys(trackeds).length === 8, 'The results needs 8 results');
            assert(res.added.length === 0, 'Extect 0 added');
            assert(res.deleted.length === 2, 'Extect 2 deleted');
            assert(res.changed.length === 0, 'Extect 0 changed');
            assert(res.unchanged.length === 8, 'Extect 8 unchanged');
            
            done();
          });
        });
      
    });

    it("should be discover a repository when no changed files without problems", function(done){

      async.each(nexts, function(f, cb){
          fse.remove(path.join(temp, f), cb);
        }, function(err){
          if (err) throw err

          epm.explorer.discover(function(err, res, trackeds){
            if (err) throw err;

            expect(trackeds).to.be.an('object', 'The results must be an array');
            assert(Object.keys(trackeds).length === 8, 'The results needs 8 results');
            assert(res.added.length === 0, 'Extect 0 added');
            assert(res.deleted.length === 0, 'Extect 0 deleted');
            assert(res.changed.length === 0, 'Extect 0 changed');
            assert(res.unchanged.length === 8, 'Extect 8 unchanged');
            
            done();
          });
        });
      
    });

  });
  
  describe("#explorer:get()", function(){

    it("should be get a query without problems", function(done){
      epm
        .get()
        .done(function(some){
          //console.log(some);
          done();
      });
    });
  });

  describe("#explorer:get()*2", function(){

    it("should be get to queries in parallel without problems", function(done){

      async.parallel([
        function(cb){
          epm
            .get()
            .done(function(some){
              //console.log(some);
              cb();
          });
        },
        function(cb){
          epm
            .get()
            .done(function(some){
              //console.log(some);
              cb();
          });
        }
      ], function(err, resuls){
        done();
      })
      
    });
  });

});