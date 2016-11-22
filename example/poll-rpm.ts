
import * as OBD from '../lib/obd-interface';

var getConnector = require('obd-parser-serial-connection');

// Returns a function that will allow us to connect to the serial port
var connect:Function = getConnector({
  serialPath: '/dev/tty.usbserial',
  serialOpts: {
    baudrate: 38400
  }
});

OBD.init(connect)
  .then(function () {
    const poller:OBD.ECUPoller = new OBD.ECUPoller({
      pid: new OBD.PIDS.Rpm(),
      interval: 250
    });

    poller.on('data', function (output: OBD.OBDOutput) {
      console.log('==== Got RPM Ouput ====');
      console.log('time: ', output.ts);
      console.log('bytes: ', output.bytes);
      console.log('value: ', output.value);
      console.log('pretty: ', output.pretty);
    });

    poller.startPolling();
  });
