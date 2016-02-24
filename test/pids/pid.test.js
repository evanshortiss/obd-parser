'use strict';

var PID = require('lib/pids/pid')
  , path = require('path')
  , expect = require('chai').expect
  , constants = require('lib/constants');

describe('#PID', function () {

  it('should throw error due to invalid "mode"', function () {
    expect(function () {
      return new PID({
        mode: 'not a real mode'
      });
    }).to.throw('AssertionError');
  });

  it('should throw error due to invalid "pid"', function () {
    expect(function () {
      return new PID({
        mode: constants.OBD_MESSAGE_TYPES.CURRENT_DATA,
        pid: '0'
      });
    }).to.throw('AssertionError');
  });

  it('should throw error due to invalid "bytes" option', function () {
    expect(function () {
      return new PID({
        mode: constants.OBD_MESSAGE_TYPES.CURRENT_DATA,
        pid: undefined,
        bytes: 0
      });
    }).to.throw('AssertionError');
  });

  it('should throw error due to invalid "name" option', function () {
    expect(function () {
      return new PID({
        mode: constants.OBD_MESSAGE_TYPES.CURRENT_DATA,
        pid: undefined,
        bytes: 2,
        name: 12347890
      });
    }).to.throw('AssertionError');
  });

  it('should throw error due to invalid "description" option', function () {
    expect(function () {
      return new PID({
        mode: constants.OBD_MESSAGE_TYPES.CURRENT_DATA,
        pid: undefined,
        bytes: 2,
        name: 'rpm',
        description: 123457890
      });
    }).to.throw('AssertionError');
  });

  it('should throw error due to invalid "min" option', function () {
    expect(function () {
      return new PID({
        mode: constants.OBD_MESSAGE_TYPES.CURRENT_DATA,
        pid: undefined,
        bytes: 2,
        name: 'rpm',
        description: 'engine rpm',
        min: 'invalid option'
      });
    }).to.throw('AssertionError');
  });

  it('should throw error due to invalid "max" option', function () {
    expect(function () {
      return new PID({
        mode: constants.OBD_MESSAGE_TYPES.CURRENT_DATA,
        pid: undefined,
        bytes: 2,
        name: 'rpm',
        description: 'engine rpm',
        min: 0,
        max: 'invalid option'
      });
    }).to.throw('AssertionError');
  });

  it('should accept PID of "undefined"', function () {
    expect(function () {
      return new PID({
        mode: constants.OBD_MESSAGE_TYPES.CURRENT_DATA,
        pid: undefined
      });
    }).to.throw('AssertionError');
  });

  describe('#convertBytes', function () {
    it('should convert as per the default implementation', function () {
      var p = new PID({
        mode: constants.OBD_MESSAGE_TYPES.CURRENT_DATA,
        pid: undefined,
        bytes: 2,
        name: 'rpm',
        min: 0,
        max: 100
      });

      expect(
        p.convertBytes('AA', 'AB')
      ).to.deep.equal([170, 171]);

      expect(
        p.convertBytes('AA')
      ).to.deep.equal(170);
    });
  });

});

describe('Custom PID Imlementations', function () {
  function requireFile (fname) {
    it('should successfully load ' + fname, function () {
      require(path.join(__dirname, '../../lib/pids/pids', fname));
    });
  }

  require('fs')
    .readdirSync(path.join(__dirname, '../../lib/pids/pids'))
    .forEach(requireFile);
});

