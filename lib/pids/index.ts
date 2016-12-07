'use strict';

import { map, find, keys } from 'ramda';
import { PID } from './pid';
import PIDS = require('../pids');
import { PIDInfo } from '../interfaces';

/**
 * Allows us to get a PID instance by matching an output hex code to
 * the code stored in the PID class.
 */
export function getPidByPidCode (pidstring: string) : PID|null {
  let names:Array<string> = keys(PIDS);

  let pidname:string = find((name:string) => {
    let curpid:PID = PIDS[name];

    return curpid.getPid() === pidstring;
  })(names);

  if (pidname) {
    return PIDS[pidname];
  } else {
    return null;
  }
};


/**
 * Returns a list that describes the supported PIDs.
 * List includes the PID code and name.
 */
export function getSupportedPidInfo () {
  return map((p: PID) => {
    let ret: PIDInfo = {
      name: p.getName(),
      pid: p.getPid()
    };

    return ret;
  })(PIDS);
};
