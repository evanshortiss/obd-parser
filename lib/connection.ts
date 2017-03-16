'use strict';

import * as Promise from 'bluebird';
import { OBD_OUTPUT_EOL } from './constants';
import { getParser } from './parser';
import { OBDConnection } from './interfaces';
import generateLogger from './log';

const log = generateLogger('connection');

let connectorFn: Function;
let connection:OBDConnection|null = null;

let msgRecvCount = 0;
let msgSendCount = 0;

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
    log(`writing "${msg}". queue state ${JSON.stringify(queue)}`);
    log(`send count ${msgSendCount}. receive count ${msgRecvCount}`);
    locked = true;

    // Need to write the number of expected replies for poller messages
    // TODO: Better implementation for passing expected replies count...
    if (msg.indexOf('AT') === -1) {
      // Generate the final message to be sent, e.g "010C1\r" (add the final '1')
      msg = msg + '1';
    }

    msg = msg.concat(OBD_OUTPUT_EOL);

    log(`writing message ${msg}. connection will lock`);

    // When next "line-break" event is emitted by the parser we can send
    // next message since we know it has been processed - we don't care
    // about success etc
    getParser().once('line-break', function () {
      msgRecvCount++;

      // Get next queued message (FIFO ordering)
      let payload:string|undefined = queue.shift();

      locked = false;

      log(`new line detected by parser. connection unlocked. queue contains ${JSON.stringify(queue)}`);

      if (payload) {
        log(
          'writing previously queued payload "%s". queue now contains %s',
          payload,
          JSON.stringify(queue)
        );
        // Write a new message (FIFO)
        conn.write(payload);
      } else {
        log('no payloads are queued');
      }
    });

    // Write the formatted message to the obd interface
    write(msg);
  }

  // Overwrite the public write function with our own
  conn.write = function _obdWrite (msg:string) {
    if (!locked && msg) {
      msgSendCount++;
      log(`queue is unlocked, writing message "${msg}"`);
      doWrite(msg);
    } else if (msg) {
      queue.push(msg);
      log(
        'queue is locked. queued message %s. entries are %s',
        JSON.stringify(msg),
        queue.length,
        JSON.stringify(queue)
      );
    }
  };

  // Pipe all output from the serial connection to our parser
  conn.on('data', function (str) {
    log(`received data "${str}"`);
    getParser().write(str);
  });

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

  // TODO: use events instead
  // Nasty way to make sure configuration calls have been performed before use
  return new Promise((resolve) => {
    let interval: NodeJS.Timer = setInterval(() => {
     if (queue.length === 0) {
       clearInterval(interval);
       setTimeout(function () {
         log('connection intialisation complete');
         resolve(conn);
       }, 500);
     } else {
       log('connection initialising...');
     }
    }, 250);
  });
}
