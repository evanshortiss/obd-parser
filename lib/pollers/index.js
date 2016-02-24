'use strict';

var ECUPoller = require('./poller')
  , pollers = {}
  , log = require('fhlog').get('[pollers]');


/**
 * Get an object contain the types of pollers supported
 * @return {Object}
 */
exports.getPollerTypes = function () {
  return require('../pids').getSupportedPids();
};


/**
 * Get a poller instance for the given type
 * @param  {Object}     opts
 * @return {ECUPoller}
 */
exports.getPoller = function (opts) {
  log.i('getting poller of type "%s"', opts.name);

  if (pollers[opts.constname]) {
    log.d('returning poller "%s" from cache', opts.constname);
    return pollers[opts.constname];
  } else {
    log.d(
      'returning poller "%s" by creating new instance',
      opts.constname
    );
    return pollers[opts.name || opts.constname] = new ECUPoller(opts);
  }
};


/**
 * Delete an ECUPoller instance
 * @param  {String|ECUPoller} poller
 */
exports.removePoller = function (poller) {
  log.i(
    'removing poller of type "%s"',
    poller.pidInfo.opts.constname
  );

  poller.stopPollLoop();

  delete pollers[poller.opts.constname];
};
