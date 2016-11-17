'use strict';

import * as connection from './connection';
import * as Promise from 'bluebird';
import { getLogger } from './log';

let log = getLogger(__filename);

/**
 * Initialises this module for usage (no shit - right?)
 * @param  {Object}   opts
 * @return {Promise}
 */
export function init (connectorFn: Function) : Promise<void> {
  log.info('initialising obd-parser');

  // Expose the connection we've been passed
  connection.setConnectorFn(connectorFn);

  // Call this to get a connection error/success now rather than later
  return connection.getConnection()
    .then(onInitialiseSuccess);


  function onInitialiseSuccess () {
    log.info('initialised successfully');
  }
};
