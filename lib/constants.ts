'use strict';

export class OBD_MESSAGE_TYPES {
  static CURRENT_DATA = '01';
  static REQUEST_DTC = '03';
  static CLEAR_DTC = '04';
  static VIN = '09';
};

export class OBD_OUTPUT_MESSAGE_TYPES {
  static MODE_01 = '41';
};

// We know a received message is complete when this character is received
export const OBD_OUTPUT_DELIMETER: string = '>';

// This is the end of line delimeter used for OBD data.
// We use it to terminate message strings being sent
export const OBD_OUTPUT_EOL: string = '\r';
