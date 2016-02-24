'use strict';

var PID = require('../pid')
  , MESSAGE_TYPES = require('../../constants.js').OBD_MESSAGE_TYPES;

module.exports = new PID({
  mode: MESSAGE_TYPES.CURRENT_DATA,
  pid: '0C',
  bytes: 2,
  name: 'Engine RPM',
  min: 0,
  max: 16383.75,
  unit: 'rpm'
});

module.exports.convertBytes = require('../conversions').rpm;
