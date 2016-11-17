'use strict';

import * as R from 'ramda';
import * as c from 'case';
import * as assert from 'assert';
import * as conversions from './conversions';
import { format } from 'util';
import { OBD_MESSAGE_TYPES } from '../constants';
import { PIDArgs } from '../interfaces/pid-args';

/**
 * Used to create PID instances that will parse OBD data
 * @constructor
 * @param {Object} opts
 */
export class PID {

  private constname: string;
  private fullpid: string;
  private opts: PIDArgs;

  public constructor (opts: PIDArgs) {
    assert(opts.bytes > 0, 'opts.bytes for PID must be above 0');

    // This can be used to identify this PID
    this.constname = c.constant(opts.name);

    // Save these for use
    this.opts = opts;
  }

  public getName () {
    return this.opts.name;
  }

  public getPid () {
    return this.opts.pid;
  }

  /**
   * Returns the number of bytes that should should be extracted for
   * parsing in a payload of this PID type
   */
  public getParseableByteCount () {
    return this.opts.bytes;
  }


  /**
   * Returns a prettier representation of a value that this PID represents, by
   * using the passed "units" value for the PID
   *
   * e.g f(10) => 10%
   * e.g f(55) => 55°C
   *
   * @param  {Number} value
   * @return {String}
   */
  public getFormattedValueForBytes (bytes: string) : string {
    let val:number = this.getValueForBytes(bytes);

    if (this.opts.unit) {
      return format('%s%s', val, this.opts.unit);
    } else {
      return val.toString();
    }
  }


  /**
   * Generates the code that should be written to the ECU for querying this PID
   * Example is "010C" (CURRENT_DATA + "OC") for the engine RPM
   *
   * @return {String}
   */
  public getWriteString () : string {
    return this.opts.mode + this.opts.pid;
  }


  /**
   * The default conversion function for each PID. It will convert a byte value
   * to a number.
   *
   * Many PIDs will override this since more involved conversions are required
   *
   * @return {Number}
   */
  public getValueForBytes (bytes: string) : number {
    return conversions.parseHexToDecimal(
      this.getByteGroupings(bytes)[1]
    );
  }


  /**
   * Given an input string of bytes, this will return them as pairs
   * e.g AE01CD => ['AE', '01', 'CD']
   */
  private getByteGroupings (str: string) : Array<string> {
    let byteGroups:Array<string> = [];

    for (let i = 0; i < str.length; i+=2) {
      byteGroups.push(
        str.slice(i, i+2)
      );
    }

    return byteGroups;
  }
}

export class FuelLevel extends PID {
  constructor () {
    super({
      mode: OBD_MESSAGE_TYPES.CURRENT_DATA,
      pid: '2F',
      bytes: 1,
      name: 'Fuel Level Input',
      min: 0,
      max: 100,
      unit: '%'
    })
  }

  public getValueForBytes (byte: string) {
    return conversions.percentage(byte);
  }
}

export class Rpm extends PID {
  constructor () {
    super({
      mode: OBD_MESSAGE_TYPES.CURRENT_DATA,
      pid: '0C',
      bytes: 2,
      name: 'Engine RPM',
      min: 0,
      max: 16383.75,
      unit: 'rpm'
    })
  }

  // public getValueForBytes (byteA: string, byteB: string) {
  //   return conversions.rpm(byteA, byteB);
  // }
}

export class VehicleSpeed extends PID {
  constructor () {
    super({
      mode: OBD_MESSAGE_TYPES.CURRENT_DATA,
      pid: '05',
      bytes: 1,
      name: 'Engine Coolant Temperature',
      min: -40,
      max: 215,
      unit: '°C'
    })
  }

  public getValueForBytes (byte: string) {
    return conversions.parseHexToDecimal(byte);
  }
}

export class CoolantTemp extends PID {
  constructor () {
    super({
      mode: OBD_MESSAGE_TYPES.CURRENT_DATA,
      pid: '0D',
      bytes: 1,
      name: 'Vehicle Speed',
      min: 0,
      max: 255,
      unit: 'km/h'
    })
  }

  public getValueForBytes (byte: string) {
    return conversions.coolantTemp(byte);
  }
}
