import { parseYamlScript } from '../parser/yaml-parser';
import { ScriptExecutor } from '../executor/script-executor';
import { MockBrowser } from './test-utils';

describe('Func命令单元测试', () => {
  let mockDriver: MockBrowser;

  beforeEach(() => {
    mockDriver = new MockBrowser();
  });

  it('应该正确解析并执行包含函数的YAML脚本', async () => {

    const yamlScript = `
name: "Function Test Script"
description: "测试函数的定义和调用"

functions:
  - func:
    name: "test_function"
    steps:
      - wait: { duration: 100 }
      - wait: { duration: 200 }

steps:
  - callfunc: { name: "test_function" }
  - wait: { duration: 300 }
`;

    // 解析YAML脚本
    const parseResult = parseYamlScript(yamlScript);
    expect(parseResult.success).toBe(true);
    expect(parseResult.script).toBeDefined();

    // 执行脚本
    const executor = new ScriptExecutor(mockDriver as any, parseResult.script!);
    const executionResult = await executor.execute();

    // 验证执行结果
    expect(executionResult.success).toBe(true);
    expect(executionResult.summary?.totalCommands).toBe(2); // 1个callfunc + 1个wait
    expect(executionResult.results?.length).toBe(2); // 1个callfunc + 1个wait
  });

  it('应该正确处理不存在的函数调用', async () => {
    const yamlScript = `
steps:
  - callfunc: { name: "non_existent_function" }
`;

    // 解析YAML脚本
    const parseResult = parseYamlScript(yamlScript);
    expect(parseResult.success).toBe(true);
    expect(parseResult.script).toBeDefined();

    // 执行脚本
    const executor = new ScriptExecutor(mockDriver as any, parseResult.script!);
    const executionResult = await executor.execute();

    // 验证执行结果
    expect(executionResult.success).toBe(false);
    expect(executionResult.error).toContain('FunctionNotFoundError');
  });

  it('应该支持嵌套函数调用', async () => {
    const yamlScript = `
functions:
  - func:
    name: "inner_func"
    steps:
      - wait: { duration: 100 }
  - func:
    name: "outer_func"
    steps:
      - callfunc: { name: "inner_func" }
      - wait: { duration: 200 }

steps:
  - callfunc: { name: "outer_func" }
`;

    // 解析YAML脚本
    const parseResult = parseYamlScript(yamlScript);
    expect(parseResult.success).toBe(true);
    expect(parseResult.script).toBeDefined();

    // 执行脚本
    const executor = new ScriptExecutor(mockDriver as any, parseResult.script!);
    const executionResult = await executor.execute();

    // 验证执行结果
    expect(executionResult.success).toBe(true);
    expect(executionResult.summary?.totalCommands).toBe(1); // 只有1个callfunc命令的结果
    expect(executionResult.results?.length).toBe(1); // 只有1个callfunc命令的结果
  });
});