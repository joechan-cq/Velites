import { Command } from './base';
import * as WebdriverIO from 'webdriverio';

/**
 * 点击命令类
 */
export class ClickCommand extends Command {
  name: string = 'click';
  description: string = '点击指定的元素或位置';
  
  /**
   * Selector定位器
   * @type {string}
   */
  selector?: string;
  
  /**
   * 坐标位置 [x, y]
   * @type {Array<number>}
   */
  pos?: number[];
  
  constructor(params: { xpath?: string, pos?: number[], text?: string, image?: string, area?: number[] }) {
    super(params);
    this.selector = params.selector;
    this.pos = params.pos;
    this.validate();
  }
  
  validate(): void {
    // 检查是否至少有一个定位参数
    const hasSelector = this.selector && typeof this.selector === 'string';
    const hasPos = Array.isArray(this.pos) && this.pos.length === 2 && this.params.pos.every(n => typeof n === 'number');

    if (!hasSelector && !hasPos) {
      throw new Error('click command must have at least one of the following parameters: selector, pos');
    }
  }

  async execute(driver: WebdriverIO.Browser): Promise<any> {
    if (this.selector) {
      return await driver.tap(this.selector);
    } else if (this.pos) {
      // 使用坐标点击
      return await driver.tap({x: this.pos[0], y: this.pos[1]});
    }
    throw new Error('No valid click location specified');
  }
}