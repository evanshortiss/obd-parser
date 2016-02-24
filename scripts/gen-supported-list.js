'use strict';

var fs = require('fs')
  , path = require('path');

fs.readdirSync(path.join(__dirname, '../lib/pids/pids'))
  .forEach(function (fname) {
    var mod = require(path.join(__dirname, '../lib/pids/pids/', fname));
    console.log('* %s (%s)', mod.opts.constname, mod.opts.pid);
  })
