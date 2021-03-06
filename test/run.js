
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
    async.waterfall([
        function(cb){
          fse.remove(temp, function(err){
            fse.mkdirsSync(temp);
            cb();
          });
        },
        function(cb){
          fse.remove(large, function(err){
            fse.mkdirsSync(large);
            cb();
          });
        }
      ], function(){
        done();
    });
    
  });

 describe("#create()", function(){
   it("should be crash on create when `path` is empty", function(done){
    Epm.create({name: 'test', engine: 'epm-pad-engine'}, function(err){
      if (err !== null && err.message === 'The `path` is not defined o doesn\'t exists') {
        done();
      }
    });
   });

   it("should be crash on create when `name` is empty", function(done){
    Epm.create({path: temp, engine: 'epm-pad-engine'}, function(err){
      if (err !== null && err.message === 'No name defined') {
        done();
      }
    });
   });

   it("should be crash on create when `engine` is empty", function(done){
    Epm.create({path: temp, name: 'test'}, function(err){
      if (err !== null  && err.message === 'No engine defined') {
        done();
      }
    });
   });

   it("should be create the repository without problems", function(done){
    
    Epm.create({path: temp, name: 'test', engine: 'epm-pad-engine'}, function(err){
      if (err){
        throw err;
      }

      var cpath = path.join(temp, ".epm");

      expect(path.join(cpath, 'cache')).to.be.a.directory();
      expect(path.join(cpath, 'tmp')).to.be.a.directory();
      //expect(path.join(cpath, 'cache/data')).to.be.a.directory();
      expect(path.join(cpath, 'remote')).to.be.a.directory();
      
      expect(path.join(cpath, 'CONFIG')).to.be.a.file('');
      expect(path.join(cpath, 'REMOTES')).to.be.a.file('');

      done();
    });

   });

 });

 describe("#constructor()", function(){
   it("should be an instance of Epm without errors", function(){
    epm = new Epm(temp);
    expect(epm).to.be.an('object');
    assert(epm instanceof Epm, 'epm is an Epm object');
   });
 });
  
 describe("#load() //empty", function(){
    it("should be load an empty repository without problems", function(done){
      epm
        .load()
        .progress(function(info){
          console.log(info);
        })
        .done(function(){
          done();
      });
    });
  });

  describe("#load() //files", function(){
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


    it("should be load a repository with files without problems", function(done){
      epm = new Epm(temp);
      epm
        .load()
        .progress(function(info){
          var p = info.currents === 0 ? 0 : info.progress/info.currents;
          //console.log(p);
        })
        .done(function(){
          done();
      });
    });

    it("should be load when added files into a repository without problems", function(done){

      async.each(nexts, function(f, cb){
          fse.copy(path.join(packagesPath, f), path.join(temp, f), cb);
        }, function(err){
          if (err) throw err

          epm = new Epm(temp);
          epm
            .load()
            .progress(function(info){
              var p = info.currents === 0 ? 0 : info.progress/info.currents;
              //console.log(p);
            })
            .done(function(){
              done();
          });
        });
      
    });

    it("should be load when are deleted files on the repository without problems", function(done){

      async.each(nexts, function(f, cb){
          fse.remove(path.join(temp, f), cb);
        }, function(err){
          if (err) throw err

          epm = new Epm(temp);
          epm
            .load()
            .progress(function(info){
              var p = info.currents === 0 ? 0 : info.progress/info.currents;
              //console.log(p);
            })
            .done(function(){
              done();
          });

        });
      
    });

    it("should be find in the repository without problems", function(done){

      async.each(nexts, function(f, cb){
          fse.remove(path.join(temp, f), cb);
        }, function(err){
          if (err) throw err

          epm = new Epm(temp);
          epm
            .load()
            .progress(function(info){
              var p = info.currents === 0 ? 0 : info.progress/info.currents;
              //console.log(p);
            })
            .done(function(){

              epm.find({}, function(err, items){
                console.log(items.length);
                done();
              });
          });

        });
      
    });

    it("should be findOne in the repository without problems", function(done){

      async.each(nexts, function(f, cb){
          fse.remove(path.join(temp, f), cb);
        }, function(err){
          if (err) throw err

          epm = new Epm(temp);
          epm
            .load()
            .progress(function(info){
              var p = info.currents === 0 ? 0 : info.progress/info.currents;
              //console.log(p);
            })
            .done(function(){

              epm.findOne({ uid: '0aab8c3eac0c9d364dba6f0bae3b824773eb6739' }, function(err, item){
                console.log(item.uid);
                done();
              });
          });

        });
      
    });
    
  });

});

/*describe("#load(watch)", function(){
  this.timeout(1000*60*60); // one hour

  it("should be watch repository without problems", function(done){

    var epm = new Epm(temp);
    epm
      .load(true)
      .progress(function(info){
        var p = info.currents === 0 ? 0 : info.progress/info.currents;
        //console.log(p);
      })
      .done(function(){

    });
    
  });
});*/

describe("EPM #Large repo", function(){
  
  before(function(done){
    fse.remove(path.join(large, '.epm'), function(err){
      Epm.create({path: large, name: 'test', engine: 'epm-pad-engine'}, function(err){
        if (err){
          throw err;
        }
        done();
      });
    });
  });

  describe("#explorer:get()", function(){
    this.timeout(5*60*1000);
    it("should be get a query on a LAAAARGE repository without problems", function(done){
      epm = new Epm(large);
      epm
        .load()
        .progress(function(info){
          var p = info.currents === 0 ? 0 : info.progress/info.currents;
          //console.log(p);
        })
        .done(function(){
          done();
      });
    });

    it("should be get a query faster on a cached large repository without problems", function(done){
      epm = new Epm(large);
      epm
        .load()
        .progress(function(info){
          var p = info.currents === 0 ? 0 : info.progress/info.currents;
          //console.log(p);
        })
        .done(function(){
          epm
            .find({}, function(err, items){
              console.log(items.length + ' finded')
              done();
            });
      });
    });
  });

});

