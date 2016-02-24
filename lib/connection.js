'use strict';

var Promise = require('bluebird')
  , log = require('fhlog').get('[connnection]')
  , parser = require('./parser');

var connectorFn = null;

/**
 * Sets the connection to be used.
 * This should be passed a pre-configured
 *
 * @param {[type]} mod [description]
 */
exports.setConnectorFn = function (cFn) {
  log.d('setting connnection function');
  connectorFn = cFn;
};


/**
 * Returns a pre-configured connection instance.
 * @return {OBDConnection}
 */
exports.getConnection = function () {
  return connectorFn(configureConnection);
};


/**
 * We need to configure the given connection with some sensible defaults
 * and also optimisations to ensure best data transfer rates.
 *
 * @param {OBDConnection} conn A connection object from this module's "cousins"
 */
function configureConnection (conn) {
  // Configurations from node-serial-obd and python-OBD
  log.d('configuring obd connection');

  // Performs a reset
  conn.write('ATZ');
  // No echo
  conn.write('ATE0');
  // Remove linefeeds
  conn.write('ATL0');
  // This disables spaces in in output, which is faster!
  conn.write('ATS0');
  // Turns off headers and checksum to be sent.
  conn.write('ATH0');
  // Turn adaptive timing to 2. This is an aggressive learn curve for adjusting
  // the timeout. Will make huge difference on slow systems.
  conn.write('ATAT2');
  // Set timeout to 10 * 4 = 40msec, allows +20 queries per second. This is
  // the maximum wait-time. ATAT will decide if it should wait shorter or not.
  conn.write('ATST0A');
  // Use this to set protocol automatically, python-OBD uses "ATSPA8", but
  // seems to have issues. Maybe this should be an option we can pass?
  conn.write('ATSP0');

  // Pipe all output from the serial connection to our parser
  conn.pipe(parser);

  return Promise.resolve();
}
