'use strict';

var Promise = require('bluebird')
  , chai = require('chai')
  , expect = chai.expect;

require('fhlog').setDefault('level', require('fhlog').LEVELS.ERR);

describe('connection', function () {
  var writeSpy;
  var conMod;
  var pipeSpy;

  beforeEach(function () {
    writeSpy = require('sinon').spy();
    pipeSpy = require('sinon').spy();
    delete require.cache[require.resolve('lib/connection')];
    conMod = require('lib/connection');
  });

  function conFn (cfgFn) {
    return new Promise(function (resolve, reject) {
      var ret = {
        write: writeSpy,
        pipe: pipeSpy
      };

      cfgFn(ret);

      resolve(ret);
    })
  }

  describe('#setConnectorFn', function () {
    it('should run successfully', function () {
      conMod.setConnectorFn(conFn);
    });
  });

  describe('#getConnection', function () {
    it('should run successfully', function (done) {
      conMod.setConnectorFn(conFn);

      conMod.getConnection()
        .then(function (conn) {
          expect(conn.write).to.be.a('function');
          expect(writeSpy.called).to.be.true;
          expect(writeSpy.firstCall.args[0]).to.equal('ATZ\r');
          done();
        })
        .catch(done)
    });
  });

});
