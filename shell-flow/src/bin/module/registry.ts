import { isWin32 } from '@beaver/arteffix-utils';
import { ShellFlow } from '@beaver/shell-flow';
import { BinModule } from './bin-module';

export class Registry extends BinModule {
  readonly description =
    'Look for a dialog requesting admin permission and approve it to proceed. This will allow long paths on your machine, which is required for installing certain python packages.';

  constructor(ctx: ShellFlow) {
    super('registry', ctx);
  }

  override async installed() {
    if (!isWin32) {
      return false;
    }

    // 该命令的作用是查询注册表路径 HKLM\SYSTEM\CurrentControlSet\Control\FileSystem 下名为 LongPathsEnabled 的值。
    // 这项设置与 Windows 文件系统是否支持超过 260 个字符的长路径有关。
    let result = await this.shell.run({
      message:
        'reg query HKLM\\SYSTEM\\CurrentControlSet\\Control\\FileSystem /v LongPathsEnabled',
    });
    let matches = /(LongPathsEnabled.+)[\r\n]+/.exec(result);

    if (!(matches && matches.length > 0)) {
      return false;
    }

    let chunks = matches[1].split(/\s+/);

    if (chunks.length === 3) {
      return Number(chunks[2]) === 1;
    }

    return false;
  }
  override async install() {
    // 1. Set registry to allow long paths
    await this.shell.run(
      {
        message:
          'reg add HKLM\\SYSTEM\\CurrentControlSet\\Control\\FileSystem /v LongPathsEnabled /t REG_DWORD /d 1 /f',
      },
      {
        sudo: true,
      },
    );
  }

  override async uninstall() {
    await this.shell.run(
      {
        message:
          'reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\FileSystem" /v LongPathsEnabled /t REG_DWORD /d 0 /f',
      },
      {
        sudo: true,
      },
    );
  }
}
