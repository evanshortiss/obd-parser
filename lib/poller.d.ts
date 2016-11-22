/// <reference types="node" />
import { EventEmitter } from 'events';
import { PollerArgs } from './interfaces';
/**
 * Constructor function to create a poller instance.
 *
 * Poller instances will request data from the ECU at a defined refresh rate.
 *
 * @param {Object} opts
 */
export declare class ECUPoller extends EventEmitter {
    private lastResponseTs;
    private lastPollTs;
    private pollTimer;
    private polling;
    private args;
    constructor(args: PollerArgs);
    /**
     * We want to get as close to the requested refresh rate as possible.
     * This means if the ECU has a response delay then we account for it.
     *
     * @param  {Number} max         The max delay in between pools
     * @param  {Number} lastPollTs  The time we issued the last poll
     * @return {Number}
     */
    private getNextPollDelay();
    /**
     * Handler for data events emitted by teh ecu data parser.
     * Should not be called directly.
     * @param {Object} data
     */
    private onEcuData(data);
    /**
     * Polls the ECU for this specifc ECUPoller's PID. Use this if you want to
     * poll on demand rather than on an interval.
     *
     * This method does not return data since ECUPollers are event based. To get
     * returned data listen to the 'data' event on the ECUPoller instance
     */
    poll(): void;
    startPolling(): void;
    stopPolling(): void;
}
