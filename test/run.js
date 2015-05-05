
var chain = require('chai');
var path = require("path");
var Epm = require("../index.js");

var temp = path.join(__dirname, './repos/');

var assert = chain.assert;
var expect = chain.expect;

var epm = new Epm();

describe("EPM", function(){
   describe("#constructor()", function(){
       it("should be instance a Epm object", function(){
        expect(epm).to.be.an('Epm');
       });
   });
   /*describe("#init()", function(){
       it("should be initialized a new repository", function(){
       });
   });*/
});