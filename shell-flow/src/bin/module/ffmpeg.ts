import { ShellFlow } from '@beaver/shell-flow';
import { BinModule } from './bin-module';

export class Ffmpeg extends BinModule {
  constructor(ctx: ShellFlow) {
    super('ffmpeg', ctx);
  }

  override async install(): Promise<void> {
    await this.run('conda install -y -c conda-forge ffmpeg');
  }

  override async installed(): Promise<boolean> {
    const { bin } = this._ctx;
    if (this.isInstalled) {
      return true;
    }

    this.isInstalled = await bin.checkIsInstalled('ffmpeg', 'conda');
    return this.isInstalled;
  }

  override async uninstall(): Promise<void> {
    await this.run('conda remove -y ffmpeg');
  }
}
