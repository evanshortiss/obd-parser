'use strict';

import * as R from 'ramda';
import * as c from 'case';
import * as assert from 'assert';
import * as conversions from './conversions';
import { format } from 'util';
import { OBD_MESSAGE_TYPES } from '../constants';
import { PIDArgs } from '../interfaces';


/**
 * Parses a hexadecimal string to regular base 10
 * @param  {String} byte
 * @return {Number}
 */
function parseHexToDecimal (byte: string) {
  return parseInt(byte, 16);
}

function leftpad (input: string, desiredLen: number): string {
  const padding = new Array(desiredLen - input.length + 1);

  return padding.join('0') + input;
}

/**
 * Used to create PID instances that will parse OBD data
 * @constructor
 * @param {Object} opts
 */
export abstract class PID {

  private constname: string;
  private fullpid: string;
  private opts: PIDArgs;

  protected maxRandomValue: number = 255;
  protected minRandomValue: number = 0;

  public constructor (opts: PIDArgs) {
    assert(opts.bytes > 0, 'opts.bytes for PID must be above 0');

    // This can be used to identify this PID
    this.constname = c.constant(opts.name);

    // Save these for use
    this.opts = opts;
  }

  protected getRandomInt (min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  public getRandomBytes (min?: number, max?: number): string[] {
    min = min || this.minRandomValue;
    max = max || this.maxRandomValue;

    // ensure random value is int, then convert to hex
    return [this.getRandomInt(min, max).toString(16)];
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
  public getFormattedValueForBytes (bytes: string[]) : string {
    let val = this.getValueForBytes(bytes);

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
  public getValueForBytes (bytes:string[]) : number|string {
    return conversions.parseHexToDecimal(bytes[1]);
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

  public getValueForBytes (bytes: string[]): number {
    return conversions.percentage(bytes[2]);
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

  public getValueForBytes (bytes: string[]): number {
    const a:number = parseHexToDecimal(bytes[2]) * 256;
    const b:number = parseHexToDecimal(bytes[3]);

    return (a + b) / 4;
  }

  public getRandomBytes (): string[] {
    // ensure random value is int, then convert to hex
    return [
      this.getRandomInt(0, 255).toString(16),
      this.getRandomInt(0, 255).toString(16)
    ];
  }
}

export class CoolantTemp extends PID {
  constructor () {
    super({
      mode: OBD_MESSAGE_TYPES.CURRENT_DATA,
      pid: '05',
      bytes: 1,
      name: 'Engine Coolant Temperature',
      min: -40,
      max: 215,
      unit: '°C'
    });

    this.minRandomValue = 0;
    this.maxRandomValue = 255; // only a litte too fast...
  }

  public getValueForBytes (byte: string[]): number {
    return parseHexToDecimal(byte[2]) - 40;
  }
}

export class VehicleSpeed extends PID {
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

    this.minRandomValue = 0;
    this.maxRandomValue = 255;
  }

  public getValueForBytes (bytes: string[]): number {
    return parseHexToDecimal(bytes[2]);
  }
}

export class CalculatedEngineLoad extends PID {
  constructor () {
    super({
      mode: OBD_MESSAGE_TYPES.CURRENT_DATA,
      pid: '04',
      bytes: 1,
      name: 'Calculated Engine Load',
      min: 0,
      max: 100,
      unit: '%'
    })

    this.minRandomValue = 0;
    this.maxRandomValue = 255;
  }

  public getValueForBytes (bytes: string[]): number {
    return parseHexToDecimal(bytes[2]) / 2.5;
  }
}

export class FuelPressure extends PID {
  constructor () {
    super({
      mode: OBD_MESSAGE_TYPES.CURRENT_DATA,
      pid: '0A',
      bytes: 1,
      name: 'Fuel Pressure',
      min: 0,
      max: 765,
      unit: 'kPa'
    })

    this.minRandomValue = 0;
    this.maxRandomValue = 255;
  }

  public getValueForBytes (bytes: string[]): number {
    return parseHexToDecimal(bytes[2]) * 3;
  }
}

export class IntakeManifoldAbsolutePressure extends PID {
  constructor () {
    super({
      mode: OBD_MESSAGE_TYPES.CURRENT_DATA,
      pid: '0B',
      bytes: 1,
      name: 'Intake Manifold Absolute Pressure',
      min: 0,
      max: 255,
      unit: 'kPa'
    })

    this.minRandomValue = 0;
    this.maxRandomValue = 255;
  }

  public getValueForBytes (bytes: string[]): number {
    return parseHexToDecimal(bytes[2]);
  }
}

export class IntakeAirTemperature extends PID {
  constructor () {
    super({
      mode: OBD_MESSAGE_TYPES.CURRENT_DATA,
      pid: '0F',
      bytes: 1,
      name: 'Intake Air Temperature',
      min: -40,
      max: 215,
      unit: '°C'
    })

    this.minRandomValue = 0;
    this.maxRandomValue = 255;
  }

  public getValueForBytes (bytes: string[]): number {
    return parseHexToDecimal(bytes[2]) - 40;
  }
}

export class MafAirFlowRate extends PID {
  constructor () {
    super({
      mode: OBD_MESSAGE_TYPES.CURRENT_DATA,
      pid: '10',
      bytes: 2,
      name: 'MAF Air Flow Rate',
      min: 0,
      max: 655.35,
      unit: 'grams/sec'
    })

    this.minRandomValue = 0;
    this.maxRandomValue = 255;
  }

  public getRandomBytes (min?: number, max?: number): string[] {
    min = min || this.minRandomValue;
    max = max || this.maxRandomValue;

    // ensure random value is int, then convert to hex
    return [
      this.getRandomInt(min, max).toString(16),
      this.getRandomInt(min, max).toString(16)
    ];
  }

  public getValueForBytes (bytes: string[]): number {
    const a = parseHexToDecimal(bytes[2]);
    const b = parseHexToDecimal(bytes[3]);

    return ((256 * a) + b) / 100;
  }
}

export class ThrottlePosition extends PID {
  constructor () {
    super({
      mode: OBD_MESSAGE_TYPES.CURRENT_DATA,
      pid: '11',
      bytes: 1,
      name: 'Throttle Position',
      min: 0,
      max: 100,
      unit: '%'
    })

    this.minRandomValue = 0;
    this.maxRandomValue = 255;
  }

  public getValueForBytes (bytes: string[]): number {
    return (100 / 255) * parseHexToDecimal(bytes[2]);
  }
}

export class ObdStandard extends PID {
  constructor () {
    super({
      mode: OBD_MESSAGE_TYPES.CURRENT_DATA,
      pid: '1C',
      bytes: 1,
      name: 'OBD Standard',
      min: 0,
      max: 255,
      unit: ''
    })

    this.minRandomValue = 0;
    this.maxRandomValue = 34;
  }

  public getValueForBytes (bytes: string[]): string {
    const type = parseHexToDecimal(bytes[2]);
    const obdStandards:Object = require('./data/obd-spec-list.json');

    return obdStandards[type] || 'Unknown';
  }
}

export class FuelSystemStatus extends PID {
  private types:Object = {
    '1': 'Open loop due to insufficient engine temperature',
    '2': 'Closed loop, using oxygen sensor feedback to determine fuel mix',
    '4': 'Open loop due to engine load OR fuel cut due to deceleration',
    '8': 'Open loop due to system failure',
    '16': 'Closed loop, using at least one oxygen sensor but there is a ' +
      'fault in the feedback system'
  };

  constructor () {
    super({
      mode: OBD_MESSAGE_TYPES.CURRENT_DATA,
      pid: '03',
      bytes: 2,
      name: 'Fuel System Status',
      min: 0,
      max: 16,
      unit: ''
    })

    this.minRandomValue = 0;
    this.maxRandomValue = 10;
  }

  public getRandomBytes (min?: number, max?: number): string[] {
    min = min || this.minRandomValue;
    max = max || this.maxRandomValue;

    // ensure random value is int, then convert to hex
    return [
      this.getRandomInt(min, max).toString(16),
      this.getRandomInt(min, max).toString(16)
    ];
  }

  public getValueForBytes (bytes: string[]): string {
    const typeA = parseHexToDecimal(bytes[2]);
    const typeB = parseHexToDecimal(bytes[3]);

    if (typeB) {
      const a = this.types[typeA] || 'Unknown';
      const b = this.types[typeB] || 'Unknown';
      return `System A: ${a}. System B: ${b}`;
    } else {
      return this.types[typeA.toString()];
    }
  }
}

export class SupportedPids extends PID {
  constructor () {
    super({
      mode: OBD_MESSAGE_TYPES.CURRENT_DATA,
      pid: '20',
      bytes: 4,
      name: 'Supported PIDs',
      unit: ''
    })

    this.minRandomValue = 0;
    this.maxRandomValue = 255;
  }

  public getRandomBytes (min?: number, max?: number): string[] {
    min = min || this.minRandomValue;
    max = max || this.maxRandomValue;

    return [
      this.getRandomInt(min, max).toString(16),
      this.getRandomInt(min, max).toString(16),
      this.getRandomInt(min, max).toString(16),
      this.getRandomInt(min, max).toString(16)
    ];
  }

  public getValueForBytes (bytes: string[]): string {
    // Get all bytes after the initial message identifier byte
    const allBytes = bytes.join('').substr(2);
    const supportedPids:string[] = [];

    for (let i = 0; i<allBytes.length; i++) {
      // e.g ensures '100' becomes '0100'
      const asBinary = leftpad(
        parseHexToDecimal(allBytes[i]).toString(2),
        4
      );

      for (let j = 0; j<asBinary.length; j++) {
        // our offset into the 32 standard pids, e.g if i==2 we start at "09"
        const startIdx = (4 * i) + 1;
        const pid = (startIdx + j).toString(16);

        if (asBinary[j] === '1') {
          // ensure a result such as '8' becomes '08'
          supportedPids.push(
            leftpad(pid, 2)
          );
        }
      }
    }

    return supportedPids.join(',');
  }
}
