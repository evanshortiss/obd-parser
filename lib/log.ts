
import * as debug from 'debug';

const pkg = require('../package.json');
const defaultLogger = debug(pkg.name);

export default function (name?: string) {
  if (name) {
    const log = debug(`${pkg.name} (${name})`);
    log('ok')
    return function (formatter: any, ...argsarr: any[]) {
      const args = Array.prototype.slice.call(arguments);

      args[0] = `${new Date().toISOString()} - ${args[0]}`;

      log.apply(log, args);
    };
  } else {
    const log = debug(`${pkg.name}`);
    return function (formatter: any, ...argsarr: any[]) {
      const args = Array.prototype.slice.call(arguments);

      args[0] = `${new Date().toISOString()} - ${args[0]}`;

      log.apply(log, args);
    };
  }
};
