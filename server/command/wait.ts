import { Command } from './base';

/**
 * 等待命令类
 */
export class WaitCommand extends Command {
  name: string = 'wait';
  description: string = '等待指定的时长';
  
  /**
   * 等待时长（毫秒）
   * @type {number}
   */
  duration: number;
  
  constructor(params: { duration: number }) {
    super(params);
    this.duration = params.duration;
    this.validate();
  }
  
  validate(): void {
    if (this.params.duration < 0) {
      throw new Error('wait command must have a valid duration parameter (positive number)');
    }
  }
  
  async execute(): Promise<any> {
    return await new Promise(resolve => setTimeout(resolve, this.duration));
  }
}