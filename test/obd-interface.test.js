'use strict';

var chai = require('chai')
  , expect = chai.expect
  , Promise = require('bluebird');

chai.use(require('chai-as-promised'));

describe('obd-interface', function () {

  var i = null;

  beforeEach(function () {
    delete require.cache[require.resolve('lib/obd-interface')];
    i = require('lib/obd-interface');
  });

  describe('#pollers', function () {
    it('should be an object', function () {
      expect(i.pollers).to.be.an('object');
    });
  });

  describe('#pids', function () {
    it('should be an object', function () {
      expect(i.pids).to.be.an('object');
    });
  });

  describe('#init', function () {
    it('should be a function', function () {
      expect(i.init).to.be.an('function');
    });

    it('should be resolved', function () {
      return expect(
        i.init({
          connectorFn: function () {
            return new Promise(function (resolve) {
              resolve({});
            });
          }
        })
      ).to.eventually.be.resolved;
    });

    it('should be rejected', function () {
      return expect(
        i.init({
          connectorFn: function () {
            return new Promise(function (resolve, reject) {
              reject({});
            });
          }
        })
      ).to.eventually.be.rejected;
    });
  });

});
