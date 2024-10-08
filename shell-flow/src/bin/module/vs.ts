import { isWin32 } from '@beaver/arteffix-utils';
import { ShellConda } from '@beaver/shell-conda';
import { ShellFlow } from '@beaver/shell-flow';
import { glob } from 'glob';
import * as path from 'path';
import { BinModule } from './bin-module';

export class Vs extends BinModule {
  static DOWNLOAD_URL =
    'https://github.com/cocktailpeanut/bin/releases/download/vs_buildtools/vs_buildtools.exe';
  static FILTER_NAME = 'vs_buildtools.exe';
  readonly description =
    'Look for a dialog requesting admin permission and approve it to proceed. This will install Microsoft visual studio build tools, which is required for building several python wheels.';
  override readonly dependencies: string[] = ['conda', 'zip'];

  private _env: { [key: string]: string[] | string } = {};

  constructor(ctx: ShellFlow) {
    super('win', ctx);
  }

  private cmd(mode: 'install' | 'uninstall') {
    const { bin } = this._ctx;
    const absPath = bin.absPath(Vs.FILTER_NAME);
    const items = ['Microsoft.VisualStudio.Workload.VCTools'];
    const add = items.map((item) => `--add ${item}`).join(' ');
    return `start /wait ${absPath} ${mode === 'uninstall' ? mode : ''} --passive --wait --includeRecommended --nocache ${add}`;
  }

  private getPaths() {
    const { bin } = this._ctx;
    const ROOT_PATH = (process.env['ProgramFiles(x86)'] ||
      process.env['ProgramFiles'])!;
    const MSVC_2019_PATH = path.resolve(
      ROOT_PATH,
      'Microsoft Visual Studio',
      '2019',
      'BuildTools/VC/Tools/MSVC',
    );
    const MSVC_2022_PATH = path.resolve(
      ROOT_PATH,
      'Microsoft Visual Studio',
      '2022',
      'BuildTools/VC/Tools/MSVC',
    );
    const e1 = bin.exists(MSVC_2019_PATH);
    const e2 = bin.exists(MSVC_2022_PATH);

    let MSVC_PATH;
    if (e1) {
      MSVC_PATH = MSVC_2019_PATH;
    } else if (e2) {
      MSVC_PATH = MSVC_2022_PATH;
    }

    const BUILD_2019_PATH = path.resolve(
      ROOT_PATH,
      'Microsoft Visual Studio',
      '2019',
      'BuildTools/VC/Auxiliary/Build',
    );
    const BUILD_2022_PATH = path.resolve(
      ROOT_PATH,
      'Microsoft Visual Studio',
      '2022',
      'BuildTools/VC/Auxiliary/Build',
    );
    const e3 = bin.exists(BUILD_2019_PATH);
    const e4 = bin.exists(BUILD_2022_PATH);

    let BUILD_PATH;
    if (e3) {
      BUILD_PATH = BUILD_2019_PATH;
    } else if (e4) {
      BUILD_PATH = BUILD_2022_PATH;
    }

    const CMAKE_2019_PATH = path.resolve(
      ROOT_PATH,
      'Microsoft Visual Studio',
      '2019',
      'BuildTools/Common7/IDE/CommonExtensions/Microsoft/CMake/CMake/bin',
    );
    const CMAKE_2022_PATH = path.resolve(
      ROOT_PATH,
      'Microsoft Visual Studio',
      '2022',
      'BuildTools/Common7/IDE/CommonExtensions/Microsoft/CMake/CMake/bin',
    );
    const e5 = bin.exists(CMAKE_2019_PATH);
    const e6 = bin.exists(CMAKE_2022_PATH);
    let CMAKE_PATH;
    if (e5) {
      CMAKE_PATH = CMAKE_2019_PATH;
    } else if (e6) {
      CMAKE_PATH = CMAKE_2022_PATH;
    }

    return {
      ROOT_PATH,
      MSVC_PATH,
      BUILD_PATH,
      CMAKE_PATH,
    };
  }

  override async install(): Promise<void> {
    const { bin, systemInfo } = this._ctx;
    await bin.download(Vs.DOWNLOAD_URL, Vs.FILTER_NAME);

    if (systemInfo.os?.release.startsWith('10')) {
      await new ShellConda({
        home: this._ctx.homeDir,
        run: this.cmd('install'),
        sudo: true,
      }).run();

      await bin.rm(Vs.FILTER_NAME);
    } else {
      this._ctx.errStream.write('Must be Windows 10 or above');
    }
  }

  async init(): Promise<void> {
    if (isWin32) {
      const paths = this.getPaths();
      const env = {
        PATH: ['C:\\Windows\\System32\\WindowsPowerShell\\v1.0'],
      };

      paths.MSVC_PATH && env.PATH.push(paths.MSVC_PATH);
      paths.BUILD_PATH && env.PATH.push(paths.BUILD_PATH);
      paths.CMAKE_PATH && env.PATH.push(paths.CMAKE_PATH);

      if (paths.MSVC_PATH) {
        const clPaths = await glob('**/bin/Hostx64/x64/cl.exe', {
          cwd: paths.MSVC_PATH,
        });

        if (clPaths && clPaths.length > 0) {
          const win_cl_path = path.resolve(
            paths.MSVC_PATH,
            path.dirname(clPaths[0]),
          );
          env.PATH.push(win_cl_path);
        }
      }
      this._env = env;
    }
  }

  override installed(): boolean {
    if (this.isInstalled) {
      return true;
    }
    if (isWin32) {
      const paths = this.getPaths();
      this.isInstalled = !!(
        paths.MSVC_PATH &&
        paths.BUILD_PATH &&
        paths.CMAKE_PATH
      );
    }
    return this.isInstalled;
  }

  override async uninstall(): Promise<void> {
    const { bin } = this._ctx;
    if (isWin32) {
      await new ShellConda({
        home: this._ctx.homeDir,
        run: this.cmd('uninstall'),
        sudo: true,
      }).run();
    }
  }

  env() {
    if (isWin32) {
      return this._env;
    }

    return undefined;
  }
}
