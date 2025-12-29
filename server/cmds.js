/**
 * 命令基础类 - 所有具体命令的父类
 */
class Command {
  /**
   * 命令名称
   * @type {string}
   */
  name = '';
  
  /**
   * 命令描述
   * @type {string}
   */
  description = '';
  
  /**
   * 命令参数
   * @type {Object}
   */
  params = {};
  
  /**
   * 构造函数
   * @param {Object} params - 命令参数
   */
  constructor(params) {
    if (!params || typeof params !== 'object') {
      throw new Error(`${this.name} command must have parameters`);
    }
    this.params = params;
  }
  
  /**
   * 验证命令参数
   * @throws {Error} 如果参数无效
   */
  validate() {
    // 基础验证，子类应重写此方法
  }
  
  /**
   * 执行命令
   * @param {WebdriverIO.Browser} [driver] - Appium驱动实例
   * @returns {Promise<Object>} 执行结果
   */
  async execute() {
    // 基础执行方法，子类应重写此方法
    throw new Error(`${this.name} command must implement execute method`);
  }
}

/**
 * 启动应用命令类
 */
class LaunchAppCommand extends Command {
  name = 'launch_app';
  description = '启动指定的应用';
  
  /**
   * 应用ID
   * @type {string}
   */
  app_id;

  constructor(params) {
    super(params);
    this.app_id = params.app_id;
  }
  
  validate() {
    if (!this.params.app_id || typeof this.params.app_id !== 'string') {
      throw new Error('launch_app command must have a valid app_id parameter');
    }
  }
  
  async execute(driver) {
    return await driver.activateApp(this.params.app_id);
  }
}

/**
 * 等待命令类
 */
class WaitCommand extends Command {
  name = 'wait';
  description = '等待指定的时长';
  
  /**
   * 等待时长（毫秒）
   * @type {number}
   */
  duration;
  
  constructor(params) {
    super(params);
    this.duration = params.duration;
  }
  
  validate() {
    if (typeof this.params.duration !== 'number' || this.params.duration < 0) {
      throw new Error('wait command must have a valid duration parameter (positive number)');
    }
  }
  
  async execute() {
    return await new Promise(resolve => setTimeout(resolve, this.params.duration));
  }
}

/**
 * 点击命令类
 */
class ClickCommand extends Command {
  name = 'click';
  description = '点击指定的元素或位置';
  
  /**
   * XPath定位器
   * @type {string}
   */
  xpath;
  
  /**
   * 坐标位置 [x, y]
   * @type {Array<number>}
   */
  pos;
  
  /**
   * 文本内容
   * @type {string}
   */
  text;
  
  /**
   * 图片路径
   * @type {string}
   */
  image;
  
  /**
   * 点击区域 [left, top, right, bottom]
   * @type {Array<number>}
   */
  area;
  
  constructor(params) {
    super(params);
    this.xpath = params.xpath;
    this.pos = params.pos;
    this.text = params.text;
    this.image = params.image;
    this.area = params.area;
  }
  
  validate() {
    // 检查是否至少有一个定位参数
    const hasXpath = this.params.xpath && typeof this.params.xpath === 'string';
    const hasPos = Array.isArray(this.params.pos) && this.params.pos.length === 2 && this.params.pos.every(n => typeof n === 'number');
    const hasText = this.params.text && typeof this.params.text === 'string';
    const hasImage = this.params.image && typeof this.params.image === 'string';

    if (!hasXpath && !hasPos && !hasText && !hasImage) {
      throw new Error('click command must have at least one of the following parameters: xpath, pos, text, image');
    }

    // 验证area参数（如果提供）
    if (this.params.area) {
      if (!Array.isArray(this.params.area) || this.params.area.length !== 4 || !this.params.area.every(n => typeof n === 'number')) {
        throw new Error('click command area parameter must be an array of 4 numbers [l, t, r, b]');
      }
    }
  }

  async execute(driver) {
    if (this.params.xpath) {
      // 使用xpath定位元素并点击
      const element = await driver.$(this.params.xpath);
      return await element.tap();
    } else if (this.params.pos) {
      // 使用坐标点击
      return await driver.tap({x: this.params.pos[0], y: this.params.pos[1]});
    } else if (this.params.text) {
      // 使用文本定位元素并点击
      // 注意：这个实现可能需要根据实际情况调整
      const element = await driver.$(`android=new UiSelector().text("${this.params.text}")`);
      return await element.tap();
    } else if (this.params.image) {
      //TODO 使用图片定位并点击
      // 注意：图片识别需要额外的Appium插件支持
      throw new Error('Image-based clicking is not yet implemented');
    }
    throw new Error('No valid click location specified');
  }
}

/**
 * 滚动命令类
 */
class ScrollCommand extends Command {
  name = 'scroll';
  description = '执行滚动操作';
  
  /**
   * 滚动起始位置 [x, y]
   * @type {Array<number>}
   */
  from;
  
  /**
   * 滚动结束位置 [x, y]
   * @type {Array<number>}
   */
  to;
  
  /**
   * 滚动时长（毫秒）
   * @type {number}
   */
  duration;

  constructor(params) {
    super(params);
    this.from = params.from;
    this.to = params.to;
    this.duration = params.duration;
  }
  
  validate() {
    // 验证from参数
    if (!Array.isArray(this.params.from) || this.params.from.length !== 2 || !this.params.from.every(n => typeof n === 'number')) {
      throw new Error('scroll command must have a valid from parameter (array of 2 numbers)');
    }

    // 验证to参数
    if (!Array.isArray(this.params.to) || this.params.to.length !== 2 || !this.params.to.every(n => typeof n === 'number')) {
      throw new Error('scroll command must have a valid to parameter (array of 2 numbers)');
    }

    // 验证duration参数（如果提供）
    if (this.params.duration && (typeof this.params.duration !== 'number' || this.params.duration < 0)) {
      throw new Error('scroll command duration parameter must be a positive number');
    }
  }
  
  async execute(driver) {
    return await driver.swipe({
      from: {
        x: this.params.from[0],
        y: this.params.from[1],
      },
      to: {
        x: this.params.to[0],
        y: this.params.to[1],
      },  
      duration: this.params.duration || 250,
    });
  }
}

/**
 * 输入命令类
 */
class InputCommand extends Command {
  name = 'input';
  description = '在指定元素中输入文本';
  
  /**
   * XPath定位器
   * @type {string}
   */
  xpath;
  
  /**
   * 输入文本
   * @type {string}
   */
  text;
  
  constructor(params) {
    super(params);
    this.xpath = params.xpath;
    this.text = params.text;
  }
  
  validate() {
    // 验证xpath参数
    if (!this.params.xpath || typeof this.params.xpath !== 'string') {
      throw new Error('input command must have a valid xpath parameter');
    }
  }
  
  async execute(driver) {
    const element = await driver.$(this.params.xpath);
    return await element.setValue(this.params.text);
  }
}

/**
 * 命令注册表 - 存储所有支持的测试操作
 */
const commands = {
  'launch_app': LaunchAppCommand,
  'wait': WaitCommand,
  'click': ClickCommand,
  'scroll': ScrollCommand,
  'input': InputCommand
};

/**
 * 检查命令是否存在
 * @param {string} commandName - 命令名称
 * @returns {boolean} 如果命令存在返回true，否则返回false
 */
function hasCommand(commandName) {
  return Object.hasOwn(commands, commandName);
}

/**
 * 获取命令定义
 * @param {string} commandName - 命令名称
 * @returns {Class} 命令类
 */
function getCommand(commandName) {
  if (!hasCommand(commandName)) {
    throw new Error(`Command "${commandName}" is not supported`);
  }
  return commands[commandName];
}

/**
 * 创建命令实例
 * @param {string} commandName - 命令名称
 * @param {Object} params - 命令参数
 * @returns {Command} 命令实例
 */
function createCommand(commandName, params) {
  const CommandClass = getCommand(commandName);
  return new CommandClass(params);
}

/**
 * 将YAML脚本转换为命令实例数组
 * @param {Object} root - 解析后的脚本根对象
 * @returns {Array<Command>} 命令实例数组
 * @throws {Error} 如果脚本无效
 */
function convertYaml2Cmds(root) {
  if (!root) {
    throw new Error('Script cannot be empty');
  }
  if (!root.steps || !Array.isArray(root.steps)) {
    throw new Error('Script must contain a "steps" array');
  }
  if (root.steps.length === 0) {
    throw new Error('Script must contain at least one step');
  }

  // 生成命令实例数组
  const commands = [];
  
  // 检查并创建每个步骤的命令实例
  root.steps.forEach((step, index) => {
    const stepKeys = Object.keys(step);
    if (stepKeys.length !== 1) {
      throw new Error(`Step ${index + 1} must contain exactly one command`);
    }

    const commandName = stepKeys[0];
    const commandParams = step[commandName];

    // 尝试创建命令实例，如果参数无效会抛出错误
    try {
      const command = createCommand(commandName, commandParams);
      //校验命令参数
      command.validate();
      commands.push(command);
    } catch (error) {
      throw new Error(`Step ${index + 1} (${commandName}): ${error.message}`);
    }
  });

  return commands;
}

export {
  commands,
  hasCommand,
  getCommand,
  createCommand,
  convertYaml2Cmds
};

// 导出默认模块（为了兼容两种导入方式）
export default commands;