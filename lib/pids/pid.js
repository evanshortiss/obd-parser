'use strict';

var expect = require('chai').expect
  , util = require('util')
  , caseify = require('case')
  , log = require('fhlog').get('[PID]')
  , _ = require('lodash')
  , conversions = require('./conversions')
  , OBD_MODES = _.values(require('../constants').OBD_MESSAGE_TYPES);

/**
 * Used to create PID instances that will parse OBD data
 * @constructor
 * @param {Object} opts
 */
function PID (opts) {
  expect(OBD_MODES).to.contain(opts.mode);

  // PID can be a string, or undefined for diagnotic trouble codes (dtc)
  if (_.isString(opts.pid)) {
    expect(opts.pid).to.have.length.above(1);
  } else {
    expect(opts.pid).to.be.undefined;
  }

  expect(opts.bytes).to.be.a('number').above(0);
  expect(opts.name).to.be.a('string');
  expect(opts.min).to.be.a('number');
  expect(opts.max).to.be.a('number');

  // This will can be used to identify this PID
  opts.constname = caseify.constant(opts.name);
  opts.fullpid = opts.mode + opts.pid;

  this.opts = opts;
}
module.exports = PID;


/**
 * Returns a prettier representation of a value that this PID represents, by
 * using the passed "units" value for the PID
 *
 * e.g f(10) => 10%
 * e.g f(55) => 55°C
 *
 * @param  {Number} value
 * @return {String}
 */
PID.prototype.getPretty = function (value) {
  if (this.opts.unit && value !== null && value !== undefined) {
    return util.format('%s%s', value, this.opts.unit);
  } else {
    return value;
  }
};


/**
 * Generates the code that should be written to the ECU for querying this PID
 * Example is "010C" (CURRENT_DATA + "OC") for the engine RPM
 *
 * @return {String}
 */
PID.prototype.getWriteString = function () {
  return (this.opts.mode + this.opts.pid);
};


/**
 * The default conversion function for each PID. It will convert a byte value
 * to a number.
 *
 * Many PIDs will override this since more involved conversions are required
 *
 * @return {Number}
 */
PID.prototype.convertBytes = function (a) {
  var args = Array.prototype.slice.call(arguments);

  if (this.opts.bytes !== args.length) {
    log.w(
      'default convertBytes handler for "%s" was passed %d bytes but was ' +
      'expecting %d. The extra bytes will be parsed and result Array returned.',
      this.opts.name,
      args.length,
      this.opts.bytes
    );

    return _.map(args, conversions.parseHexToDecimal);
  } else {
    return conversions.parseHexToDecimal(a);
  }
};
