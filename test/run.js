
var chai = require('chai');
var path = require("path");
var Epm = require('../index.js');
var fs = require('graceful-fs');
var fse = require('fs-extra');
var async = require('async');

// plugins
chai.use(require('chai-fs'));

var temp = path.join(__dirname, './repo/');
var large = path.join(__dirname, './large/');
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

    epm.init({name: 'test', engine: 'epm-pad-engine'});
   });

 });
  
  describe("#explorer:get() //empty", function(){
    it("should be get a query on a empty repository without problems", function(done){
      epm
        .get()
        .done(function(pkgs){
          //console.log(Object.keys(pkgs.packages));
          done();
      });
    });
  });

  describe("#explorer:get() //files", function(){
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


    it("should be get a query repository with files without problems", function(done){
      epm
        .get()
        .done(function(pkgs){
          //console.log(Object.keys(pkgs.packages));
          done();
      });
    });

    it("should be get a query when are added files without problems", function(done){

      async.each(nexts, function(f, cb){
          fse.copy(path.join(packagesPath, f), path.join(temp, f), cb);
        }, function(err){
          if (err) throw err

          epm
            .get()
            .done(function(pkgs){
              //console.log(Object.keys(pkgs.packages));
              done();
          });
        });
      
    });

    it("should be get a query a repository when are deleted files without problems", function(done){

      async.each(nexts, function(f, cb){
          fse.remove(path.join(temp, f), cb);
        }, function(err){
          if (err) throw err

          epm
            .get()
            .progress(function(info){
              var p = info.currents === 0 ? 0 : info.progress/info.currents;
            })
            .done(function(pkgs){
              //console.log(Object.keys(pkgs.packages));
              done();
          });
        });
      
    });

    it("should be get to queries in parallel without problems", function(done){
      async.parallel([
        function(cb){
          epm
            .get()
            .progress(function(info){
              var p = info.currents === 0 ? 0 : info.progress/info.currents;
            })
            .done(function(pkgs){
              //console.log(Object.keys(pkgs.packages));
              cb();
          });
        },
        function(cb){
          epm
            .get()
            .progress(function(info){
              var p = info.currents === 0 ? 0 : info.progress/info.currents;
            })
            .done(function(pkgs){
              //console.log(Object.keys(pkgs.packages));
              cb();
          });
        }
      ], function(err, resuls){
        done();
      })
      
    });

    it("should be get a query uid:some repository with  without problems", function(done){
      epm
        .get('select uid:010e51b3736595b67ddc67b76c0e256e4fd27688')
        .done(function(pkgs){
          assert(pkgs.length === 1);
          done();
      });
    });
    

  });

});

describe("EPM #Large repo", function(){
  
  before(function(done){
    fse.remove(path.join(large, '.epm'), function(err){
      epm = new Epm(large, {name: 'large', engine: 'epm-pad-engine'});
      
      epm.once('error', function(err){
        throw err;
      });

      epm.once('init', function(info){
        done();
      });

      epm.init();
    });
  });

  describe("#explorer:get()", function(){
    this.timeout(5*60*1000);
    it("should be get a query on a LAAAARGE repository without problems", function(done){
      epm
        .get()
        .progress(function(info){
          var p = info.currents === 0 ? 0 : info.progress/info.currents;
          //console.log('#Large %' + p);
        })
        .done(function(pkgs){
          //console.log(pkgs.length);
          done();
      });
    });

    it("should be get a query faster on a cached large repository without problems", function(done){
      epm
        .get()
        .progress(function(info){
          var p = info.currents === 0 ? 0 : info.progress/info.currents;
          //console.log('#faster %' + p);
        })
        .done(function(pkgs){
          //console.log(pkgs.length);
          done();
      });
    });
  });

});

