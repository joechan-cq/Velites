import yaml from 'js-yaml';
import { Command } from '../command/base';
import { createCommand } from '../command/registry';

// 定义YAML脚本的接口
export interface YamlScript {
  name?: string;
  description?: string;
  functions?: Array<{
    func: string;
    name: string;
    steps: Array<Record<string, any>>;
  }>;
  steps: Array<Record<string, any>>;
}

// 定义解析结果的接口
export interface ParsedScriptResult {
  success: boolean;
  script?: YamlScript;
  commandInstances?: Command[];
  metadata?: {
    commandCount: number;
    scriptName: string;
    description: string;
  };
  error?: string;
}

// 定义命令执行结果的接口
export interface CommandResult {
  step: number;
  command: string;
  params: any;
  success: boolean;
  result?: any;
}

// 定义脚本执行结果的接口
export interface ScriptExecutionResult {
  success: boolean;
  results?: CommandResult[];
  summary?: {
    totalCommands: number;
    successfulCommands: number;
    failedCommands: number;
  };
  error?: string;
}

/**
 * 解析YAML脚本为可执行的Appium命令序列
 * @param yamlScript - YAML格式的测试脚本
 * @returns 解析后的脚本对象，包含命令序列和元信息
 */
export function parseYamlScript(yamlScript: string): ParsedScriptResult {
  try {
    // 解析YAML脚本为JavaScript对象
    const parsedScript = yaml.load(yamlScript) as YamlScript;
    
    // 验证脚本格式
    if (!parsedScript || typeof parsedScript !== 'object') {
      throw new Error('Invalid script format');
    }

    if (!parsedScript.steps || !Array.isArray(parsedScript.steps)) {
      throw new Error('Script must contain a "steps" array');
    }

    if (parsedScript.steps.length === 0) {
      throw new Error('Script must contain at least one step');
    }

    // 解析函数定义
    const functionsMap: Record<string, Array<Record<string, any>>> = {};
    if (parsedScript.functions && Array.isArray(parsedScript.functions)) {
      parsedScript.functions.forEach(funcDef => {
        if (funcDef.name && funcDef.steps && Array.isArray(funcDef.steps)) {
          functionsMap[funcDef.name] = funcDef.steps;
        }
      });
    }

    // 将脚本转换为命令实例数组
    const commandInstances = convertStepsToCommands(parsedScript.steps);

    console.log('Parsed script:', parsedScript);
    console.log('Command instances:', commandInstances);
    
    return {
      success: true,
      script: parsedScript,
      commandInstances,
      metadata: {
        commandCount: parsedScript.steps.length,
        scriptName: parsedScript.name || 'Unnamed Script',
        description: parsedScript.description || ''
      }
    };
  } catch (error) {
    console.error('Error parsing YAML script:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * 将步骤数组转换为命令实例数组
 * @param steps - 步骤数组
 * @returns 命令实例数组
 */
function convertStepsToCommands(steps: Array<Record<string, any>>): Command[] {
  const commands: Command[] = [];
  
  // 控制流命令列表，这些命令由执行器直接处理，不需要转换为Command实例
  const controlFlowCommands = ['loop', 'callfunc', 'goto', 'break'];
  
  steps.forEach((step, index) => {
    const stepKeys = Object.keys(step);
    if (stepKeys.length !== 1) {
      throw new Error(`Step ${index + 1} must contain exactly one command`);
    }

    const commandName = stepKeys[0];
    const commandParams = step[commandName];

    // 如果是控制流命令，跳过转换，由执行器直接处理
    if (controlFlowCommands.includes(commandName)) {
      // 不需要创建Command实例，执行器会直接处理这些命令
      commands.push({
        name: commandName,
        params: commandParams,
        execute: async () => { /* 控制流命令由执行器处理 */ },
        validate: () => { /* 控制流命令由执行器验证 */ }
      } as any);
    } else {
      // 尝试创建命令实例，如果参数无效会抛出错误
      try {
        const command = createCommand(commandName, commandParams);
        commands.push(command);
      } catch (error) {
        throw new Error(`Step ${index + 1} (${commandName}): ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  });

  return commands;
}