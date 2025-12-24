import React from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { yaml } from '@codemirror/lang-yaml';

const CODE_EXAMPLE = `# 在此输入YAML测试脚本
name: "示例测试"
description: "这是一个测试脚本示例"
steps:
  action: "waitForElement"
    element: "xpath=//*[@id='username']"
    timeout: 10
  action: "inputText"
    element: "xpath=//*[@id='username']"
    text: "testuser"
  action: "inputText"
    element: "xpath=//*[@id='password']"
    text: "password123"
  action: "click"
    element: "xpath=//*[@id='login-button']"`;

const CodeEditor = ({ value, onChange, height = '600px' }) => {
  return (
    <CodeMirror
      value={value}
      height={height}
      extensions={[yaml()]}
      onChange={(value) => onChange(value)}
      theme={'none'}
      basicSetup={{
        lineNumbers: true,
        highlightActiveLine: true,
        highlightSelectionMatches: true,
        indentOnInput: true,
        syntaxHighlighting: true,
        autocompletion: true
      }}
    />
  );
};

export { CODE_EXAMPLE, CodeEditor };