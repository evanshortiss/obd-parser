
// In your code this should be changed to 'obd-parser'
import * as OBD from '../lib/obd-interface';

// Use a serial connection to connect
var getConnector = require('obd-parser-serial-connection');

// Returns a function that will allow us to connect to the serial port
var connect:Function = getConnector({
  // This might vary based on OS - this is the Mac OSX example
  serialPath: '/dev/tty.usbserial',

  // Might vary based on vehicle. This is the baudrate for a MK6 VW GTI
  serialOpts: {
    baudrate: 38400
  }
});

// Need to initialise the OBD module with a "connector" before starting
OBD.init(connect)
  .then(function () {
    // We've successfully connected. Can now create ECUPoller instances
    const rpmPoller:OBD.ECUPoller = new OBD.ECUPoller({
      // Pass an instance of the RPM PID to poll for RPM
      pid: new OBD.PIDS.Rpm(),
      // Poll every 1500 milliseconds
      interval: 1500
    });

    const speedPoller:OBD.ECUPoller = new OBD.ECUPoller({
      pid: new OBD.PIDS.VehicleSpeed(),
      interval: 1000
    });

    // Bind an event handler for anytime RPM data is available
    rpmPoller.on('data', function (output: OBD.OBDOutput) {
      console.log('\n==== Got RPM Output ====');
      // Timestamp (Date object) for wheb the response was received
      console.log('time: ', output.ts);
      // The bytes returned from the ECU when asked from RPM
      console.log('bytes: ', output.bytes);
      // A value that's usuall numeric e.g 1200
      console.log('value: ', output.value);
      // This will be a value such as "1200rpm"
      console.log('pretty: ', output.pretty);
    });

    // Start polling (every 1500ms as specified above)
    rpmPoller.startPolling();

    // Do a one time poll for speed
    speedPoller.poll()
      .then(function (output:OBD.OBDOutput) {
        console.log('\n==== Got Speed Output ====');
        console.log('time: ', output.ts);
        console.log('bytes: ', output.bytes);
        console.log('value: ', output.value);
        console.log('pretty: ', output.pretty);
      })
      .catch(function (err) {
        console.error('failed to poll the ECU', err);
      });
  });
