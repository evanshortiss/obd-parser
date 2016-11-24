
import * as bunyan from 'bunyan';

const logger:bunyan.Logger = bunyan.createLogger({
  name: require('../package.json').name,
  level: 'trace'
});

export default logger;
