import { ShellFlow } from '../../src';
import { Python } from '../../src/bin/module/python';

jest.setTimeout(1000000);

describe('python 测试', () => {
  const shellFlow = new ShellFlow('Beaver', {
    isMirror: true,
    homeDir: '/Users/taibai/Documents/我的智流.shell',
  });
  const python = new Python(shellFlow);

  it('python 安装', async () => {
    await python.install();
  });

  it('python 是否安装', async () => {
    console.log(python.installed());
  });

  it('python 卸载', async () => {
    await python.uninstall();
  });
});
