
import { PID } from '../pids/pid';

export interface PollerArgs {
  pid: PID,
  interval: number
}
