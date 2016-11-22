/**
 * Parses a hexadecimal string to regular base 10
 * @param  {String} byte
 * @return {Number}
 */
export declare function parseHexToDecimal(byte: string): number;
/**
 * Converts an OBD value to a percentage
 * @param  {String} byte
 * @return {Number}
 */
export declare function percentage(byte: string): number;
export declare function coolantTemp(byte: string): number;
export declare function rpm(byteA: string, byteB: string): number;
