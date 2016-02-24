'use strict';

var sinon = require('sinon')
  , expect = require('chai').expect;

describe('#OBDStreamParser', function () {

  var parser;

  beforeEach(function () {
    delete require.cache[require.resolve('../lib/parser')];
    parser = require('../lib/parser');
  });

  describe('#write', function () {

    it('should emit a data event', function () {
      var spy = sinon.spy();

      parser.on('data', spy);

      parser.write('SEARCHING...\r>410C1B56\r\r>', 'utf8', function () {});

      expect(spy.called).to.be.true;
      expect(spy.args[0][0].value).to.equal(1749.5);
      expect(spy.args[0][0].byteString).to.equal('410C1B56');
      expect(
        spy.args[0][0].byteGroups
      ).to.deep.equal([ '41', '0C', '1B', '56' ]);
    });

    it('should not emit a data event due to lack of bytes', function () {
      var spy = sinon.spy();

      parser.on('data', spy);

      parser.write('SEARCHING...\r>', 'utf8', function () {});

      expect(spy.called).to.be.false;
    });

    it('should not emit a data event due incomplete input', function () {
      var spy = sinon.spy();

      parser.on('data', spy);

      parser.write('SEARCHING...', 'utf8', function () {});

      expect(spy.called).to.be.false;
    });

    it('should fail to parse the invalid input bytes', function () {

      var spy = sinon.spy();

      parser.on('data', spy);

      parser.write('41FF1B56\r\r>', 'utf8', function () {});

      expect(spy.called).to.be.true;
      expect(spy.getCall(0).args[0]).to.have.property('ts');
      expect(spy.getCall(0).args[0]).to.have.property('value');
      expect(spy.getCall(0).args[0]).to.have.property('byteString');
      expect(spy.getCall(0).args[0]).to.have.property('byteGroups');
      expect(spy.getCall(0).args[0]).to.have.property('error');
      expect(spy.getCall(0).args[0].value).to.be.null;
      expect(
        spy.getCall(0).args[0].error.toString()
      ).to.contain('no converter was found for pid');
    });

    it('should fail to parse the invalid input bytes', function () {

      var spy = sinon.spy();

      parser.on('data', spy);

      parser.write('BADF1B56\r\r>', 'utf8', function () {});

      expect(spy.called).to.be.true;
      expect(spy.getCall(0).args[0]).to.have.property('ts');
      expect(spy.getCall(0).args[0]).to.have.property('value');
      expect(spy.getCall(0).args[0]).to.have.property('byteString');
      expect(spy.getCall(0).args[0]).to.have.property('byteGroups');
      expect(spy.getCall(0).args[0]).to.have.property('error');
      expect(spy.getCall(0).args[0].value).to.be.null;
      expect(
        spy.getCall(0).args[0].error.toString()
      ).to.contain('Unable to parse bytes');
    });

  });

});
