'use strict';

import * as R from 'ramda';
import { Transform } from 'stream';
import { OBD_OUTPUT_DELIMETER, OBD_OUTPUT_MESSAGE_TYPES } from './constants';
import VError = require('verror');
import * as Promise from 'bluebird';
import * as pids from './pids/index';
import { PID } from './pids/pid';
import log = require('./log');
import { OBDOutput } from './interfaces';

let parser: OBDStreamParser;

export class OBDStreamParser extends Transform {
  private _buffer: string;

  public constructor () {
    super();

    this._buffer = '';
  }

  public _flush (done: Function) {
    this._buffer = '';
    done();
  }

  public _transform (input: Buffer, encoding: String, done: Function): void {
    let data = input.toString('utf8');
    let self = this;

    log('received data %s', data);

    // Remove any linebreaks from input, and add to buffer. We need the double
    // escaped replace due to some data having extra back ticks...wtf
    self._buffer += data;

    log('current buffer: %s', JSON.stringify(self._buffer));

    if (hasPrompt(self._buffer)) {
      // We have a full output from the OBD interface e.g "410C1B56\r\r>"
      log('serial output completed. parsing');

      // Let listeners know that they can start to write again
      self.emit('line-break');

      // The hex lines from the current buffer
      let outputs: Array<string> = extractOutputStrings(self._buffer);

      // Trigger a "data" event for each valid hex output received
      Promise.map(outputs, (o: string) => {
        return parseObdString(o)
          .then((parsed) => {
            if (parsed) {
              self.emit('data', parsed);
            }
          })
          .catch((err) => {
            self.emit('error', err);
          });
      })
        .finally(() => {
          // Reset the buffer since we've successfully parsed it
          self._flush(done);
        });
    } else {
      log('data was not a complete output');
      done();
    }
      return;
    }
}


/**
 * Determines if the passed buffer/string has a delimeter
 * that indicates it has been completed.
 * @param   {String} data
 * @return  {Boolean}
 */
function hasPrompt (data: string) {
  // Basically, we check that the a newline has started
  return data.indexOf(OBD_OUTPUT_DELIMETER) !== -1;
}


/**
 * Commands can be separated on multiple lines, we need each line separately
 * @param  {String} buffer
 * @return {Array}
 */
function extractOutputStrings (buffer: string) {
  log(
    'extracting command strings from buffer %s',
    JSON.stringify(buffer)
  );

  // Extract multiple commands if they exist in the String by replacing
  // linebreaks and splitting on the newline delimeter
  // We replace double backticks. They only seem to occur in a test case
  // but we need to deal with it anyway, just in case...
  let cmds: Array<string> = buffer
    .replace(/\n/g, '')
    .replace(/\\r/g, '\r')
    .split(/\r/g);

  // Remove the new prompt char
  cmds = R.map((c:string) => {
    return c
      .replace(OBD_OUTPUT_DELIMETER, '')
      .replace(/ /g, '')
      .trim();
  })(cmds);

  // Remove empty commands
  cmds = R.filter((c: string) => {
    return !R.isEmpty(c);
  }, cmds);

  log(
    'extracted strings %s from buffer %s',
    JSON.stringify(cmds),
    buffer
  );

  return cmds;
}


/**
 * Determines if an OBD string is parseable by ensuring it's not a
 * generic message output
 * @param  {String}  str
 * @return {Boolean}
 */
function isHex (str: string) {
  return (str.match(/^[0-9A-F]+$/)) ? true : false;
}


/**
 * Convert the returned bytes into their pairs if possible, or return null
 * @param  {String} str
 * @return {Array|null}
 */
function getByteGroupings (str: string) : Array<string>|null {
  log('extracting byte groups from %s', JSON.stringify(str));

  // Remove white space (if any exists) and get byte groups as pairs
  return str.replace(/\ /g, '').match(/.{1,2}/g);
}


/**
 * Parses an OBD output into useful data for developers
 * @param  {String} str
 * @return {Object}
 */
function parseObdString (str: string) : Promise<OBDOutput|null> {
  log('parsing command string %s', str);

  let bytes = getByteGroupings(str);

  let ret:OBDOutput = {
    ts: new Date(),
    bytes: str,
    value: null,
    pretty: null
  };

  if (!isHex(str)) {
    log(
      'received generic (non hex) string output "%s", not parsing',
      str
    );
    return Promise.resolve(ret);
  } else if (bytes && bytes[0] === OBD_OUTPUT_MESSAGE_TYPES.MODE_01) {
    log(
      'received valid output "%s" of type "%s", parsing',
      str,
      OBD_OUTPUT_MESSAGE_TYPES.MODE_01
    );

    let pidCode: string = bytes[1];

    let pid:PID|null = pids.getPidByPidCode(pidCode);

    if (pid) {
      log('found match for pid %s', pidCode);
      // We have a class that knows how to deal with this pid output. Parse it!
      ret.pretty = pid.getFormattedValueForBytes(bytes);

      // pass all bytes returned and have the particular PID figure it out
      ret.value = pid.getValueForBytes(bytes.slice(0));

      ret.name = pid.getName();
      ret.pid = pid.getPid()

      return Promise.resolve(ret);
    } else {
      log('no match found for pid %s', pidCode);
      // Emit the data, but just the raw bytes
      return Promise.resolve(ret);
    }
  } else {
    // Wasn't a recognised message type - was probably our own bytes
    // since the serial module outputs those as "data" for some reason
    return Promise.resolve(null);
  }
}


/**
 * Parses realtime type OBD data to a useful format
 * @param  {Array} byteGroups
 * @return {Mixed}
 */
function getValueForPidFromPayload (bytes: Array<string>) : Promise<string> {
  log('parsing a realtime command with bytes', bytes.join());

  let pidType: string = bytes[1];

  return Promise.resolve(bytes)
    .then((bytes) => pids.getPidByPidCode(pidType))
    .then((pid) => {

      if (!pid) {
        // We don't have a class for this PID type so we can't handle it
        return Promise.reject(
          new VError(
            'failed to find an implementation for PID "%s" in payload "%s"',
            pidType,
            bytes.join('')
          )
        );
      }

      // Depending on the payload type we only parse a certain number of bytes
      let bytesToParse: Array<string> = bytes.slice(
        2,
        pid.getParseableByteCount()
      );

      // TODO: method overloading vs. apply? TS/JS (-_-)
      return pid.getValueForBytes.apply(pid, bytesToParse);
    });
}

export function getParser (): OBDStreamParser {
  if (parser) {
    return parser;
  } else {
    return parser = new OBDStreamParser();
  }
}
