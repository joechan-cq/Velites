import React from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { yaml } from '@codemirror/lang-yaml';
import { linter, lintGutter } from '@codemirror/lint';
import yamlParser from 'js-yaml';

// 创建YAML语法校验器
const yamlLinter = () => {
  return linter(view => {
    const diagnostics = [];
    const text = view.state.doc.toString();
    
    try {
      yamlParser.load(text);
    } catch (error) {
      // 解析错误信息
      let line = error.mark?.line || 0;
      let column = error.mark?.column || 0;
      
      // js-yaml的行号是从0开始的
      line += 1;
      column += 1;
      
      diagnostics.push({
        from: view.state.doc.line(line).from + column - 1,
        to: view.state.doc.line(line).from + column,
        message: error.message,
        severity: 'error'
      });
    }
    
    return diagnostics;
  });
};

const CODE_EXAMPLE = `# 在此输入YAML测试脚本
name: "示例测试"
description: "这是一个测试脚本示例"
steps:
  - launch_app:
      app_id: "com.example.app"
  - wait:
      duration: 3000
  - click:
      pos: [200,300]`;

const CodeEditor = ({ value, onChange, height = '600px' }) => {
  return (
    <CodeMirror
      value={value}
      height={height}
      extensions={[
        yaml(),
        lintGutter(),
        yamlLinter()
      ]}
      onChange={(value) => onChange(value)}
      theme={'light'}
      basicSetup={{
        lineNumbers: true,
        highlightActiveLine: true,
        highlightSelectionMatches: true,
        indentOnInput: true,
        syntaxHighlighting: true
      }}
    />
  );
};

export { CODE_EXAMPLE, CodeEditor };