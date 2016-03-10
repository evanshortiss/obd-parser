'use strict';

var connection = require('../connection')
  , assert = require('assert')
  , events = require('events')
  , util = require('util')
  , parser = require('../parser')
  , log = require('fhlog').get('[ECUPoller]')
  , pids = require('../pids')
  , _ = require('lodash');

/**
 * Constructor function to create a poller instance.
 *
 * Poller instances will request data from the ECU at a defined refresh rate.
 *
 * @param {Object} opts
 */
function ECUPoller (opts) {

  assert.equal(
    typeof opts.constname,
    'string',
    'opts.constname must be a String'
  );

  this.pidInfo = pids.getByConstname(opts.constname);

  if (!_.isUndefined(opts.refreshRate)) {
    assert(
      _.isNumber(opts.refreshRate),
      'opts.refreshRate must be a number'
    );

    assert(
      opts.refreshRate > 0,
      'opts.refreshRate must be greater than 0'
    );

    this.pollInterval = getPollMilliseconds(opts.refreshRate);
  } else {
    assert(
      _.isNumber(opts.pollInterval),
      'opts.pollInterval must be greater a number than 0'
    );

    assert(
      opts.pollInterval > 0,
      'opts.pollInterval must be greater a number than 0'
    );

    this.pollInterval = opts.pollInterval;
  }

  this.opts = opts;
  this.lastResponseTime = null;
  this.pollTimer = null;
  this.polling = false;

  // We wait until the parser emits a data event. We only bind this
  // when we need it to reduce number of concurrent listeners
  parser.on('data', this._onEcuData.bind(this));

  assert(
    this.pidInfo,
    'unable to create ECUPoller "' + opts.name + '" is not a supported PID'
  );
}
util.inherits(ECUPoller, events.EventEmitter);
module.exports = ECUPoller;


/**
 * Generates our poll delay based on the refresh frequency for this poller
 * @param  {Number} hz
 * @return {Number}
 */
 function getPollMilliseconds (hz) {
  return (1000 / hz);
}


/**
 * We want to get as close to the requested refresh rate as possible.
 * This means if the ECU has a response delay then we account for it.
 *
 * @param  {Number} max         The max delay in between pools
 * @param  {Number} lastPollTs  The time we issued the last poll
 * @return {Number}
 */
ECUPoller.prototype.getPollDelay = function (max, lastPollTs) {
  var msSinceLastPoll = (Date.now() - lastPollTs);

  log.d(
    'getting poll time for %s (%s), using last time of %s vs now %s',
    this.pidInfo.opts.pid,
    this.opts.constname,
    lastPollTs,
    Date.now()
  );

  if (msSinceLastPoll >= max) {
    return 0;
  } else {
    return (max - msSinceLastPoll);
  }
};


/**
 * Handler for data events emitted by teh ecu data parser.
 * Should not be called directly.
 * @param {Object} data
 */
ECUPoller.prototype._onEcuData = function (data) {
  if (data.raw.indexOf(this.pidInfo.opts.pid) === 2) {
    log.d(
      'parser emitted a data event for pid %s (%s)',
      this.pidInfo.opts.pid,
      this.opts.constname
    );
    data.pretty = this.pidInfo.getPretty(data.value);

    this.emit('data', data);
    this._queuePoll();
  }
};


/**
 * Polls the ECU for this specifc ECUPoller's PID. Use this if you want to
 * poll on demand rather than on an interval.
 *
 * This method does not return data since ECUPollers are event based. To get
 * returned data listen to the 'data' event on the ECUPoller instance
 */
ECUPoller.prototype.poll = function () {
  var self = this;

  function pollEcu (conn) {
    log.i(
      'performing poll for %s, command is:',
      self.opts.constname,
      self.pidInfo.getWriteString()
    );

    // Now write our request to the ECU
    conn.write(self.pidInfo.getWriteString());
  }

  function onPollError (err) {
    log.e('failed to poll for %s', self.opts.constname);
    self.emit('error', err);
    self._queuePoll();
  }

  connection.getConnection()
    .then(pollEcu)
    .catch(onPollError);
};



ECUPoller.prototype.startPollLoop = function () {
  log.i('start poll interval for %s', this.opts.name);
  this.polling = true;
  this._queuePoll();
};


ECUPoller.prototype._queuePoll = function () {
  if (this.polling) {
    this.polling = true;

    var delay = this.getPollDelay(
      this.pollInterval,
      (this.pollTimer !== null) ? this.pollTimer._idleStart : 0
    );

    log.d('queue poll for %s with delay of %s', this.opts.constname, delay);

    this.pollTimer = setTimeout(
      this.poll.bind(this),
      delay
    );
  }
};


ECUPoller.prototype.stopPollLoop = function () {
  log.i('cacelling poll interval for %s', this.opts.constname);
  clearTimeout(this.pollTimer);
  this.pollTimer = null;
  this.polling = false;
};
