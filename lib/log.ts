
import * as pino from 'pino';

export function getLogger (name: string) {
  return pino({
    name: name,
    level: 'trace'
  });
};
