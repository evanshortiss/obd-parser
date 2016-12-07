'use strict';

import { getConnection } from './connection';
import { EventEmitter } from 'events';
import { PollerArgs, OBDOutput, OBDConnection } from './interfaces';
import { getParser } from './parser';
import * as Promise from 'bluebird';
import log = require('./log');


/**
 * Constructor function to create a poller instance.
 *
 * Poller instances will request data from the ECU at a defined refresh rate.
 *
 * @param {Object} opts
 */
export class ECUPoller extends EventEmitter {

  private lastResponseTs: number|null;
  private lastPollTs: number|null;
  private pollTimer: NodeJS.Timer|null;
  private polling: boolean;
  private args: PollerArgs;
  private locked: boolean;

  public constructor (args: PollerArgs) {
    super();

    this.args = args;
    this.lastResponseTs = null;
    this.lastPollTs = null;
    this.pollTimer = null;
    this.polling = false;
    this.locked = false;

    log('created poller for %s', args.pid.getName());
  }

  /**
   * We want to get as close to the requested refresh rate as possible.
   * This means if the ECU has a response delay then we account for it.
   *
   * @param  {Number} max         The max delay in between pools
   * @param  {Number} lastPollTs  The time we issued the last poll
   * @return {Number}
   */
  private getNextPollDelay () : number {
    if (this.lastPollTs) {
      log(
        'getting poll time for %s, using last time of %s vs now %s',
        this.args.pid.getName(),
        this.lastPollTs,
        Date.now()
      );

      // A poll has occurred previously. If we're calling this function
      // before the max interval time is reached then we must wait n ms
      // where n is the difference between the max poll rate and last poll sent
      let delta:number = this.lastResponseTs - this.lastPollTs;
      return delta > this.args.interval ? 0 : this.args.interval - delta;
    } else {
      // No previous poll has occurred yet so fire one right away
      return 0;
    }
  }

  /**
   * Locks this poller to prevent it sending any more messages to the ECU
   * @return {void}
   */
  private lock () {
    this.locked = true;
  }

  /**
   * Unlocks this poller to allow it to send more messages to the ECU
   * @return {void}
   */
  private unlock () {
    this.locked = false;
  }

  /**
   * Returns a boolean, where true indicates this instance is locked
   * @return {boolean}
   */
  private isLocked (): boolean {
    return this.locked;
  }

  /**
   * Returns a boolean indicating if the provided OBDOutput is designated
   * for this Poller instance
   * @return {boolean}
   */
  private isMatchingPayload (data: OBDOutput) {
    return data.bytes ?
      data.bytes.indexOf(this.args.pid.getPid()) === 2 : false;
  }

  /**
   * Polls the ECU for this specifc ECUPoller's PID. Use this if you want to
   * poll on demand rather than on an interval.
   *
   * This method returns a Promise, but you can also bind a handler for the
   * "data" event if that is preferable.
   */
  public poll (): Promise <OBDOutput> {
    const self = this;

    if (self.isLocked()) {
      log(
        'poll was called for poller %s, but it was locked!',
        self.args.pid.getName()
      );

      // Reject the promise with an error
      return Promise.reject(
        new Error(
          self.args.pid.getName() + ' cannot poll() when isLocked() is true'
        )
      );
    }

    return new Promise<OBDOutput>(function (resolve, reject) {
      // Need to prevent sending multiple polls unless we get a response
      self.lock();

      // Generate the bytes to send to our ECU
      const bytesToWrite:string = self.args.pid.getWriteString();

      // Callback for when "data" is emitted by the OBDStreamParser
      const handler:Function = function (output:OBDOutput) {
        if (self.isMatchingPayload(output)) {
          // Remove this listener since it has been called for our probe
          getParser().removeListener('data', handler);

          // The emitted event is a match for this poller's PID
          log(
            'parser emitted a data event for pid %s (%s)',
            self.args.pid.getPid(),
            self.args.pid.getName()
          );

          // Let listeners know we got data
          self.emit('data', output);

          // Track when we got this response
          self.lastResponseTs = Date.now();

          // Polls can be queued since we got a response
          self.unlock();

          // If this poller is polling then queue the next poll
          if (self.polling) {
            self.pollTimer = global.setTimeout(
              self.poll.bind(self),
              self.getNextPollDelay()
            );
          }

          resolve(output);
        }
      };

      function pollEcu (conn: OBDConnection) {
        log(
          'performing poll for %s, command is:',
          self.args.pid.getName(),
          bytesToWrite
        );

        // listen for data events sicne we need to watch for
        // this PID in responses
        getParser().addListener('data', handler);

        // Track when we fired this poll
        self.lastPollTs = Date.now();

        // Now write our request to the ECU
        conn.write(bytesToWrite);
      }

      function onPollError (err: any) {
        log('failed to poll for %s', self.args.pid.getName());

        // Remove the listener, could cause nasty side effects if we forget!
        getParser().removeListener('data', handler);

        // No longer need to keep this poller locked
        self.unlock();

        self.emit('error', err);

        reject(err);
      }

      getConnection()
        .then(pollEcu)
        .catch(onPollError);
    });
  }

  /**
   * Starts this poller polling. This means it will poll at the interval
   * defined in the args, or as close as possible to that
   * @return {void}
   */
  public startPolling () {
    log('start poll interval for %s', this.args.pid.getName());

    if (!this.polling) {
      this.polling = true;
      this.pollTimer = global.setTimeout(
        this.poll.bind(this),
        this.getNextPollDelay()
      );
    }
  }

  /**
   * Stops the polling process and cancels any polls about to be queued
   * @return {void}
   */
  public stopPolling () {
    log('cacelling poll interval for %s', this.args.pid.getName());

    this.polling = false;

    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
  };
}








