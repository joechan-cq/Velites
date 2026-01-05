import { YamlScript, ParsedScriptResult, CommandResult, ScriptExecutionResult } from '../parser/yaml-parser';
import { createCommand } from '../command/registry';

/**
 * 脚本执行器 - 负责执行解析后的测试脚本
 */
export class ScriptExecutor {
  private driver: WebdriverIO.Browser;
  private script: YamlScript;
  private functions: Record<string, Array<Record<string, any>>>;
  private currentScope: Scope;
  private scopeStack: Scope[];

  constructor(driver: WebdriverIO.Browser, script: YamlScript) {
    this.driver = driver;
    this.script = script;
    this.functions = {};
    this.scopeStack = [];
    this.currentScope = new Scope('global', this.script.steps);
    this.scopeStack.push(this.currentScope);

    // 解析函数定义
    if (script.functions && Array.isArray(script.functions)) {
      script.functions.forEach(funcDef => {
        if (funcDef.name && funcDef.steps && Array.isArray(funcDef.steps)) {
          this.functions[funcDef.name] = funcDef.steps;
        }
      });
    }
  }

  /**
   * 执行脚本
   */
  async execute(): Promise<ScriptExecutionResult> {
    const results: CommandResult[] = [];

    try {
      let currentStepIndex = 0;

      while (currentStepIndex < this.currentScope.steps.length) {
        const step = this.currentScope.steps[currentStepIndex];
        const stepKey = Object.keys(step)[0];
        const stepParams = step[stepKey];

        try {
          // 执行当前步骤
          console.log(`Execute ${stepKey} with params ${JSON.stringify(stepParams)}`);
          const result = await this.executeStep(stepKey, stepParams);
          results.push({
            step: results.length + 1,
            command: stepKey,
            params: stepParams,
            success: true,
            result
          });

          // 检查是否有成功后操作
          if (stepParams.on_success) {
            console.info(`Execute ${stepKey} success`);
            const actionResult = await this.handleOnSuccessAction(stepParams.on_success);
            if (actionResult.skipNext) {
              if (actionResult.isBreak) {
                // 如果是break，退出主循环
                return {
                  success: true,
                  results,
                  summary: {
                    totalCommands: results.length,
                    successfulCommands: results.filter(r => r.success).length,
                    failedCommands: results.filter(r => !r.success).length
                  }
                };
              }
              currentStepIndex = actionResult.newIndex || currentStepIndex;
              continue;
            }
          }

          currentStepIndex++;
        } catch (error) {
          // 记录失败结果
          console.warn(`Execute ${stepKey} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
          results.push({
            step: results.length + 1,
            command: stepKey,
            params: stepParams,
            success: false,
            result: error instanceof Error ? error.message : 'Unknown error'
          });

          // 检查是否有失败后操作
          if (stepParams.on_failure) {
            const actionResult = await this.handleOnFailureAction(stepParams.on_failure);
            if (actionResult.skipNext) {
              currentStepIndex = actionResult.newIndex || currentStepIndex;
              continue;
            }
          } else {
            // 如果没有定义失败处理，抛出错误
            throw error;
          }

          currentStepIndex++;
        }
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
          totalCommands: this.script.steps.length,
          successfulCommands: results.length,
          failedCommands: 1
        }
      };
    }
  }

  /**
   * 执行单个步骤
   */
  private async executeStep(commandName: string, params: any): Promise<any> {
    switch (commandName) {
      case 'callfunc':
        return await this.executeCallFunction(params);
      case 'loop':
        return await this.executeLoop(params);
      case 'goto':
        return await this.executeGoto(params);
      case 'break':
        return await this.executeBreak(params);
      default:
        // 执行普通命令
        const command = createCommand(commandName, params);
        return await command.execute(this.driver);
    }
  }

  /**
   * 执行调用函数命令
   */
  private async executeCallFunction(params: { name: string }): Promise<any> {
    const funcName = params.name;
    const funcSteps = this.functions[funcName];

    if (!funcSteps) {
      throw new Error(`Function "${funcName}" not found`);
    }

    // 创建函数作用域
    const funcScope = new Scope(funcName, funcSteps);
    this.scopeStack.push(funcScope);
    this.currentScope = funcScope;

    try {
      // 执行函数内的步骤
      let currentStepIndex = 0;

      while (currentStepIndex < funcScope.steps.length) {
        const step = funcScope.steps[currentStepIndex];
        const stepKey = Object.keys(step)[0];
        const stepParams = step[stepKey];

        try {
          // 执行函数内的当前步骤
          const result = await this.executeStep(stepKey, stepParams);

          // 检查是否有成功后操作
          if (stepParams.on_success) {
            const actionResult = await this.handleOnSuccessAction(stepParams.on_success);
            if (actionResult.skipNext) {
              if (actionResult.isBreak) {
                // 如果是break，退出函数
                return result;
              }
              currentStepIndex = actionResult.newIndex || currentStepIndex;
              continue;
            }
          }

          currentStepIndex++;
        } catch (error) {
          // 检查是否有失败后操作
          if (stepParams.on_failure) {
            const actionResult = await this.handleOnFailureAction(stepParams.on_failure);
            if (actionResult.skipNext) {
              if (actionResult.isBreak) {
                // 如果是break，退出函数
                return error;
              }
              currentStepIndex = actionResult.newIndex || currentStepIndex;
              continue;
            }
          } else {
            // 如果没有定义失败处理，抛出错误
            throw error;
          }

          currentStepIndex++;
        }
      }

      return null;
    } finally {
      // 恢复之前的作用域
      this.scopeStack.pop();
      this.currentScope = this.scopeStack[this.scopeStack.length - 1];
    }
  }

  /**
   * 执行循环命令
   */
  private async executeLoop(params: { count: number, steps: Array<Record<string, any>> }): Promise<any> {
    const loopCount = params.count;
    const loopSteps = params.steps;

    for (let i = 0; i < loopCount; i++) {
      for (const step of loopSteps) {
        const stepKey = Object.keys(step)[0];
        const stepParams = step[stepKey];

        try {
          const result = await this.executeStep(stepKey, stepParams);

          // 检查是否有成功后操作
          if (stepParams.on_success) {
            const actionResult = await this.handleOnSuccessAction(stepParams.on_success);
            if (actionResult.isBreak) {
              // 如果是break，退出循环
              return result;
            }
          }
        } catch (error) {
          // 检查是否有失败后操作
          if (stepParams.on_failure) {
            const actionResult = await this.handleOnFailureAction(stepParams.on_failure);
            if (actionResult.isBreak) {
              // 如果是break，退出循环
              return error;
            }
          } else {
            // 如果没有定义失败处理，抛出错误
            throw error;
          }
        }
      }
    }

    return null;
  }

  /**
   * 执行goto命令
   */
  private async executeGoto(params: { target: string }): Promise<any> {
    const targetLabel = params.target;
    const labelIndex = this.currentScope.findLabel(targetLabel);

    if (labelIndex === -1) {
      throw new Error(`Label "${targetLabel}" not found in current scope`);
    }

    // 设置当前作用域的步骤索引
    this.currentScope.setCurrentStepIndex(labelIndex);
    return null;
  }

  /**
   * 执行break命令
   */
  private async executeBreak(): Promise<any> {
    // 抛出BreakException，由调用者处理
    throw new BreakException();
  }

  /**
   * 处理成功后的操作
   */
  private async handleOnSuccessAction(action: { action: string, target?: string }): Promise<{ skipNext: boolean, newIndex?: number, isBreak?: boolean }> {
    if (action.action === 'goto') {
      const targetLabel = action.target;
      const labelIndex = this.currentScope.findLabel(targetLabel);

      if (labelIndex === -1) {
        throw new Error(`Label "${targetLabel}" not found in current scope`);
      }

      return {
        skipNext: true,
        newIndex: labelIndex
      };
    } else if (action.action === 'break') {
      return {
        skipNext: true,
        isBreak: true
      };
    }

    return { skipNext: false };
  }

  /**
   * 处理失败后的操作
   */
  private async handleOnFailureAction(action: { action: string, target?: string }): Promise<{ skipNext: boolean, newIndex?: number, isBreak?: boolean }> {
    if (action.action === 'goto') {
      const targetLabel = action.target;
      const labelIndex = this.currentScope.findLabel(targetLabel);

      if (labelIndex === -1) {
        throw new Error(`Label "${targetLabel}" not found in current scope`);
      }

      return {
        skipNext: true,
        newIndex: labelIndex
      };
    } else if (action.action === 'break') {
      return {
        skipNext: true,
        isBreak: true
      };
    }

    return { skipNext: false };
  }
}

/**
 * 作用域类 - 用于管理命令执行的作用域
 */
export class Scope {
  private name: string;
  private steps: Array<Record<string, any>>;
  private labels: Record<string, number>;
  private currentStepIndex: number;

  constructor(name: string, steps: Array<Record<string, any>>) {
    this.name = name;
    this.steps = steps;
    this.labels = {};
    this.currentStepIndex = 0;

    // 解析标签
    this.parseLabels();
  }

  /**
   * 解析步骤中的标签
   */
  private parseLabels(): void {
    this.steps.forEach((step, index) => {
      Object.keys(step).forEach(key => {
        if (step[key].label) {
          this.labels[step[key].label] = index;
        }
      });
    });
  }

  /**
   * 查找标签在当前作用域中的位置
   */
  findLabel(label: string): number {
    return this.labels[label] !== undefined ? this.labels[label] : -1;
  }

  /**
   * 设置当前步骤索引
   */
  setCurrentStepIndex(index: number): void {
    this.currentStepIndex = index;
  }

  /**
   * 获取当前步骤索引
   */
  getCurrentStepIndex(): number {
    return this.currentStepIndex;
  }

  /**
   * 获取作用域名称
   */
  getName(): string {
    return this.name;
  }

  /**
   * 获取作用域中的步骤
   */
  getSteps(): Array<Record<string, any>> {
    return this.steps;
  }
}

/**
 * Break异常 - 用于实现break命令
 */
export class BreakException extends Error {
  constructor() {
    super('Break command executed');
    this.name = 'BreakException';
  }
}