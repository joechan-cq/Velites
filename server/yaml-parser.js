import yaml from 'js-yaml';
import { convertYaml2Cmds } from './cmds.js';

/**
 * 解析YAML脚本为可执行的Appium命令序列
 * @param {string} yamlScript - YAML格式的测试脚本
 * @returns {Object} 解析后的脚本对象，包含命令序列和元信息
 */
function parseYamlScript(yamlScript) {
  try {
    // 解析YAML脚本为JavaScript对象
    const parsedScript = yaml.load(yamlScript);
    
    // 验证脚本格式
    if (!parsedScript || typeof parsedScript !== 'object') {
      throw new Error('Invalid script format');
    }
    
    // 使用cmds.js中的convertYaml2Cmds函数将脚本转换为命令实例数组
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
      error: error.message
    };
  }
}

/**
 * 执行解析后的脚本
 * @param {Object} parsedScript - 解析后的脚本对象
 * @param {Object} driver - Appium驱动实例
 * @returns {Promise<Object>} 执行结果
 */
async function executeParsedScript(parsedScript, driver) {
  if (!parsedScript.success) {
    return parsedScript;
  }
  
  const { script, commandInstances } = parsedScript;
  const results = [];
  
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
      error: error.message,
      results: results,
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
  executeParsedScript
};