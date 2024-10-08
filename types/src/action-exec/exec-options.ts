import { IWirtable } from '../action/';

export interface ExecOptions extends IWirtable {
  /** optional working directory.  defaults to current */
  cwd?: string;

  /** optional envvar dictionary.  defaults to current process's env */
  env?: { [key: string]: string };

  /** optional.  defaults to false */
  silent?: boolean;

  /** optional. whether to skip quoting/escaping arguments if needed.  defaults to false. */
  windowsVerbatimArguments?: boolean;

  /** optional.  whether to fail if output to stderr.  defaults to false */
  failOnStdErr?: boolean;

  /** optional.  defaults to failing on non zero.  ignore will not fail leaving it up to the caller */
  ignoreReturnCode?: boolean;

  /** optional. How long in ms to wait for STDIO streams to close after the exit event of the process before terminating. defaults to 10000 */
  delay?: number;

  /** optional. input to write to the process on STDIN. */
  input?: Buffer;

  /** optional. Listeners for output. Callback functions that will be called on these events */
  listeners?: ExecListeners;
}

/**
 * The user defined listeners for an exec call
 */
export interface ExecListeners {
  /** A call back for each buffer of stdout */
  stdout?: (data: Buffer) => void;

  /** A call back for each buffer of stderr */
  stderr?: (data: Buffer) => void;

  /** A call back for each line of stdout */
  stdline?: (data: string) => void;

  /** A call back for each line of stderr */
  errline?: (data: string) => void;

  /** A call back for each debug log */
  debug?: (data: string) => void;
}
