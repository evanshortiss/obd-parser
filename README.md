obd-parser
==========

[![Circle CI](https://circleci.com/gh/evanshortiss/obd-parser/tree/master.svg?style=svg)](https://circleci.com/gh/evanshortiss/obd-parser/tree/master)


A module for interacting with the OBD (On Board Diagnostics) of vehicles
via ELM 327 connections.

## Install

Install a module for your preferred connection method and then the _obd-parser_.


#### Serial Connection
This command will install the two modules required to get up and running.

```
npm install obd-parser-serial-connection install obd-parser --save
```


#### Bluetooth Connection

This connector is not implemented yet.


## Usage

```javascript
var getObdConnector = require('obd-parser-serial-connection');
var parser = require('obd-parser');
var pollers = obd.pollers;

// Intialise our module and pass a configured connection function
parser.init({
  connectorFn: getObdConnector({
    serialPath: '/dev/tty.usbserial',
    serialOpts: {
      baudrate: 38400
    }
  })
});


// Poll for engine rpm three times per second
var rpmPoller = pollers.getPoller({
  constname: 'ENGINE_RPM',
  refreshRate: 3
});

rpmPoller.on('data', function onPollerData (data) {
  // Log the data Object returned by the poller
  console.log(data.value)      // The converted value e.g 4000
  console.log(data.pretty)     // The prettified value e.g 4000rpm
  console.log(data.byteString) // The bytes the ECU sent us e.g 410C1B56
});

// Alternatively - add pollers by the PID assuming the module supports that PID.
// Here we request the realtime rpm data
var rpm = pollers.getPollerByPid('010C');
rpm.on('data', onPollerData);

```

## Supported PIDs
Currently the module has support for a limited number of PIDs. PID support can
easily be added by adding a new PID definition in _lib/pids/pids_. You can find
information that will assist PID implementation on
[this Wiki](https://en.wikipedia.org/wiki/OBD-II_PIDs).

For the most up to date list see this
[directory](https://github.com/evanshortiss/obd-reader/tree/master/lib/pids/pids),
or the below list:

* ENGINE_COOLANT_TEMPERATURE (05)
* FUEL_LEVEL_INPUT (2F)
* ENGINE_RPM (0C)
* VEHICLE_SPEED (0D)



## API

### init(opts)
Initialise the parser. _opts_ should be an object containing:

* connectorFn - A function that can be used to communicate with an ECU


### obd.pollers

##### getPollerTypes()
Returns a list of all supported pollers e.g:

```javascript
console.log(require('obd-parser').pollers.getPollerTypes());

// Prints...

[
  {
    "constname": "ENGINE_COOLANT_TEMPERATURE",
    "name": "Engine Coolant Temperature",
    "pid": "05"
  },
  {
    "constname": "FUEL_LEVEL_INPUT",
    "name": "Fuel Level Input",
    "pid": "2F"
  },
  {
    "constname": "ENGINE_RPM",
    "name": "Engine RPM",
    "pid": "0C"
  },
  {
    "constname": "VEHICLE_SPEED",
    "name": "Vehicle Speed",
    "pid": "0D"
  }
]
```

##### getPoller(opts)
Get a poller for a specfic sensor type. Pollers are cached, so successive
calls for the same poller will get the same instance returned.

```javascript
var rpm = require('obd-parser').pollers.getPoller('ENGINE_RPM');

//Callback to trigger when data is received
rpm.on('data', function (data) {
  console.log(data);
});

// Request some data
rpm.poll();
```

##### removePoller(p)
Destroys a poller, e.g:


```javascript

var obd = require('obd-parser');

// obd.init
// etc...

var rpm = obd.pollers.getPoller('ENGINE_RPM');

obd.pollers.removePoller(rpm);
```


### obd.pids
This Object will allow you to interact with the supported PID definitions. Each
supported PID has an Object allocated to it. This Object defines the PID, it's
name, bytes it returns, and the parsing logic for messages associated with that
PID.

##### getBy(key, val)
Get a PID by one of its properties.

##### getSupportedPids()
Returns an Array containing all supported PIDs.

```javascript
var obd = require('obd-parser');
var supportedArray = obd.pids.getSupportedPids();
```

##### getByPid(pid)
Get a PID by its opts.pid value.

##### getByName(name)
Get a PID by its opts.name value.

##### getByConstname(constname)
Get a PID by its opts.constname value.

##### Examples

```javascript
var obd = require('obd-parser');

var rpm = obd.pids.getByConstname('ENGINE_RPM');
var speed = obd.pids.getByName('Vehicle Speed');
var fuelLevel = obd.pids.getByPid('2F');
```


### ECUPoller
An is an Object that can be used to interact with a specific OBD data type.

These are returned by _pollers.getPoller_ as described earlier. You never need
to use this constructor manually.

Each ECUPoller is an _EventEmitter_ and can emit "data" and "error" events.

##### _onEcuData(data)
The internal "data" event handler used by this item. You will not need to call
this directly.

##### _queuePoll(data)
Function used internally to queue a request to the ECU. You can call this if
you want to and it will poll the ECU as soon as the next _refreshInterval_ time
is reached.

##### startPollLoop()
Start a poll loop. This will execute _n_ times per second, where _n_ is the
_refreshRate_ passed in the ECUPoller constructor options.

##### stopPollLoop()
Stops the poll loop.

##### poll()
Issues a poll to the ECU immediately for this poller.
