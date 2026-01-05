// 模拟浏览器类，专注于提供测试所需的方法，不实现完整的WebdriverIO.Browser接口
export class MockBrowser {
  private currentPage: string = 'home';
  private elements: Map<string, boolean> = new Map();
  private actionLog: string[] = [];
  
  constructor() {
    // 初始化一些默认元素
    this.elements.set('button.login', true);
    this.elements.set('button.submit', true);
    this.elements.set('input.username', true);
  }
  
  // 记录操作
  private recordAction(action: string): void {
    this.actionLog.push(action);
    console.log(`[MockDriver] ${action}`);
  }
  
  // 获取所有执行的操作
  public getActions(): string[] {
    return [...this.actionLog];
  }
  
  // 清除操作记录
  public clearActions(): void {
    this.actionLog = [];
  }
  
  // 实现Browser接口的actions方法
  async actions(_actions: any[]): Promise<void> {
    this.recordAction('Execute actions');
  }
  
  // 设置元素是否存在
  public setElementExists(selector: string, exists: boolean): void {
    this.elements.set(selector, exists);
  }
  
  // 模拟 $ 方法
  async $ (selector: any): Promise<any> {
    const selectorStr = typeof selector === 'string' ? selector : JSON.stringify(selector);
    this.recordAction(`Find element: ${selectorStr}`);
    
    const exists = this.elements.get(selectorStr) ?? false;
    const recordAction = this.recordAction.bind(this);
    
    return {
      async click(): Promise<void> {
        if (!exists) {
          throw new Error(`Element not found: ${selectorStr}`);
        }
        recordAction(`Click element: ${selectorStr}`);
      },
      async tap(): Promise<void> {
        if (!exists) {
          throw new Error(`Element not found: ${selectorStr}`);
        }
        recordAction(`Tap element: ${selectorStr}`);
      },
      async waitForDisplayed(options?: any): Promise<boolean> {
        recordAction(`Wait for element displayed: ${selectorStr}`);
        return exists;
      },
      async isDisplayed(): Promise<boolean> {
        recordAction(`Check if element displayed: ${selectorStr}`);
        return exists;
      }
    };
  }
  
  // 模拟 url 方法
  async url(url: string): Promise<void> {
    this.recordAction(`Navigate to: ${url}`);
  }
  
  // 模拟 getTitle 方法
  async getTitle(): Promise<string> {
    this.recordAction('Get page title');
    return 'Mock Page Title';
  }
  
  // 模拟激活应用方法 (用于launch-app.ts)
  async activateApp(appId: string): Promise<void> {
    this.recordAction(`Activate app: ${appId}`);
  }
  
  // 模拟tap方法 (用于click.ts的坐标点击)
  async tap(options?: any): Promise<void> {
    if (options && options.x !== undefined && options.y !== undefined) {
      this.recordAction(`Tap at position: x=${options.x}, y=${options.y}`);
    } else {
      this.recordAction('Tap without position specified');
    }
  }
  
  // 模拟其他可能需要的方法
  async executeAsync(): Promise<any> {
    this.recordAction('Execute async script');
    return null;
  }
  
  async execute(): Promise<any> {
    this.recordAction('Execute script');
    return null;
  }
}

// 测试结果接口
export interface TestResult {
  success: boolean;
  message: string;
  actions?: string[];
}

// 测试辅助函数
export function assertEqual(actual: any, expected: any, message: string): TestResult {
  if (actual === expected) {
    return {
      success: true,
      message: `✓ ${message}`
    };
  } else {
    return {
      success: false,
      message: `✗ ${message}\n  Expected: ${expected}\n  Actual: ${actual}`
    };
  }
}

export function assertActionsContains(actions: string[], expectedAction: string, message: string): TestResult {
  if (actions.some(action => action.includes(expectedAction))) {
    return {
      success: true,
      message: `✓ ${message}`
    };
  } else {
    return {
      success: false,
      message: `✗ ${message}\n  Expected action not found: ${expectedAction}\n  All actions: ${actions.join(', ')}`
    };
  }
}

export function runTests(tests: Array<() => TestResult>): void {
  console.log('\n=== Running Tests ===\n');
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    const result = test();
    console.log(result.message);
    if (result.success) {
      passed++;
    } else {
      failed++;
    }
  }
  
  console.log(`\n=== Test Summary ===\n`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total: ${passed + failed}`);
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed!');
  } else {
    console.log('\n❌ Some tests failed.');
    process.exit(1);
  }
}