'use strict';

describe('conversions', function () {

  var conversions = require('../../lib/pids/conversions')
    , expect = require('chai').expect;

  describe('#parseHexToDecimal', function () {
    it('should return a value', function () {
      expect(
        conversions.parseHexToDecimal('01')
      ).to.equal(1);
    });
  });

  describe('#percentage', function () {
    it('should return a value', function () {
      expect(
        conversions.percentage('AA', 'AA').toFixed(2)
      ).to.equal('66.67');
    });
  });

  describe('#coolantTemp', function () {
    it('should return a value', function () {
      expect(
        conversions.coolantTemp('AA')
      ).to.equal(130);
    });
  });

  describe('#rpm', function () {
    it('should return a value', function () {
      expect(
        conversions.rpm('1B', '56')
      ).to.equal(1749.5);
    });
  });

});
