'use strict';


/**
 * Parses a hexadecimal string to regular base 10
 * @param  {String} byte
 * @return {Number}
 */
var parseHexToDecimal = exports.parseHexToDecimal = function (byte) {
  return parseInt(byte, 16);
};


/**
 * Converts an OBD value to a percentage
 * @param  {String} byte
 * @return {Number}
 */
exports.percentage = function (byte) {
  return parseHexToDecimal(byte) * (100 / 255);
};

exports.coolantTemp = function (byte) {
  return parseHexToDecimal(byte) - 40;
};

exports.rpm = function (byteA, byteB) {
  return ((parseHexToDecimal(byteA) * 256) + parseHexToDecimal(byteB)) / 4;
};
