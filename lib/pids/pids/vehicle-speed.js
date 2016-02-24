'use strict';

var PID = require('../pid')
  , MESSAGE_TYPES = require('../../constants.js').OBD_MESSAGE_TYPES;

module.exports = new PID({
  mode: MESSAGE_TYPES.CURRENT_DATA,
  pid: '0D',
  bytes: 1,
  name: 'Vehicle Speed',
  min: 0,
  max: 255,
  unit: 'km/h'
});
