'use strict';

import * as Promise from 'bluebird';
import { OBD_OUTPUT_EOL } from './constants';
import { getParser } from './parser';
import { OBDConnection } from './interfaces';
import log = require('./log');

let connectorFn: Function;
let connection:OBDConnection|null = null;

/**
 * Sets the connection to be used. This should be passed a
 * pre-configured connector
 */
export function setConnectorFn (cFn: Function) {
  log('setting connnection function');
  connectorFn = cFn;
};


/**
 * Returns a pre-configured connection instance.
 * @return {OBDConnection}
 */
export function getConnection () {
  if (!connectorFn) {
    throw new Error(
      'cannot get connection. please ensure connectorFn was passed to init'
    );
  }

  if (connection) {
    return Promise.resolve(connection);
  }

  log('getting connnection');
  return connectorFn(configureConnection);
};


/**
 * We need to configure the given connection with some sensible defaults
 * and also optimisations to ensure best data transfer rates.
 *
 * @param {OBDConnection} conn A connection object from this module's family
 */
export function configureConnection (conn: OBDConnection) {
  log('configuring obd connection');

  connection = conn;

  // Need to ensure each line is terminated when written
  let write:Function = conn.write.bind(conn);
  let queue:Array<string> = [];
  let locked:boolean = false;

  function doWrite (msg: string) {
    locked = true;

    // Need to write the number of expected replies
    let replyCount:number = (msg.indexOf('AT') === 0) ? 0 : 1;

    // Generate the final message to be sent, e.g "ATE00\r"
    msg = msg
      .concat(replyCount.toString())
      .concat(OBD_OUTPUT_EOL);

    log('writing message "%s", connection will lock', msg);

    // When next "line-break" event is emitted by the parser we can send
    // next message since we know it has been processed - we don't care
    // about success etc
    getParser().once('line-break', function () {
      // Get next queued message (FIFO ordering)
      let payload:string|undefined = queue.shift();

      locked = false;

      log('connection unlocked');

      if (payload) {
        log('writing queued payload: "%s"', payload);
        // Write a new message (FIFO)
        conn.write(payload);
      }
    });

    // Write the formatted message to the obd interface
    write(msg);
  }

  // Overwrite the public write function with our own
  conn.write = function _obdWrite (msg:string) {
    if (!locked && msg) {
      doWrite(msg);
    } else if (msg) {
      log('queue is locked. queueing message %s', JSON.stringify(msg));
      queue.push(msg);
    }
  };

  // Pipe all output from the serial connection to our parser
  conn.on('data', getParser().write.bind(getParser()));

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

  return Promise.resolve(conn);
}
