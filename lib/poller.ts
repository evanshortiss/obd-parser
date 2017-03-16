'use strict';

import { getConnection } from './connection';
import { EventEmitter } from 'events';
import { PollerArgs, OBDOutput, OBDConnection } from './interfaces';
import { getParser } from './parser';
import * as Promise from 'bluebird';
import{ IDebugger } from 'debug';
import generateLogger from './log';


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
  private pollTimer?: NodeJS.Timer;
  private polling: boolean;
  private args: PollerArgs;
  private locked: boolean;
  private msgSendCount: number = 0;
  private msgRecvCount: number = 0;
  private timeoutTimer?: NodeJS.Timer;
  private log: Function;
  private timeoutFn?: Function;
  private curListener?: Function;

  public constructor (args: PollerArgs) {
    super();

    this.args = args;
    this.lastResponseTs = null;
    this.lastPollTs = null;
    this.polling = false;
    this.locked = false;
    this.log = generateLogger(args.pid.getName());

    this.log('created poller for %s', args.pid.getName());
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
      // A poll has occurred previously. If we're calling this function
      // before the max interval time is reached then we must wait n ms
      // where n is the difference between the max poll rate and last poll sent
      const delta = this.lastResponseTs - this.lastPollTs;

      if (delta <= 0) {
        this.log(`delta between lastResponseTs and lastPollTs for ${this.args.pid.getName()} was ${delta}. defaulting to interval of ${this.args.interval || 1000}`);
        return this.args.interval || 1000;
      }

      const nextPoll = delta > this.args.interval ? 0 : this.args.interval - delta;

      this.log(
        'getting poll time for %s, using last time of %s vs now %s. delta is %dms.',
        this.args.pid.getName(),
        new Date(this.lastPollTs).toISOString(),
        new Date().toISOString(),
        delta
      );

      this.log(`next poll in ${nextPoll}ms`);

      return nextPoll;
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
      data.bytes.substr(2, 2) === this.args.pid.getPid() : false;
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

    this.log('poll was called');

    // Cannot call this function if we're already polling
    if (this.polling) {
      return Promise.reject(
        new Error(`${self.args.pid.getName()} - cannot call poll when polling loop is active`)
      );
    }

    return new Promise<OBDOutput> ((resolve, reject) => {
      const bytesToWrite:string = self.args.pid.getWriteString();

      self.log(`getting connection to poll (${self.args.pid.getPid()})`);

      const listener = (output: OBDOutput) => {
        self.log('poll received response. removing listener');
        self.unsetTimeoutOperation();
        self.removeOutputListener();
        resolve(output);
      };

      self.setTimeoutOperation(() => {
        reject(new Error(`polling timedout`));
      }, 1000);

      self.addOutputListener(listener);

      self.writeBytesToEcu()
        .catch(reject);
    });
  }

  /**
   * Starts this poller polling. This means it will poll at the interval
   * defined in the args, or as close as possible to that
   * @return {void}
   */
  public startPolling () {
    const self = this;

    this.log('start poll interval for %s', this.args.pid.getName());

    if (this.polling) {
      self.log('called startPolling, but it was already started');
      return;
    }

    // Need to lock this component in polling state (TODO: use an FSM pattern)
    this.polling = true;

    // Function we can reuse to do the initial poll should it fail
    function doInitialPoll () {
      self.pollTimer = setTimeout(() => {
        self.log('sending initial poll for polling loop');

        // Handle "data" events when emitted
        self.log('added data listener for poll loop');
        self.addOutputListener(self.onPollLoopData.bind(self));

        // If the initial poll dies not get data quickly enough we need to
        // take action by retrying until it succeeds
        self.setTimeoutOperation(() => {
          self.log('poll loop failed to get data for initial poll. retrying immediately');
          doInitialPoll();
        }, 5000);

        self.writeBytesToEcu()
          .catch((e: Error) => {
            self.log('error doing poll loop - ', e.stack);
            self.log('retrying in 1 second');
            setTimeout(doInitialPoll, 1000)
          });
      }, 250);
    }

    // Get started!
    doInitialPoll();
  }

  private removeOutputListener () {
    if (this.curListener) {
      this.log('removing "data" listener from parser until new poll is sent');
      getParser().removeListener('data', this.curListener);
      this.curListener = undefined;
    }
  }

  private addOutputListener (listener: Function) {
    if (this.curListener) {
      this.log('poller cannot add multiple listeners. removing cur listener');
      this.removeOutputListener();
    }

    this.curListener = listener;
    getParser().addListener('data', listener);
  }


  private writeBytesToEcu () {
    const self = this;

    return getConnection()
      .then((conn: OBDConnection) => {
        self.msgSendCount++;

        self.lastPollTs = Date.now();

        const bytesToWrite:string = self.args.pid.getWriteString();
        self.log(`got connection. writing data "${bytesToWrite}"`);

        conn.write(bytesToWrite);
      });
  }

  private setTimeoutOperation (fn: Function, ts: number) {
    const self = this;

    // Clear an existing timeout event
    this.unsetTimeoutOperation();

    self.log(`adding new timeout event with delay of ${ts}ms`);

    // If after 2500ms we haven't received data then we need to take an action
    this.timeoutTimer = setTimeout(() => {
      self.log('poll operation timed out. trigger supplied callback');
      fn();
    }, ts);

    // Generate a timeout function. We store it so it can be removed
    this.timeoutFn = (output: OBDOutput) => {
      if (self.timeoutTimer && self.isMatchingPayload(output)) {
        self.log('received relevant data event. removing timeout handler');
        self.unsetTimeoutOperation();
      }
    };

    getParser().once('data', this.timeoutFn);
  }


  private unsetTimeoutOperation () {
    if (this.timeoutTimer) {
      if (this.timeoutFn) {
        getParser().removeListener('data', this.timeoutFn);
      }

      clearTimeout(this.timeoutTimer);
      this.timeoutTimer = undefined;
      this.timeoutFn = undefined;
      this.log('cleared existing poller timeout event');
    }
  }


  /**
   * Called when we receive poller data if this.polling is true
   * @param {OBDOutput} output
   */
  private onPollLoopData (output: OBDOutput) {
    const self = this;

    function doNextPoll (time: number) {
      self.log(`queueing next poll for ${time}ms from now`);

      if (self.pollTimer) {
        self.log('doNextPoll called before previous was cleared. possible timeout. clearing');
        clearTimeout(self.pollTimer);
      }

      self.pollTimer = setTimeout(() => {
        if (self.curListener) {
          self.log(`poll timer was triggered, but we are already waiting on data. skipping`);
        }

        self.log(`poll timer triggered after ${time}ms`);

        self.addOutputListener(self.onPollLoopData.bind(self));

        // Make sure we pay attention to possible timeouts in polling
        // A timeout is triggerd 1 second after the poll time if we get no data
        self.setTimeoutOperation(() => {
          self.log('timeout 1 sec after requesting data. retrying now');
          doNextPoll(0);
        }, 1000);

        self.writeBytesToEcu()
          .catch((e: Error) => {
            self.log(`error performing next poll. retry in ${time}ms`);
            doNextPoll(time);
          });
      }, time);
    }


    // If we have no timeoutTimer set then we should not be receiving any data!
    if (self.isMatchingPayload(output)) {
      self.log(`poller detected event that matched with self (${this.args.pid.getPid()}). payload is ${output.bytes}`);

      // Clear the timer
      self.pollTimer = undefined;

      // Stay on top of counts
      self.msgRecvCount++;

      // Let folks know we got data
      self.emit('data', output);

      // Track when we got this response
      self.lastResponseTs = Date.now();

      // The emitted event is a match for this poller's PID
      self.log(`(${self.args.pid.getPid()}) received relevant data event (${output.bytes}) ${Date.now() - self.lastPollTs}ms after polling`);

      // No longer need to worry about timeouts
      self.unsetTimeoutOperation();

      // Remove ouput listeners. We don't care data unless we requested it
      self.removeOutputListener();

      // Queue next poll
      doNextPoll(self.getNextPollDelay());
    } else {
      self.log(`detected event (${output.bytes}) but it was not a match`);
    }
  }

  /**
   * Stops the polling process and cancels any polls about to be queued
   * @return {void}
   */
  public stopPolling () {
    this.log('cacelling poll interval for %s', this.args.pid.getName());

    this.polling = false;

    this.unsetTimeoutOperation();

    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = undefined;
    }
  };
}








