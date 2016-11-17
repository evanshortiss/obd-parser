'use strict';

import { getConnection } from './connection';
import { EventEmitter } from 'events';
import { PollerArgs } from './interfaces/poller-args';
import { getParser } from './parser';
import { getLogger } from './log';

let log = getLogger(__filename);

/**
 * Constructor function to create a poller instance.
 *
 * Poller instances will request data from the ECU at a defined refresh rate.
 *
 * @param {Object} opts
 */
class ECUPoller extends EventEmitter {

  private lastResponseTs: number|null;
  private lastPollTs: number|null;
  private pollTimer: NodeJS.Timer|null;
  private polling: boolean;
  private args: PollerArgs;

  public constructor (args: PollerArgs) {
    super();

    this.args = args;
    this.lastResponseTs = null;
    this.lastPollTs = null;
    this.pollTimer = null;
    this.polling = false;

    // We wait until the parser emits a data event. We only bind this
    // when we need it to reduce number of concurrent listeners
    getParser().on('data', this.onEcuData.bind(this));
  }

  /**
   * We want to get as close to the requested refresh rate as possible.
   * This means if the ECU has a response delay then we account for it.
   *
   * @param  {Number} max         The max delay in between pools
   * @param  {Number} lastPollTs  The time we issued the last poll
   * @return {Number}
   */
  getNextPollDelay () : number {
    log.debug(
      'getting poll time for %s (%s), using last time of %s vs now %s',
      this.args.pid.getName(),
      this.lastPollTs,
      Date.now()
    );

    if (this.lastPollTs) {
      // A poll has occurred earlier. If we're calling this function
      // before the max interval time is reached then we must wait n ms
      // where n is the difference between the max poll rate and last poll sent
      let delta:number = this.lastResponseTs - this.lastPollTs;
      return delta > this.args.interval ? 0 : this.args.interval - delta;
    } else {
      // No previous poll occurred so can fire next one asap
      return 0;
    }
  }

  /**
   * Handler for data events emitted by teh ecu data parser.
   * Should not be called directly.
   * @param {Object} data
   */
  private onEcuData (data: OBDOutput) {
    if (data.bytes.indexOf(this.args.pid.getPid()) === 2) {
      // The emitted event is a match for this poller's PID
      log.debug(
        'parser emitted a data event for pid %s (%s)',
        this.args.pid.getPid(),
        this.args.pid.getName()
      );

      this.emit('data', data);
    }

    // Track when we got this response
    this.lastResponseTs = Date.now();

    // If this poller is polling then queue the next poll
    if (this.polling) {
      this.pollTimer = global.setTimeout(
        this.poll.bind(this),
        this.getNextPollDelay()
      );
    }
  };

  /**
   * Polls the ECU for this specifc ECUPoller's PID. Use this if you want to
   * poll on demand rather than on an interval.
   *
   * This method does not return data since ECUPollers are event based. To get
   * returned data listen to the 'data' event on the ECUPoller instance
   */
  poll () {
    let self = this;
    let bytesToWrite:string = self.args.pid.getWriteString();

    function pollEcu (conn: OBDConnection) {
      log.info(
        'performing poll for %s, command is:',
        self.args.pid.getName(),
        bytesToWrite
      );

      // Track when we fired this poll
      this.lastPollTs = Date.now();

      // Now write our request to the ECU
      conn.write(bytesToWrite);
    }

    function onPollError (err: any) {
      log.error('failed to poll for %s', self.args.pid.getName());
      self.emit('error', err);
    }

    getConnection()
      .then(pollEcu)
      .catch(onPollError);
  }

  startPolling () {
    log.info('start poll interval for %s', this.args.pid.getName());

    if (!this.polling) {
      this.polling = true;
      this.pollTimer = global.setTimeout(
        this.poll.bind(this),
        this.getNextPollDelay()
      );
    }
  }

  stopPolling () {
    log.info('cacelling poll interval for %s', this.args.pid.getName());

    this.polling = false;

    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
  };
}








