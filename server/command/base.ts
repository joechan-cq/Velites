/**
 * 命令基础类 - 所有具体命令的父类
 */
export class Command {
  /**
   * 命令名称
   * @type {string}
   */
  name: string = "";

  /**
   * 命令描述
   * @type {string}
   */
  description: string = "";

  /**
   * 命令参数
   * @type {Object}
   */
  params: Record<string, any> = {};

  /**
   * 构造函数
   * @param {Object} params - 命令参数
   */
  constructor(params: Record<string, any>) {
    if (!params || typeof params !== "object") {
      throw new Error(`${this.name} command must have parameters`);
    }
    this.params = params;
  }

  /**
   * 验证命令参数
   * @throws {Error} 如果参数无效
   */
  validate(): void {
    // 基础验证，子类应重写此方法
  }

  /**
   * 执行命令
   * @param {any} [driver] - Appium驱动实例
   * @returns {Promise<Object>} 执行结果
   */
  async execute(driver?: any): Promise<any> {
    // 基础执行方法，子类应重写此方法
    throw new Error(`${this.name} command must implement execute method`);
  }
}

export enum ACTION {
  Goto = "goto",
  Break = "break",
  Return = "return",
}
