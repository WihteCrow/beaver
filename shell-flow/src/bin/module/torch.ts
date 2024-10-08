import { ShellFlow } from '@beaver/shell-flow';
import { BinModule } from './bin-module';

export class Torch extends BinModule {
  override readonly dependencies: string[] = ['conda'];

  constructor(ctx: ShellFlow) {
    super('torch', ctx);
  }

  override async install(): Promise<void> {
    const { options } = this._ctx;
    const {
      systemInfo: { platform, GPUs },
    } = this._ctx;
    let cmd;

    switch (platform) {
      case 'darwin':
        cmd = 'pip3 install torch torchvision torchaudio';
        break;
      case 'win32':
        if (GPUs?.includes('nvidia')) {
          cmd =
            'pip3 install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118';
        } else if (
          GPUs?.includes('amd') ||
          GPUs?.includes('advanced micro devices')
        ) {
          cmd = 'pip3 install torch torchvision torchaudio';
        } else {
          cmd = 'pip3 install torch torchvision torchaudio';
        }
        break;
      case 'linux':
        if (GPUs?.includes('nvidia')) {
          cmd =
            'pip3 install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118';
        } else if (
          GPUs?.includes('amd') ||
          GPUs?.includes('advanced micro devices')
        ) {
          cmd =
            'pip3 install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/rocm5.4.2';
        } else {
          cmd =
            'pip3 install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu';
        }
        break;
    }
    await this.run(
      options?.mirror
        ? `${cmd} -i https://pypi.mirrors.ustc.edu.cn/simple/`
        : cmd,
    );
  }

  override async installed(): Promise<boolean> {
    const { bin } = this._ctx;
    if (this.isInstalled) {
      return this.isInstalled;
    }
    if (bin.hasModule('conda')) {
      this.isInstalled = !!bin.getModule('conda')?.exists?.('torch*');
    }

    return this.isInstalled;
  }

  override async uninstall(): Promise<void> {
    await this.run('pip3 uninstall torch torchvision torchaudio');
  }
}
