import { PIDArgs } from '../interfaces';
/**
 * Used to create PID instances that will parse OBD data
 * @constructor
 * @param {Object} opts
 */
export declare class PID {
    private constname;
    private fullpid;
    private opts;
    constructor(opts: PIDArgs);
    getName(): string;
    getPid(): string;
    /**
     * Returns the number of bytes that should should be extracted for
     * parsing in a payload of this PID type
     */
    getParseableByteCount(): number;
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
    getFormattedValueForBytes(bytes: string): string;
    /**
     * Generates the code that should be written to the ECU for querying this PID
     * Example is "010C" (CURRENT_DATA + "OC") for the engine RPM
     *
     * @return {String}
     */
    getWriteString(): string;
    /**
     * The default conversion function for each PID. It will convert a byte value
     * to a number.
     *
     * Many PIDs will override this since more involved conversions are required
     *
     * @return {Number}
     */
    getValueForBytes(bytes: string): number;
    /**
     * Given an input string of bytes, this will return them as pairs
     * e.g AE01CD => ['AE', '01', 'CD']
     */
    private getByteGroupings(str);
}
export declare class FuelLevel extends PID {
    constructor();
    getValueForBytes(byte: string): number;
}
export declare class Rpm extends PID {
    constructor();
}
export declare class VehicleSpeed extends PID {
    constructor();
    getValueForBytes(byte: string): number;
}
export declare class CoolantTemp extends PID {
    constructor();
    getValueForBytes(byte: string): number;
}
