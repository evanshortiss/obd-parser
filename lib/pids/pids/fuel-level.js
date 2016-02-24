'use strict';

var PID = require('../pid')
  , MESSAGE_TYPES = require('../../constants.js').OBD_MESSAGE_TYPES;

module.exports = new PID({
  mode: MESSAGE_TYPES.CURRENT_DATA,
  pid: '2F',
  bytes: 1,
  name: 'Fuel Level Input',
  min: 0,
  max: 100,
  unit: '%'
});

module.exports.convertBytes = require('../conversions').percentage;
