'use strict';

var fs = require('fs')
  , _ = require('lodash')
  , path = require('path')
  , log = require('fhlog').get('[pids]');

log.i('loading pid files');

// Loads all PIDs and caches them for use
var pids = fs
  .readdirSync(path.join(__dirname, './pids'))
  .map(function requirePid (name) {
    return require(path.join(__dirname, './pids', name));
  });

log.i('successfully loaded pid files');


/**
 * Generic function that can be used to get a PID by one of it's properties
 * @param  {String} key
 * @param  {Mixed}  val
 * @return {PID}
 */
var getBy = exports.getBy = function (key, val) {
  log.d('finding pid by "%s", for value "%s"', key, val);

  return _.find(pids, function (p) {
    return p.opts[key] === val;
  });
};


/**
 * Returns a list that describes the supported PIDs
 * @return {Array}
 */
exports.getSupportedPids = function () {
  return _.map(pids, function (p) {
    return {
      constname: p.opts.constname,
      name: p.opts.name,
      pid: p.opts.pid
    };
  });
};


/**
 * Get a PID by it's ID
 * @type   {Function}
 * @return {PID}
 */
exports.getByPid = getBy.bind(null, 'fullpid');


/**
 * Get a PID by it's name
 * @type   {Function}
 * @return {PID}
 */
exports.getByName = getBy.bind(null, 'name');


/**
 * Get a PID by it's constname
 * @type   {Function}
 * @return {PID}
 */
exports.getByConstname = getBy.bind(null, 'constname');
