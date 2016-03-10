'use strict';

var Promise = require('bluebird')
  , constants = require('./constants')
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
  log.d('configuring obd connection');

  // Need to ensure each line is terminated when written
  var write = conn.write.bind(conn)
    , queue = []
    , locked = false;

  function doWrite (msg) {
    locked = true;

    // Need to write the number of expected replies
    var replyCount = (msg.indexOf('AT') === 0) ? 0 : 1;

    // Generate the final message to be sent, e.g "ATE00\r"
    msg = msg
      .concat(replyCount)
      .concat(constants.OBD_OUTPUT_EOL);

    log.d('writing message %s', JSON.stringify(msg));

    // When next "data" event is emitted by the parser we can send next message
    // since we know it has been processed - we don't care about success etc
    parser.once('line-break', function () {
      // Unlock the queue
      locked = false;

      // Write a new message (FIFO)
      conn.write(queue.shift());
    });

    // Write the formatted message to the obd interface
    write(msg);
  }

  // Overwrite the public write function with our own
  conn.write = function _obdWrite (msg) {
    if (!locked && msg) {
      doWrite(msg);
    } else if (msg) {
      log.d('queueing message %s', JSON.stringify(msg));
      queue.push(msg);
    }
  };

  // Configurations below are from node-serial-obd and python-OBD

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
  conn.on('data', parser.write.bind(parser));

  return Promise.resolve();
}
