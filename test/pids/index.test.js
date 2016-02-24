'use strict';

var expect = require('chai').expect;

describe('pids', function () {

  var pids = require('lib/pids');

  describe('#getByPid', function () {
    it('should return the expected pid implementation', function () {
      var p = pids.getByPid('010C');

      expect(p).to.be.an('object');
    });
  });

  describe('#getByConstname', function () {
    it('should return the expected pid implementation', function () {
      var p = pids.getByConstname('ENGINE_RPM');

      expect(p).to.be.an('object');
    });
  });

  describe('#getByName', function () {
    it('should return the expected pid implementation', function () {
      var p = pids.getByName('Engine RPM');

      expect(p).to.be.an('object');
    });
  });

  describe('#getSupportedPids', function () {
    it('should return the expected pid implementation', function () {
      var p = pids.getSupportedPids();

      expect(p).to.be.an('array');
    });
  });

})
