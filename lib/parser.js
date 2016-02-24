'use strict';

var _ = require('lodash')
  , pids = require('./pids')
  , util = require('util')
  , VError = require('verror')
  , constants = require('./constants')
  , Transform = require('stream').Transform
  , log = require('fhlog').get('[parser]');


function OBDStreamParser (options) {
  Transform.call(this, options);

  this._buffer = '';
}
util.inherits(OBDStreamParser, Transform);


/**
 * This is an implementation to stream.Transform so we need to implement
 * this method to transform out data
 * @param  {Buffer}   data
 * @param  {String}   encoding
 * @param  {Function} done
 */
OBDStreamParser.prototype._transform = function (data, encoding, done) {
  log.d('received data %s', data);

  // Remove any linebreaks from input, and add to buffer. We need the double
  // escaped replace due to some data having extra back ticks...wtf
  this._buffer += data.toString('utf8').replace(/\r/g, '').replace(/\\r/g, '');

  var cmds = [];

  if (hasCompletedOutput(this._buffer)) {
    // We have a full output from the OBD interface e.g "410C1B56\r\r>"
    log.d('data was a comlpete output, parsing');

    cmds = extractOutputStrings(this._buffer);

    // Trigger a "data" event for each valid hex output received
    _.each(cmds, function (c) {
      this.emit('data', parseObdString(c));
    }.bind(this));

    // Reset the buffer since we've successfully parsed it
    this._flush(done);
  } else {
    log.d('data was not a complete output');
    done();
  }
};

OBDStreamParser.prototype._flush = function (done) {
  this._buffer = '';
  done();
};


/**
 * Determines if the output we have is a full and parseable string
 * @param  {Buffer}  data
 * @return {Boolean}
 */
function hasCompletedOutput (data) {
  // Basically, we check that the a newline has started
  return data.indexOf(constants.OBD_OUTPUT_DELIMETER) !== -1;
}


/**
 * Commands can be separated on multiple lines, we need each line separately
 * @param  {String} buffer
 * @return {Array}
 */
function extractOutputStrings (buffer) {
  log.d('extracting command strings from buffer %s', buffer);
  // Extract multiple commands if they exist in the String
  return _.filter(
    buffer.split(constants.OBD_OUTPUT_DELIMETER),
    hasParseableBytes
  );
}


/**
 * Determines if an OBD string is parseable by ensuring it's not a
 * generic message output
 * @param  {String}  str
 * @return {Boolean}
 */
function hasParseableBytes (str) {
  return (str.match(/^[0-9A-F]+$/)) ? true : false;
}


/**
 * Convert the returned bytes into their pairs
 * @param  {String} str
 * @return {Array}
 */
function getByteGroupings (str) {
  log.d('extracting byte groups from %s', str);
  return str.match(/.{1,2}/g);
}


/**
 * Parses an OBD output into useful data for developers
 * @param  {String} str
 * @return {Object}
 */
function parseObdString (str) {
  log.d('parsing command string %s', str);

  var byteGroups = getByteGroupings(str);
  var parsed = null;
  var ret = {
    ts: Date.now(),
    value: null,
    byteString: str,
    byteGroups: byteGroups
  };

  if (byteGroups[0] === constants.OBD_OUTPUT_MESSAGE_TYPES.MODE_01) {
    parsed = parseRealTime(byteGroups);

    if (parsed instanceof VError) {
      return _.merge(ret, {
        error: parsed
      });
    } else {
      return _.merge(ret, {
        value: parsed
      });
    }
  } else {
    return _.merge(ret, {
      error: new VError(
          'Unable to parse bytes for output "%s"; mode "%s" not supported',
          byteGroups.join(' '),
          byteGroups[0]
        )
    });
  }
}


/**
 * Parses realtime type OBD data to a useful format
 * @param  {Array} byteGroups
 * @return {Mixed}
 */
function parseRealTime (byteGroups) {
  log.d('parsing a realtime command with bytes', byteGroups.join());

  var pidInfo = pids.getBy('pid', byteGroups[1]);

  if (pidInfo) {
    return pidInfo.convertBytes.apply(
      null,
      // We only pass the information bytes (everything after the first pair)
      byteGroups.slice(2, pidInfo.byteCount)
    );
  } else {
    return new VError('no converter was found for pid %s', byteGroups[1]);
  }
}


module.exports = new OBDStreamParser();
