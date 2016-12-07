
import * as debug from 'debug';

let logger:debug.IDebugger = debug(require('../package.json').name);

export = logger;
