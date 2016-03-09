'use strict';

var Promise = require('bluebird')
  , proxyquire = require('proxyquire')
  , chai = require('chai')
  , expect = chai.expect
  , EventEmitter = require('events').EventEmitter;

require('fhlog').setDefault('level', require('fhlog').LEVELS.ERR);

describe('connection', function () {
  var writeSpy;
  var conMod;
  var pipeSpy;
  var parser = new EventEmitter();

  beforeEach(function () {
    writeSpy = require('sinon').spy();
    pipeSpy = require('sinon').spy();
    delete require.cache[require.resolve('lib/connection')];
    conMod = proxyquire('lib/connection', {
      './parser': (function () {
        parser = new EventEmitter();
        parser.write = writeSpy;
        parser.pipe = pipeSpy;

        return parser;
      })()
    });
  });

  function conFn (cfgFn) {
    return new Promise(function (resolve) {
      var ret = new EventEmitter();

      ret.write = writeSpy;
      ret.pipe = pipeSpy;

      cfgFn(ret);

      resolve(ret);
    });
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
          expect(writeSpy.firstCall.args[0]).to.equal('ATE00\r');
          done();
        })
        .catch(done);
    });

    it('should write a message and remove the lock', function (done) {
      conMod.setConnectorFn(conFn);

      conMod.getConnection()
        .then(function (conn) {
          conn.write('RANDOM DATA');
          parser.emit('line-break');
          done();
        })
        .catch(done);
    });
  });

});
