import { Command } from "./base";
import * as WebdriverIO from "webdriverio";

// 定义断言执行结果的接口
export interface AssertResult {
  name: string;
  pass: boolean;
  expect?: any;
  actual?: any;
}

export class Assert extends Command {
  name: string = "assert";
  description: string = "断言命令";
  soft: boolean = false;
  isAssert: boolean = true;
  case: string = ""; //断言描述，会体现在结果报告里

  constructor(params: { soft?: boolean; case?: string }) {
    super(params);
    this.soft = params.soft || false;
    this.case = params.case || "";
  }
}

export class AssertVisible extends Assert {
  name: string = "assertVisible";
  description: string = "断言元素可见";

  /**
   * Selector定位器
   * @type {string}
   */
  selector?: string;

  constructor(params: { selector: string }) {
    super(params);
    this.selector = params.selector;
    this.validate();
  }

  validate(): void {
    if (!this.selector) {
      throw new Error("assertVisible command must have a selector parameter");
    }
  }

  async execute(driver: WebdriverIO.Browser): Promise<AssertResult> {
    const element = await driver.$(this.selector);
    const visible = await element.isDisplayed();
    return {
      name: this.case,
      pass: visible,
      expect: true,
      actual: visible,
    };
  }
}

export class AssertTextEquals extends Assert {
  name: string = "assertTextEquals";
  description: string = "断言元素的Text内容是否符合预期";

  /**
   * Selector定位器
   * @type {string}
   */
  selector?: string;

  /**
   * 预期的 Text 的内容
   */
  expect?: string;

  constructor(params: { selector: string; expect: string }) {
    super(params);
    this.selector = params.selector;
    this.expect = params.expect;
    this.validate();
  }

  validate(): void {
    if (!this.selector) {
      throw new Error(
        "assertTextEquals command must have a selector parameter"
      );
    }
  }

  async execute(driver: WebdriverIO.Browser): Promise<AssertResult> {
    const element = await driver.$(this.selector);
    const content = await element.getText();
    return {
      name: this.case,
      pass: content === this.expect,
      expect: this.expect,
      actual: content,
    };
  }
}
