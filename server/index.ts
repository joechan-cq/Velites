import { parseYamlScript, ScriptExecutionResult } from './parser';
import { ScriptExecutor } from './executor';
import * as WebdriverIO from 'webdriverio';
import { vError } from './log/logger';

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
  try {
    return await executor.execute();
  } catch (e) {
    vError(e instanceof Error ? e.message : 'Unknown error');
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Unknown error'
    };
  }
}

// 导出所有模块
export * from './parser';
export * from './executor';
export * from './command';