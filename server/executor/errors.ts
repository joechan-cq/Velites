//这里定义各种执行过程中的错误类型，用于方便捕获后处理

/**
 * 函数未找到Error
 */
export class FunctionNotFoundError extends Error {
  constructor(funcName: string) {
    super(`Function ${funcName} not found`);
    this.name = "FunctionNotFoundError";
  }
}

/**
 * Label未找到Error
 */
export class LableNotFoundError extends Error {
  constructor(labelName: string) {
    super(`Label ${labelName} not found`);
    this.name = "LableNotFoundError";
  }
}

/**
 * 栈溢出Error
 */
export class StackOverflowError extends Error {
  constructor() {
    super("Stack overflow");
    this.name = "StackOverflowError";
  }
}

/**
 * 标签重复Error
 */
export class LabelNameDuplicateError extends Error {
  constructor(labelName: string) {
    super(`Label ${labelName} is duplicated`);
    this.name = "LabelNameDuplicateError";
  }
}

/** 
 * 标签为空Error
 */
export class LabelNameEmptyError extends Error {
  constructor() {
    super("Label name is empty");
    this.name = "LabelNameEmptyError";
  }
}

/**
 * Break异常 - 用于实现break命令
 */
export class BreakException extends Error {
  constructor() {
    super("Break command executed");
    this.name = "BreakException";
  }
}

export function errorOutput(e: any) {
  return e instanceof Error ? (e.name + ": " + e.message) : `${e}`;
}