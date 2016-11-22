/// <reference types="node" />
import { Transform } from 'stream';
export declare class OBDStreamParser extends Transform {
    private _buffer;
    constructor();
    _flush(done: Function): void;
    _transform(input: Buffer, encoding: String, done: Function): void;
}
export declare function getParser(): OBDStreamParser;
