import yaml from 'js-yaml';
import { convertYaml2Cmds, Command } from './cmds';

// 定义YAML脚本的接口
interface YamlScript {
  name?: string;
  description?: string;
  steps: Array<{
    name: string;
    [key: string]: any;
  }>;
}

// 定义解析结果的接口
interface ParsedScriptResult {
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
interface CommandResult {
  step: number;
  command: string;
  params: any;
  success: boolean;
  result?: any;
}

// 定义脚本执行结果的接口
interface ScriptExecutionResult {
  success: boolean;
  results?: CommandResult[];
  summary?: {
    totalCommands: number;
    successfulCommands: number;
    failedCommands: number;
  };
  error?: string;
}

// 定义Appium驱动的接口（简化版）
interface AppiumDriver {
  [key: string]: any;
}

/**
 * 解析YAML脚本为可执行的Appium命令序列
 * @param yamlScript - YAML格式的测试脚本
 * @returns 解析后的脚本对象，包含命令序列和元信息
 */
function parseYamlScript(yamlScript: string): ParsedScriptResult {
  try {
    // 解析YAML脚本为JavaScript对象
    const parsedScript = yaml.load(yamlScript) as YamlScript;
    
    // 验证脚本格式
    if (!parsedScript || typeof parsedScript !== 'object') {
      throw new Error('Invalid script format');
    }
    
    // 使用cmds.ts中的convertYaml2Cmds函数将脚本转换为命令实例数组
    const commandInstances = convertYaml2Cmds(parsedScript);

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
 * 执行解析后的脚本
 * @param parsedScript - 解析后的脚本对象
 * @param driver - Appium驱动实例
 * @returns 执行结果
 */
async function executeParsedScript(
  parsedScript: ParsedScriptResult, 
  driver: AppiumDriver
): Promise<ScriptExecutionResult> {
  if (!parsedScript.success) {
    return parsedScript as ScriptExecutionResult;
  }
  
  const { script, commandInstances } = parsedScript;
  if (!script || !commandInstances) {
    return {
      success: false,
      error: 'Invalid parsed script'
    };
  }

  const results: CommandResult[] = [];
  
  try {
    // 遍历执行所有命令实例
    for (let i = 0; i < commandInstances.length; i++) {
      const command = commandInstances[i];
      const commandName = command.name;
      const commandParams = command.params;
      
      // 记录执行结果
      let result;
      
      // 执行命令
      result = await command.execute(driver);
      
      // 记录执行结果
      results.push({
        step: i + 1,
        command: commandName,
        params: commandParams,
        success: true,
        result
      });
    }
    
    return {
      success: true,
      results,
      summary: {
        totalCommands: results.length,
        successfulCommands: results.length,
        failedCommands: 0
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      results,
      summary: {
        totalCommands: script.steps.length,
        successfulCommands: results.length,
        failedCommands: 1
      }
    };
  }
}

export {
  parseYamlScript,
  executeParsedScript,
  type YamlScript,
  type ParsedScriptResult,
  type CommandResult,
  type ScriptExecutionResult
};