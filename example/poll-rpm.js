var getObdConnector = require('obd-parser-serial-connection');
var parser = require('../lib/obd-interface');
var pids = parser.pids;
var pollers = parser.pollers;

// Intialise our module and pass a configured connection function
parser.init({
  connectorFn: getObdConnector({
    serialPath: '/dev/tty.usbserial',
    serialOpts: {
      baudrate: 38400
    }
  })
})
  .then(function () {
    // Poll for engine rpm three times per second
    var rpmPoller = pollers.getPoller({
    constname: 'ENGINE_RPM',
    refreshRate: 1
    });

    rpmPoller.on('data', function onPollerData (data) {
      // Log the data Object returned by the poller
      console.log('data, %j', data)
      console.log(data.value)      // The converted value e.g 4000
      console.log(data.pretty)     // The prettified value e.g 4000rpm
      console.log(data.byteString) // The bytes the ECU sent us e.g 410C1B56
    });

    rpmPoller.startPollLoop();
  });
