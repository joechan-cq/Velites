import { parseYamlScript } from "../parser/yaml-parser";
import { ScriptExecutor } from "../executor/script-executor";
import { MockBrowser } from "./test-utils";

describe("goto命令单元测试", () => {
  let mockDriver: MockBrowser;

  beforeEach(() => {
    mockDriver = new MockBrowser();
  });

  it("正确执行goto跳转", async () => {
    const yamlScript = `
name: "Goto Test Script"
description: "测试Goto跳转"
steps:
  - wait: 
        duration: 100
        on_success:
            action: "goto"
            target: "3"
  - label: "1"
  - wait: { duration: 200 }
  - label: "2"
  - wait: { duration: 200 }
  - label: "3"
  - wait: { duration: 200 }
  - label: "4"
  - wait: { duration: 200 }
`;

    // 解析YAML脚本
    const parseResult = parseYamlScript(yamlScript);

    // 执行脚本
    const executor = new ScriptExecutor(mockDriver as any, parseResult.script!);
    const executionResult = await executor.execute();

    // 验证执行结果
    expect(executionResult.success).toBe(true);
    expect(executionResult.summary?.successfulCommands).toBe(5);
    expect(executionResult.results?.length).toBe(5);
  });

it("异常的goto跳转", async () => {
    const yamlScript = `
name: "Goto Test Script"
description: "测试Goto跳转"
steps:
  - wait: 
        duration: 100
  - label: "1"
  - loop:
        count: 3
        steps:
            - wait: 
                duration: 200
                on_success:
                    action: "goto"
                    target: "1"
  - wait: { duration: 200 }
`;

    // 解析YAML脚本
    const parseResult = parseYamlScript(yamlScript);

    // 执行脚本
    const executor = new ScriptExecutor(mockDriver as any, parseResult.script!);
    const executionResult = await executor.execute();

    // 验证执行结果
    expect(executionResult.success).toBe(false);
    expect(executionResult.error).toContain("LableNotFoundError");
  });
});
