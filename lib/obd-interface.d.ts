/// <reference types="bluebird" />
import * as Promise from 'bluebird';
import * as pids from './pids/pid';
/**
 * Exports all PID classes for use
 */
export { pids as PIDS };
/**
 * Exports the ECUPoller class
 */
export { ECUPoller as ECUPoller } from './poller';
export { OBDOutput, PIDInfo, OBDConnection } from './interfaces';
/**
 * Initialises this module for usage (no shit - right?)
 * @param  {Object}   opts
 * @return {Promise}
 */
export declare function init(connectorFn: Function): Promise<void>;
