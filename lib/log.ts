
import * as pino from 'pino';

export function getLogger (name: string):pino.Logger {
  return pino({
    name: name,
    level: 'trace'
  });
};
