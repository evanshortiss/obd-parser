'use strict';

var PID = require('../pid')
  , MESSAGE_TYPES = require('../../constants.js').OBD_MESSAGE_TYPES;

module.exports = new PID({
  mode: MESSAGE_TYPES.CURRENT_DATA,
  pid: '05',
  bytes: 1,
  name: 'Engine Coolant Temperature',
  min: -40,
  max: 215,
  unit: '°C'
});

module.exports.convertBytes = require('../conversions').coolantTemp;
