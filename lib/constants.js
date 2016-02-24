'use strict';

module.exports = {
  OBD_MESSAGE_TYPES: {
    CURRENT_DATA: '01',
    REQUEST_DTC: '03',
    CLEAR_DTC: '04',
    VIN: '09'
  },
  OBD_OUTPUT_MESSAGE_TYPES: {
    MODE_01: '41'
  },
  OBD_OUTPUT_DELIMETER: '>',
  OBD_OUTPUT_EOL: '\r'
};
