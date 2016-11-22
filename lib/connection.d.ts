/// <reference types="bluebird" />
import * as Promise from 'bluebird';
import { OBDConnection } from './interfaces';
/**
 * Sets the connection to be used. This should be passed a pre-configured connector
 */
export declare function setConnectorFn(cFn: Function): void;
/**
 * Returns a pre-configured connection instance.
 * @return {OBDConnection}
 */
export declare function getConnection(): any;
/**
 * We need to configure the given connection with some sensible defaults
 * and also optimisations to ensure best data transfer rates.
 *
 * @param {OBDConnection} conn A connection object from this module's family
 */
export declare function configureConnection(conn: OBDConnection): Promise<void>;
