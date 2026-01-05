import { ACTION } from "../command/base";
import {
  YamlScript,
  CommandResult,
  ScriptExecutionResult,
} from "../parser/yaml-parser";
import { createCommand } from "../command/registry";
import * as WebdriverIO from "webdriverio";
import { vError, vInfo, vLog } from "../log/logger";
import {
  FunctionNotFoundError,
  LableNotFoundError,
  BreakException,
  LabelNameEmptyError,
  LabelNameDuplicateError,
} from "./errors";

/**
 * 脚本执行器 - 负责执行解析后的测试脚本
 */
export class ScriptExecutor {
  private driver: WebdriverIO.Browser;
  private script: YamlScript;
  //全局的function定义
  private functions: Record<string, any>;
  //当前正在执行的作用域
  private currentScope: Scope;
  //作用域堆栈
  private scopeStack: Scope[];

  constructor(driver: WebdriverIO.Browser, script: YamlScript) {
    this.driver = driver;
    this.script = script;
    this.functions = {};
    this.scopeStack = [];
    this.currentScope = new Scope("root", this.script);
    this.scopeStack.push(this.currentScope);

    // 解析函数定义，将其存储到functions对象中
    if (script.functions && Array.isArray(script.functions)) {
      script.functions.forEach((funcDef) => {
        if (funcDef.name && funcDef.steps && Array.isArray(funcDef.steps)) {
          this.functions[funcDef.name] = funcDef;
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
      //获取当前作用域的所有Steps
      const curSteps = this.currentScope.getSteps();
      //开始执行当前作用域的Steps
      while (this.currentScope.getCurrentStepIndex() < curSteps.length) {
        const currentStepIndex = this.currentScope.getCurrentStepIndex();
        const step = curSteps[currentStepIndex];
        const stepKey = Object.keys(step)[0];
        const stepParams = step[stepKey];

        try {
          // 执行当前步骤
          const result = await this.executeStep(stepKey, stepParams);
          results.push({
            step: results.length + 1,
            command: stepKey,
            params: stepParams,
            success: true,
            result,
          });

          // 检查是否有成功后操作
          if (stepParams.on_success) {
            vInfo(`Execute ${stepKey} success`);
            const actionResult = await this.handleOnSuccessAction(
              stepParams.on_success
            );
            if (actionResult.skipNext) {
              if (actionResult.isBreak) {
                // break，仅在loop中生效，这里忽视，直接执行下一个step
                this.currentScope.setCurrentStepIndex(currentStepIndex + 1);
              } else if (actionResult.newIndex !== undefined) {
                // 说明执行了goto，且找到了新的index
                this.currentScope.setCurrentStepIndex(actionResult.newIndex);
              } else {
                throw new Error("goto action must specify a new index");
              }
            } else {
              // 没有指定goto，正常执行下一个step
              this.currentScope.setCurrentStepIndex(currentStepIndex + 1);
            }
          } else {
            // 没有指定成功后操作，正常执行下一个step
            this.currentScope.setCurrentStepIndex(currentStepIndex + 1);
          }
        } catch (error) {
          // 记录失败结果
          vError(
            `Execute ${stepKey} failed: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
          results.push({
            step: results.length + 1,
            command: stepKey,
            params: stepParams,
            success: false,
            result: error instanceof Error ? error.message : String(error),
          });

          // 检查是否有失败后操作
          if (stepParams.on_failure) {
            const actionResult = await this.handleOnFailureAction(
              stepParams.on_failure
            );
            if (actionResult.skipNext) {
              if (actionResult.isBreak) {
                // break，仅在loop中生效，这里忽视，直接执行下一个step
                this.currentScope.setCurrentStepIndex(currentStepIndex + 1);
              } else if (actionResult.newIndex !== undefined) {
                // 说明执行了goto，且找到了新的index
                this.currentScope.setCurrentStepIndex(actionResult.newIndex);
              } else {
                throw new Error("goto action must specify a new index");
              }
              continue;
            }
          } else {
            // 如果没有定义失败处理，抛出错误
            throw error;
          }

          // 没有指定失败后操作或不需要跳过下一步，正常执行下一个step
          this.currentScope.setCurrentStepIndex(currentStepIndex + 1);
        }
      }

      return {
        success: true,
        results,
        summary: {
          totalCommands: results.length,
          successfulCommands: results.length,
          failedCommands: 0,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        results,
        summary: {
          totalCommands: this.script.steps.length,
          successfulCommands: results.length,
          failedCommands: 1,
        },
      };
    }
  }

  /**
   * 执行单个步骤
   */
  private async executeStep(commandName: string, params: any): Promise<any> {
    vLog(`Execute ${commandName} with params ${JSON.stringify(params)}`);
    switch (commandName) {
      case "label":
        //如果是label，直接返回即可，不用执行
        return `it's a label[${params}]`;
      case "callfunc":
        //如果是callfunc，则执行函数调用
        return await this.executeCallFunction(params);
      case "loop":
        //如果是loop，则执行循环
        return await this.executeLoop(params);
      default: {
        // 执行普通命令
        const command = createCommand(commandName, params);
        return await command.execute(this.driver);
      }
    }
  }

  /**
   * 执行调用函数命令
   */
  private async executeCallFunction(params: { name: string }): Promise<any> {
    const funcName = params.name;
    const func = this.functions[funcName];

    if (!func) {
      throw new FunctionNotFoundError(funcName);
    }

    // 创建函数作用域
    const funcScope = new Scope(funcName, func);
    // 压入栈
    this.scopeStack.push(funcScope);
    // 设置当前作用域
    this.currentScope = funcScope;

    try {
      // 执行当前作用域内的步骤
      const curSteps = funcScope.getSteps();
      while (funcScope.getCurrentStepIndex() < curSteps.length) {
        const currentStepIndex = funcScope.getCurrentStepIndex();
        const step = curSteps[currentStepIndex];
        const stepKey = Object.keys(step)[0];
        const stepParams = step[stepKey];

        try {
          // 执行函数内的当前步骤
          const result = await this.executeStep(stepKey, stepParams);

          // 检查是否有成功后操作
          if (stepParams.on_success) {
            const actionResult = await this.handleOnSuccessAction(
              stepParams.on_success
            );
            if (actionResult.skipNext) {
              if (actionResult.isBreak) {
                // break，仅在loop中生效，这里忽视，直接执行下一个step
                this.currentScope.setCurrentStepIndex(currentStepIndex + 1);
              } else if (actionResult.isReturn) {
                // return，直接结束当前函数的执行
                return result;
              } else if (actionResult.newIndex !== undefined) {
                // 说明执行了goto，且找到了新的index
                this.currentScope.setCurrentStepIndex(actionResult.newIndex);
              } else {
                throw new Error("goto action must specify a new index");
              }
            } else {
              // 没有指定goto，正常执行下一个step
              this.currentScope.setCurrentStepIndex(currentStepIndex + 1);
            }
          } else {
            funcScope.setCurrentStepIndex(currentStepIndex + 1);
          }
        } catch (error) {
          // 检查是否有失败后操作
          if (stepParams.on_failure) {
            const actionResult = await this.handleOnFailureAction(
              stepParams.on_failure
            );
            if (actionResult.skipNext) {
              if (actionResult.isBreak) {
                // 如果是break，退出函数
                return error;
              }
              funcScope.setCurrentStepIndex(
                actionResult.newIndex || currentStepIndex
              );
              continue;
            }
          } else {
            // 如果没有定义失败处理，抛出错误
            throw error;
          }

          funcScope.setCurrentStepIndex(currentStepIndex + 1);
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
  private async executeLoop(loop: {
    count: number;
    steps: Array<Record<string, any>>;
  }): Promise<any> {
    const loopCount = loop.count;
    if (!loopCount || loopCount <= 0) {
      throw new Error("loop count must be greater than 0");
    }
    const loopSteps = loop.steps;

    // 创建整个loop的作用域
    const loopScope = new Scope("loop", loop);
    this.scopeStack.push(loopScope);
    this.currentScope = loopScope;

    try {
      // 执行指定次数的循环
      for (let i = 0; i < loopCount; i++) {
        // 重置当前循环的步骤索引为0
        this.currentScope.setCurrentStepIndex(0);

        // 执行循环内的步骤
        while (this.currentScope.getCurrentStepIndex() < loopSteps.length) {
          const currentStepIndex = this.currentScope.getCurrentStepIndex();
          const step = loopSteps[currentStepIndex];
          const stepKey = Object.keys(step)[0];
          const stepParams = step[stepKey];

          try {
            const result = await this.executeStep(stepKey, stepParams);

            // 检查是否有成功后操作
            if (stepParams.on_success) {
              const actionResult = await this.handleOnSuccessAction(
                stepParams.on_success
              );
              if (actionResult.skipNext) {
                if (actionResult.isBreak) {
                  // 如果是break，退出循环
                  return result;
                } else if (actionResult.isReturn) {
                  //TODO 如果是return，先当 break 用吧
                  return result;
                } else if (actionResult.newIndex !== undefined) {
                  // 说明执行了goto，且找到了新的index
                  this.currentScope.setCurrentStepIndex(actionResult.newIndex);
                } else {
                  throw new Error("goto action must specify a new index");
                }
              } else {
                this.currentScope.setCurrentStepIndex(currentStepIndex + 1);
              }
            } else {
              this.currentScope.setCurrentStepIndex(currentStepIndex + 1);
            }
          } catch (error) {
            // 检查是否有失败后操作
            if (stepParams.on_failure) {
              const actionResult = await this.handleOnFailureAction(
                stepParams.on_failure
              );
              if (actionResult.skipNext) {
                if (actionResult.isBreak) {
                  // 如果是break，退出循环
                  return error;
                }
                continue; // 跳过索引自增，使用新的索引
              }
            } else {
              // 如果没有定义失败处理，抛出错误
              throw error;
            }

            // 自增步骤索引
            this.currentScope.setCurrentStepIndex(currentStepIndex + 1);
          }
        }
      }
    } finally {
      // 恢复之前的作用域
      this.scopeStack.pop();
      this.currentScope = this.scopeStack[this.scopeStack.length - 1];
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
      throw new LableNotFoundError(targetLabel);
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
  private async handleOnSuccessAction(on_success: {
    action: string;
    target?: string;
  }): Promise<{
    skipNext: boolean;
    newIndex?: number;
    isBreak?: boolean;
    isReturn?: boolean;
  }> {
    if (on_success.action === ACTION.Goto) {
      const targetLabel = on_success.target;
      if (!targetLabel) {
        throw new Error("goto action requires a target label");
      }
      const labelIndex = this.currentScope.findLabel(targetLabel);

      if (labelIndex === -1) {
        throw new LableNotFoundError(targetLabel);
      }

      return {
        skipNext: true,
        newIndex: labelIndex,
      };
    } else if (on_success.action === ACTION.Break) {
      return {
        skipNext: true,
        isBreak: true,
      };
    } else if (on_success.action === ACTION.Return) {
      return {
        skipNext: true,
        isReturn: true,
      };
    }
    return { skipNext: false };
  }

  /**
   * 处理失败后的操作
   */
  private async handleOnFailureAction(on_failure: {
    action: string;
    target?: string;
  }): Promise<{ skipNext: boolean; newIndex?: number; isBreak?: boolean }> {
    if (on_failure.action === ACTION.Goto) {
      const targetLabel = on_failure.target;
      if (!targetLabel) {
        throw new Error("goto action requires a target label");
      }
      const labelIndex = this.currentScope.findLabel(targetLabel);

      if (labelIndex === -1) {
        throw new LableNotFoundError(targetLabel);
      }

      return {
        skipNext: true,
        newIndex: labelIndex,
      };
    } else if (on_failure.action === ACTION.Break) {
      return {
        skipNext: true,
        isBreak: true,
      };
    } else if (on_failure.action === ACTION.Return) {
      return {
        skipNext: true,
        isReturn: true,
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
  private func: any;
  private steps: Array<Record<string, any>>;
  private labels: Record<string, number>;
  private currentStepIndex: number;

  constructor(name: string, func: any) {
    this.name = name;
    this.func = func;
    this.steps = func.steps;
    this.labels = {};
    this.currentStepIndex = 0;

    // 解析标签
    this.parseLabels();
  }

  /**
   * 解析步骤中的label，并记录所在的index
   */
  private parseLabels(): void {
    this.steps.forEach((step, index) => {
      Object.keys(step).forEach((key) => {
        if (key === "label") {
          const labelName = step[key];
          if (!labelName) {
            throw new LabelNameEmptyError();
          }
          if (this.labels[labelName]) {
            throw new LabelNameDuplicateError(labelName);
          }
          this.labels[step[key]] = index;
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
   * 获取作用域中的步骤
   */
  getSteps(): Array<Record<string, any>> {
    return this.steps;
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
}
