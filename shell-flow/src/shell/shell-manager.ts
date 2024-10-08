import {
  IShellManagerTypes,
  IShellRunParams,
  IShellTypes,
  ShellFlow,
} from '@beaver/shell-flow';
import { Shell } from './shell';

export class ShellManager implements IShellManagerTypes {
  private readonly _shellMap: Map<string, IShellTypes> = new Map();
  private readonly _groupMap: Map<string, IShellTypes[]> = new Map();
  private readonly _ctx: ShellFlow;
  private readonly _defaultGroupName = 'default';

  constructor(ctx: ShellFlow) {
    this._ctx = ctx;
    this._groupMap.set(this._defaultGroupName, []);
  }

  createShell(
    name: string,
    groupName: string = this._defaultGroupName,
  ): IShellTypes {
    if (this._shellMap.has(name)) {
      throw new Error(`${name} shell had`);
    }

    const shell = new Shell(name, groupName, this._ctx);
    this._shellMap.set(name, shell);

    if (!this._groupMap.has(groupName)) {
      this._groupMap.set(groupName, []);
    }
    this._groupMap.get(groupName)?.push(shell);

    return shell;
  }

  getShell(name: string): IShellTypes | undefined {
    return this._shellMap.get(name);
  }

  getShells(groupName: string = this._defaultGroupName): IShellTypes[] {
    return this._groupMap.get(groupName) || [];
  }

  getMates() {
    const mates = [];
    for (let [key, shell] of this._shellMap) {
      mates.push(shell.getMeta());
    }

    return mates;
  }

  removeAllShell(groupName: string = this._defaultGroupName): void {
    const shells = this._groupMap.get(groupName);
    if (shells) {
      for (const shell of shells) {
        shell.kill();
        this._shellMap.delete(shell.name);
      }
      this._groupMap.set(groupName, []);
    }
  }

  removeShell(name: string): void {
    let shell = this._shellMap.get(name);
    if (shell) {
      shell.kill();
      const shells = this._groupMap.get(shell.groupName) || [];
      const index = shells.indexOf(shell);
      if (index !== -1) {
        shells.splice(index, 1);
      }
      this._shellMap.delete(name);
      shell = undefined;
    }
  }

  async run(name: string, params: IShellRunParams): Promise<string> {
    let shell = this.getShell(name);

    if (!shell) {
      throw new Error(`${name} shell not init`);
    }

    return await shell.run(params);
  }
}
