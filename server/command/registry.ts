import { Command } from './base';
import { LaunchAppCommand } from './launch-app';
import { WaitCommand } from './wait';
import { ClickCommand } from './click';
import { AssertVisible, AssertTextEquals } from './asserts';

/**
 * 命令注册表 - 存储所有支持的测试操作
 */
const commands: Record<string, any> = {
  'launch_app': LaunchAppCommand,
  'wait': WaitCommand,
  'click': ClickCommand,
  'assertVisible': AssertVisible,
  'assertTextEquals': AssertTextEquals,
};

/**
 * 检查命令是否存在
 * @param {string} commandName - 命令名称
 * @returns {boolean} 如果命令存在返回true，否则返回false
 */
export function hasCommand(commandName: string): boolean {
  return Object.hasOwn(commands, commandName);
}

/**
 * 获取命令定义
 * @param {string} commandName - 命令名称
 * @returns {Class} 命令类
 */
export function getCommand(commandName: string): any {
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
export function createCommand(commandName: string, params: Record<string, any>): Command {
  const CommandClass = getCommand(commandName);
  return new CommandClass(params);
}

/**
 * 导出所有命令类
 */
export {
  LaunchAppCommand,
  WaitCommand,
  ClickCommand,
  AssertVisible,
  AssertTextEquals,
};