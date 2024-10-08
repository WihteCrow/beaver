import { isWin32 } from '@beaver/arteffix-utils';
import { ShellConda } from '@beaver/shell-conda';
import { ShellFlow } from '@beaver/shell-flow';
import { BinModule } from './bin-module';

export class Aria2 extends BinModule {
  static DOWNLOAD_URL =
    'https://github.com/aria2/aria2/releases/download/release-1.36.0/aria2-1.36.0-win-64bit-build1.zip';

  override readonly dependencies: string[] = ['zip'];

  constructor(ctx: ShellFlow) {
    super('aria2', ctx);
  }

  override async install(): Promise<void> {
    const { bin } = this._ctx;
    if (isWin32) {
      const dest = 'aria2-1.36.0-win-64bit-build1.zip';
      await bin.download(Aria2.DOWNLOAD_URL, dest);
      await this.run(`7z x ${dest} -o aria2`);
    } else {
      await this.run(`conda install -y -c conda-forge aria2`);
    }
  }

  override async installed(): Promise<boolean> {
    const { bin } = this._ctx;

    if (this.isInstalled) {
      return true;
    }

    if (isWin32) {
      this.isInstalled = bin.exists('aria2');
    } else {
      this.isInstalled = await bin.checkIsInstalled('aria2', 'brew');
    }

    return this.isInstalled;
  }

  override async uninstall(): Promise<void> {
    if (isWin32) {
      const { bin } = this._ctx;
      await bin.rm('aria2');
    }
    const shellConda = new ShellConda({
      home: this._ctx.homeDir,
      run: `brew remove aria2`,
    });
    await shellConda.run();
  }
}
