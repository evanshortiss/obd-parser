"use strict";
// In your code this should be changed to 'obd-parser'
var OBD = require('../lib/obd-interface');
// Use a serial connection to connect
var getConnector = require('obd-parser-serial-connection');
// Returns a function that will allow us to connect to the serial port
var connect = getConnector({
    serialPath: '/dev/tty.usbserial',
    serialOpts: {
        baudrate: 38400
    }
});
// Need to initialise the OBD module with a "connector" before starting
OBD.init(connect)
    .then(function () {
    // We've successfully connected. Can now create ECUPoller instances
    var rpmPoller = new OBD.ECUPoller({
        // Pass an instance of the RPM PID to poll for RPM
        pid: new OBD.PIDS.Rpm(),
        // Poll every 1500 milliseconds
        interval: 1500
    });
    // Bind an event handler for anytime RPM data is available
    rpmPoller.on('data', function (output) {
        console.log('==== Got RPM Ouput ====');
        // Timestamp (Date object) for wheb the response was received
        console.log('time: ', output.ts);
        // The bytes returned from the ECU when asked from RPM
        console.log('bytes: ', output.bytes);
        // A value e.g 1200
        console.log('value: ', output.value);
        // This will be a value such as 1200rpm
        console.log('pretty: ', output.pretty);
    });
    // Start polling (every 1500ms as specified above)
    rpmPoller.startPolling();
});
