import * as EventEmitter from 'events';
import { IPublicEvent } from '@beaver/types';
import { consola } from 'consola';
import type { ConsolaInstance } from 'consola/dist/core';

export interface IEventBus extends IPublicEvent {
  removeListener(
    event: string | symbol,
    listener: (...args: any[]) => void,
  ): any;
  addListener(event: string | symbol, listener: (...args: any[]) => void): any;
  setMaxListeners(n: number): any;
  removeAllListeners(event?: string | symbol): any;
}

export class EventBus implements IEventBus {
  private readonly eventEmitter: EventEmitter;
  private readonly name?: string;
  logger: ConsolaInstance;

  /**
   * 内核触发的事件名
   */
  readonly names = [];

  constructor(emitter: EventEmitter, name?: string) {
    this.eventEmitter = emitter;
    this.name = name;
    this.logger = consola.withTag(`event-bus:${name}`);
  }

  private getMsgPrefix(type: string): string {
    if (this.name && this.name.length > 0) {
      return `[${this.name}][event-${type}]`;
    } else {
      return `[*][event-${type}]`;
    }
  }

  /**
   * 监听事件
   * @param event 事件名称
   * @param listener 事件回调
   */
  on(event: string, listener: (...args: any[]) => void): () => void {
    this.eventEmitter.on(event, listener);
    this.logger.debug(`${this.getMsgPrefix('on')} ${event}`);
    return () => {
      this.off(event, listener);
    };
  }

  prependListener(
    event: string,
    listener: (...args: any[]) => void,
  ): () => void {
    this.eventEmitter.prependListener(event, listener);
    this.logger.debug(`${this.getMsgPrefix('prependListener')} ${event}`);
    return () => {
      this.off(event, listener);
    };
  }

  /**
   * 取消监听事件
   * @param event 事件名称
   * @param listener 事件回调
   */
  off(event: string, listener: (...args: any[]) => void) {
    this.eventEmitter.off(event, listener);
    this.logger.debug(`${this.getMsgPrefix('off')} ${event}`);
  }

  /**
   * 触发事件
   * @param event 事件名称
   * @param args 事件参数
   * @returns
   */
  emit(event: string, ...args: any[]) {
    this.eventEmitter.emit(event, ...args);
    this.logger.debug(
      `${this.getMsgPrefix('emit')} name: ${event}, args: `,
      ...args,
    );
  }

  removeListener(
    event: string | symbol,
    listener: (...args: any[]) => void,
  ): any {
    return this.eventEmitter.removeListener(event, listener);
  }

  addListener(event: string | symbol, listener: (...args: any[]) => void): any {
    return this.eventEmitter.addListener(event, listener);
  }

  setMaxListeners(n: number): any {
    return this.eventEmitter.setMaxListeners(n);
  }
  removeAllListeners(event?: string | symbol): any {
    return this.eventEmitter.removeAllListeners(event);
  }
}

export const createModuleEventBus = (
  moduleName: string,
  maxListeners?: number,
): IEventBus => {
  const emitter = new EventEmitter();
  if (maxListeners) {
    emitter.setMaxListeners(maxListeners);
  }
  return new EventBus(emitter, moduleName);
};
