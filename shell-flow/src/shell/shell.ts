import {
  createModuleEventBus,
  IEventBus,
  isWin32,
  omit,
} from '@beaver/arteffix-utils';
import {
  createLogger,
  IShellMeta,
  IShellRunOptions,
  IShellRunParams,
  IShellTypes,
  ShellFlow,
} from '@beaver/shell-flow';
import { IKey } from '@beaver/types';
import fs from 'fs';
import * as pty from 'node-pty';
import os from 'os';
import path from 'path';
import process from 'process';
import { shellEnvSync } from 'shell-env';
import stripAnsi from 'strip-ansi';
import sudo from 'sudo-prompt';
import { Logger } from 'winston';

type IPty = pty.IPty;

export function shellPathSync() {
  const { PATH } = shellEnvSync();
  return PATH;
}

export class Shell implements IShellTypes {
  static END_FLAG = '__finish__';
  static STATUS = {
    INIT: 0,
    RUNNING: 1,
    STOPPED: 2,
    // 空闲
    IDLE: -1,
    KILLED: -2,
  };
  status: number = Shell.STATUS.INIT;

  private readonly _name: string;

  get name(): string {
    return this._name;
  }
  private readonly _terminal: string;
  private readonly _args: string[];
  private readonly _event_name_data;
  private readonly _event_name_exit;
  private ptyProcess: IPty | undefined;
  private readonly logger: Logger;
  private readonly _ctx: ShellFlow;
  eventBus: IEventBus;
  readonly groupName: string;

  get terminal(): string {
    return this._terminal;
  }

  get args(): string[] {
    return this._args;
  }

  constructor(name: string, groupName: string, ctx: ShellFlow) {
    this._name = name;
    this._ctx = ctx;
    this.groupName = groupName;

    if (isWin32) {
      this._terminal = 'cmd.exe';
      /**
       * 参数解释
       * --NoProfile 不加载用户的配置文件
       */
      this._args = ['-NoProfile'];
    } else {
      this._terminal = '/bin/bash';
      /**
       * 参数解释
       * --noprofile 启动shell时不读取用户的登录shell配置文件（如.bash_profile、.profile等）。
       * --norc 启动shell时不读取.bashrc文件。.bashrc是非登录shell的配置文件，通常包含命令别名、函数定义等。
       */
      this._args = ['--noprofile', '--norc'];
    }

    // 事件名称
    this._event_name_data = `shell:data:${name}`;
    this._event_name_exit = `shell:exit:${name}`;

    this.logger = createLogger(`shell:${name}`);
    this.eventBus = createModuleEventBus(`shell:event:${name}`);

    this.env = Object.assign({}, process.env) as Record<string, string>;

    if (this.env['PYTHONPATH']) {
      delete this.env['PYTHONPATH'];
    }

    if (this.env['CMAKE_MAKE_PROGRAM']) {
      delete this.env['CMAKE_MAKE_PROGRAM'];
    }

    if (this.env['CMAKE_GENERATOR']) {
      delete this.env['CMAKE_GENERATOR'];
    }

    /**
     * 定义 Shell 提示符的外观
     */
    this.env['PS1'] = `<<${name} SHELL>>: `;

    /**
     * 最大路径长度
     */
    this.env['CMAKE_OBJECT_PATH_MAX'] = '1024';

    if (ctx.options?.isMirror) {
      // 环境变量镜像设置
      this.env['PIP_INDEX_URL'] = 'https://pypi.tuna.tsinghua.edu.cn/simple';
      this.env['PIP_EXTRA_INDEX_URL'] =
        'https://mirrors.aliyun.com/pypi/simple';
    }

    /**
     * well known cache
     */
    this.env['HF_HOME'] = path.resolve(ctx.homeDir, 'cache', 'HF_HOME');
    this.env['TORCH_HOME'] = path.resolve(ctx.homeDir, 'cache', 'TORCH_HOME');
    this.env['HOMEBREW_CACHE'] = path.resolve(
      ctx.homeDir,
      'cache',
      'HOMEBREW_CACHE',
    );
    this.env['XDG_CACHE_HOME'] = path.resolve(
      ctx.homeDir,
      'cache',
      'XDG_CACHE_HOME',
    );
    this.env['PIP_CACHE_DIR'] = path.resolve(
      ctx.homeDir,
      'cache',
      'PIP_CACHE_DIR',
    );
    this.env['PIP_TMPDIR'] = path.resolve(ctx.homeDir, 'cache', 'PIP_TMPDIR');
    this.env['TMPDIR'] = path.resolve(ctx.homeDir, 'cache', 'TMPDIR');
    this.env['TEMP'] = path.resolve(ctx.homeDir, 'cache', 'TEMP');
    this.env['TMP'] = path.resolve(ctx.homeDir, 'cache', 'TMP');
    this.env['XDG_DATA_HOME'] = path.resolve(
      ctx.homeDir,
      'cache',
      'XDG_DATA_HOME',
    );
    this.env['XDG_CONFIG_HOME'] = path.resolve(
      ctx.homeDir,
      'cache',
      'XDG_CONFIG_HOME',
    );
    this.env['XDG_STATE_HOME'] = path.resolve(
      ctx.homeDir,
      'cache',
      'XDG_STATE_HOME',
    );
    this.env['GRADIO_TEMP_DIR'] = path.resolve(
      ctx.homeDir,
      'cache',
      'GRADIO_TEMP_DIR',
    );
    this.env['PIP_CONFIG_FILE'] = path.resolve(ctx.homeDir, 'pipconfig');

    this.env['TERM'] = 'vt100';
  }

  env: {
    [key: string]: string;
  };

  envCache: {
    [key: string]: string;
  } = {};

  static exists(absPath: string): boolean {
    try {
      fs.accessSync(absPath, fs.constants.F_OK);
      return true;
    } catch (e) {
      return false;
    }
  }

  private write(message: string): void {
    if (!this.ptyProcess) {
      throw new Error(`${this._name} not initialized`);
    }

    this.ptyProcess.write(message);
  }
  send(
    message: string,
    options: {
      isRun?: boolean;
      isFlag?: boolean;
    },
  ) {
    this.write(message);

    if (options.isRun) {
      if (options.isFlag) {
        if (isWin32) {
          // 在win32系统中，用来判断上一条命令执行结果
          this.write(`& echo ${Shell.END_FLAG}%errorlevel%${Shell.END_FLAG}`);
        } else {
          this.write(`; echo ${Shell.END_FLAG}$?${Shell.END_FLAG}`);
        }
      }

      this.write(os.EOL);
    }
  }
  clear(): void {
    if (isWin32) {
      // For Windows
      this.ptyProcess?.write('\x1Bc');
    } else {
      // For Unix-like systems (Linux, macOS)
      this.ptyProcess?.write('\x1B[2J\x1B[3J\x1B[H');
    }
  }

  pause(): void {
    this.status = Shell.STATUS.STOPPED;
    this.ptyProcess?.pause();
  }

  resume(): void {
    this.status = Shell.STATUS.RUNNING;
    this.ptyProcess?.resume();
  }

  init(options?: IShellRunOptions): void {
    const { bin } = this._ctx;
    const envs = bin.envs(options?.env);
    this.envCache = {
      ...this.env,
      ...this.parseEnv(envs),
    };

    this.ptyProcess = pty.spawn(this._terminal, this.args, {
      name: this.name,
      cols: options?.cols || 100,
      rows: options?.rows || 30,
      cwd: options?.path || options?.cwd || process.cwd(),
      env: this.envCache,
    });

    this.ptyProcess.onData((data) => {
      this.eventBus.emit(this._event_name_data, this._filterOutput(data));
    });

    this.ptyProcess.onExit((result) => {
      this.logger.info(`${this.name} shell exit`);
      this.eventBus.emit(this._event_name_exit, result);
    });

    this.status = Shell.STATUS.IDLE;
  }

  isInit(): boolean {
    return !!this.ptyProcess;
  }

  kill() {
    if (this.ptyProcess) {
      this.ptyProcess.kill();
      this.ptyProcess = undefined;
    }

    this.eventBus.removeAllListeners();

    this.status = Shell.STATUS.KILLED;

    this.logger.info(`${this.name} shell killed`);
  }

  onShellData(func: (data: string) => any) {
    this.eventBus.on(this._event_name_data, func);
    return () => {
      this.eventBus.off(this._event_name_data, func);
    };
  }

  onShellExit(func: (data: string) => any) {
    this.eventBus.on(this._event_name_exit, func);
    return () => {
      this.eventBus.off(this._event_name_exit, func);
    };
  }

  getMeta(): IShellMeta {
    return {
      status: this.status,
      name: this.name,
      groupName: this.groupName,
      terminal: this._terminal,
      args: this.args,
      env: this.env,
    };
  }

  async execute(
    params: IShellRunParams,
    options?: IShellRunOptions,
  ): Promise<void> {
    if (!this.isInit()) {
      this.init(options);
    }

    const { options: ctxOptions } = this._ctx;

    params = await this.activate(params);
    let msg = this.buildCmd(params);

    if (ctxOptions?.isMirror) {
      msg = this._ctx.mirrorUrl(msg);
    }

    this.logger.info(msg);

    this.status = Shell.STATUS.RUNNING;

    this.send(msg, {
      isRun: true,
      isFlag: false,
    });
  }

  // 自定义过滤函数，移除各种类型的控制字符
  _filterOutput(data: string) {
    // 移除 ANSI 控制字符
    let cleanedData = stripAnsi(data);

    // 移除其他类型的控制字符，同时保留换行符
    cleanedData = cleanedData.replace(
      /[\u0000-\u0008\u000B-\u001F\u007F-\u009F]+/g,
      '',
    ); // 控制字符
    cleanedData = cleanedData.replace(/\u001b\[\?25[hl]/g, ''); // 光标隐藏和显示
    cleanedData = cleanedData.replace(/\u001b\[\d+;\d+[Hf]/g, ''); // 光标定位
    cleanedData = cleanedData.replace(/\u001b\[\d*[JK]/g, ''); // 擦除屏幕
    cleanedData = cleanedData.replace(/\u001b\[\d*;?\d*[mG]/g, ''); // SGR参数重置
    cleanedData = cleanedData.replace(/\u001b\]0;.*?\u0007/g, ''); // OSC控制序列
    cleanedData = cleanedData.replace(/\u001b\[\d+;\d+[rm]/g, ''); // 设置模式和重置模式
    cleanedData = cleanedData.replace(/\u001b\[\d*P/g, ''); // DCS序列
    cleanedData = cleanedData.replace(
      /;管理员: C:\\Windows\\SYSTEM32\\cmd.exe.*/s,
      '',
    ); // DCS序列

    return cleanedData;
  }

  async run(
    params: IShellRunParams,
    options?: IShellRunOptions,
  ): Promise<string> {
    if (!this.isInit()) {
      this.logger.info('start init');
      this.init(options);
    }

    const { options: ctxOptions, appName } = this._ctx;

    params = await this.activate(params);
    let msg = this.buildCmd(params);

    if (ctxOptions?.isMirror) {
      msg = this._ctx.mirrorUrl(msg);
    }

    this.logger.info(msg);

    this.status = Shell.STATUS.RUNNING;

    if (options?.sudo) {
      await fs.promises.mkdir(this.env['TEMP']!, { recursive: true });
      return new Promise((resolve, reject) => {
        this.logger.info(`sudo ${msg}`);

        sudo.exec(
          msg,
          {
            name: appName,
            env: omit(this.envCache, 'CommonProgramFiles(x86)'),
          },
          (error, stdout, stderr) => {
            console.log(error, stdout, stderr);
            if (error) {
              this.status = Shell.STATUS.IDLE;
              reject(error);
            } else if (stderr) {
              this.status = Shell.STATUS.IDLE;
              reject(stderr);
            } else {
              this.status = Shell.STATUS.IDLE;
              resolve(stdout as string);
            }
          },
        );
      });
    }

    return new Promise((resolve, reject) => {
      let stream: string = '';
      const off = this.onShellData((data) => {
        stream += data;

        const reg = new RegExp(`${Shell.END_FLAG}(\\d+)${Shell.END_FLAG}`, 'm');

        const match = stream.match(reg); // 假设退出状态是输出的最后一部分

        if (match && match.length > 0) {
          let exitStatus = parseInt(
            match[1].replace(Shell.END_FLAG, '').replace(Shell.END_FLAG, ''),
            10,
          );
          off();

          const result = stream;

          // this.kill();

          if (exitStatus === 0) {
            this.status = Shell.STATUS.IDLE;
            resolve(result);
          } else {
            this.status = Shell.STATUS.IDLE;
            reject(new Error(result));
          }
        }
      });

      this.send(msg, {
        isRun: true,
        isFlag: true,
      });
    });
  }

  private buildCmd(params: IShellRunParams) {
    if (typeof params.message === 'string') {
      return params.message;
    }

    if (Array.isArray(params.message)) {
      let delimiter = ' && ';
      return params.message
        .filter((m) => {
          return m && !/^\s+$/.test(m);
        })
        .join(delimiter);
    }

    return '';
  }

  private async activate(params: IShellRunParams) {
    let condaPath: string | undefined,
      condaName: string | undefined,
      condaPython = 'python=3.10',
      condaArgs: string | undefined;

    if (params?.conda) {
      if (typeof params.conda === 'string') {
        condaPath = params.conda;
      } else if (params.conda.skip) {
        // condaArgs = params.conda.args;
      } else {
        condaArgs = params.conda.args;
        condaPath = params.conda.path;
        condaName = params.conda.name;
        condaPython = params.conda.python || condaPython;
      }
    } else {
      condaName = 'base';
    }

    // 2. condaActivation
    let condaActivation: string[] = [];
    if (condaPath) {
      const envPath = path.resolve(params?.path || '', condaPath);
      const envExists = Shell.exists(envPath);

      if (envExists) {
        condaActivation = [
          isWin32 ? 'conda_hook' : `eval "$(conda shell.bash hook)"`,
          `conda deactivate`,
          `conda deactivate`,
          `conda deactivate`,
          `conda activate ${envPath}`,
        ];
      } else {
        condaActivation = [
          isWin32 ? 'conda_hook' : `eval "$(conda shell.bash hook)"`,
          `conda create -y -p ${envPath} ${condaPython} ${condaArgs ? condaArgs : ''}`,
          `conda deactivate`,
          `conda deactivate`,
          `conda deactivate`,
          `conda activate ${envPath}`,
        ];
      }
    } else if (condaName) {
      if (condaName === 'base') {
        condaActivation = [
          isWin32 ? 'conda_hook' : `eval "$(conda shell.bash hook)"`,
          `conda deactivate`,
          `conda deactivate`,
          `conda deactivate`,
          `conda activate ${condaName}`,
        ];
      } else {
        let envs_path = path.resolve(
          this._ctx.homeDir,
          'bin',
          'miniconda/envs',
        );
        let env_path = path.resolve(envs_path, condaName);
        let env_exists = Shell.exists(env_path);
        if (env_exists) {
          condaActivation = [
            isWin32 ? 'conda_hook' : `eval "$(conda shell.bash hook)"`,
            `conda deactivate`,
            `conda deactivate`,
            `conda deactivate`,
            `conda activate ${condaName}`,
          ];
        } else {
          condaActivation = [
            isWin32 ? 'conda_hook' : `eval "$(conda shell.bash hook)"`,
            `conda create -y -n ${condaName} ${condaPython} ${condaArgs ? condaArgs : ''}`,
            `conda deactivate`,
            `conda deactivate`,
            `conda deactivate`,
            `conda activate ${condaName}`,
          ];
        }
      }
    } else {
      // no conda name or conda path => means don't activate any env
      condaActivation = [];
    }

    this.env['CONDA_AUTO_ACTIVATE_BASE'] = 'false';
    this.env['PYTHONNOUSERSITE'] = '1';

    // 2. venv
    let venvActivation: string[] = [];
    if (params.venv && params.path) {
      let env_path = path.resolve(params.path, params.venv);
      let activate_path = isWin32
        ? path.resolve(env_path, 'Scripts', 'activate')
        : path.resolve(env_path, 'bin', 'activate');
      let env_exists = Shell.exists(env_path);
      if (env_exists) {
        venvActivation = [
          isWin32
            ? `${activate_path} ${env_path}`
            : `source ${activate_path} ${env_path}`,
        ];
      } else {
        venvActivation = [
          `python -m venv ${env_path}`,
          isWin32
            ? `${activate_path} ${env_path}`
            : `source ${activate_path} ${env_path}`,
        ];
      }
    } else {
      venvActivation = [];
    }

    // 3. construct params.message
    params.message = condaActivation
      .concat(venvActivation)
      .concat(params.message);
    return params;
  }

  private parseEnv(env?: IKey<string | string[]>): IKey<string> {
    if (!env) {
      return {};
    }

    let PATH_KEY: string | undefined;
    if (this.env['Path']) {
      PATH_KEY = 'Path';
    } else if (this.env['PATH']) {
      PATH_KEY = 'PATH';
    }

    const result: Record<string, string> = {};

    if (isWin32) {
      // ignore
    } else if (PATH_KEY) {
      result[PATH_KEY] =
        shellPathSync() ||
        [
          './node_modules/.bin',
          '/.nodebrew/current/bin',
          '/usr/local/bin',
          this.env[PATH_KEY],
        ].join(':');
    }

    if (env) {
      for (let envKey in env) {
        const val = env[envKey];

        if (envKey.toLowerCase() === 'path' && PATH_KEY) {
          // "path" is a special case => merge with process.env.PATH
          if (env['path'] && Array.isArray(env['path'])) {
            result[PATH_KEY] =
              `${env['path'].join(path.delimiter)}${path.delimiter}${this.env[PATH_KEY]}`;
          }
          if (env['PATH'] && Array.isArray(env['PATH'])) {
            result[PATH_KEY] =
              `${env['PATH'].join(path.delimiter)}${path.delimiter}${this.env[PATH_KEY]}`;
          }
          if (env['Path'] && Array.isArray(env['Path'])) {
            result[PATH_KEY] =
              `${env['Path'].join(path.delimiter)}${path.delimiter}${this.env[PATH_KEY]}`;
          }
        } else if (Array.isArray(val)) {
          if (env[envKey]) {
            result[envKey] =
              `${val.join(path.delimiter)}${path.delimiter}${env[envKey]}`;
          } else {
            result[envKey] = `${val.join(path.delimiter)}`;
          }
        } else {
          // for the rest of attributes, simply set the values
          result[envKey] = val;
        }
      }
    }

    for (let key in result) {
      if (
        !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key) &&
        key !== 'ProgramFiles(x86)'
      ) {
        delete result[key];
      }
      if (/[\r\n]/.test(result[key])) {
        delete result[key];
      }
    }

    return result;
  }
}
