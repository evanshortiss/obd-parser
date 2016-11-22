import { PID } from './pid';
/**
 * Allows us to get a PID instance by matching an output hex code to
 * the code stored in the PID class.
 */
export declare function getPidByPidCode(pidstring: string): PID | null;
/**
 * Returns a list that describes the supported PIDs.
 * List includes the PID code and name.
 */
export declare function getSupportedPidInfo(): any;
