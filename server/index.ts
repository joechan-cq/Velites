import { parseYamlScript, YamlScript, ScriptExecutionResult } from './parser';
import { ScriptExecutor } from './executor';

/**
 * 解析并执行YAML脚本
 * @param yamlScript - YAML格式的测试脚本
 * @param driver - Appium驱动实例
 * @returns 执行结果
 */
export async function executeYamlScript(yamlScript: string, driver: WebdriverIO.Browser): Promise<ScriptExecutionResult> {
  // 解析YAML脚本
  const parsedResult = parseYamlScript(yamlScript);

  if (!parsedResult.success || !parsedResult.script) {
    return {
      success: false,
      error: parsedResult.error || 'Failed to parse script'
    };
  }

  // 创建脚本执行器
  const executor = new ScriptExecutor(driver, parsedResult.script);

  // 执行脚本
  return await executor.execute();
}

// 导出所有模块
export * from './parser';
export * from './executor';
export * from './command';