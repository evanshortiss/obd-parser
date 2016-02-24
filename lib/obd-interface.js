'use strict';

var connection = require('./connection')
  , log = require('fhlog').get('[obd-parser]');

/**
 * Interface used to add monitors for specifc data types
 * @type {Object}
 */
exports.pollers = require('./pollers');


/**
 * Interface used to determine the availability and support for different PIDs
 * @type {Object}
 */
exports.pids = require('./pids');


/**
 * Initialises this module for usage (no shit - right?)
 * @param  {Object}   opts
 * @return {Promise}
 */
exports.init = function (opts) {
  log.i('initialising obd-parser');

  // Expose the connection we've been passed
  connection.setConnectorFn(opts.connectorFn);

  // Call this to get a connection error/success now rather than later
  return connection.getConnection()
    .then(onInitialiseSuccess);


  function onInitialiseSuccess () {
    log.i('initialised successfully');
  }
};
