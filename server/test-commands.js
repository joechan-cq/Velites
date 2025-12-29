import { parseYamlScript } from './yaml-parser.js';

// 测试脚本示例
const testScript = `
name: "测试脚本示例"
description: "这是一个测试脚本，用于验证命令解析功能"
steps:
  - launch_app:
      app_id: "com.example.testapp"
  - wait:
      duration: 2000
  - click:
      pos: [100, 200]
  - scroll:
      from: [200, 500]
      to: [200, 100]
      duration: 1000
  - input:
      xpath: "//*[@id='username']"
      text: "testuser"
`;

// 测试解析功能
console.log('开始测试命令解析功能...');
const result = parseYamlScript(testScript);

if (result.success) {
  console.log('✅ 脚本解析成功！');
  console.log('脚本名称:', result.metadata.scriptName);
  console.log('脚本描述:', result.metadata.description);
  console.log('命令数量:', result.metadata.commandCount);
  console.log('脚本内容:', JSON.stringify(result.script, null, 2));
} else {
  console.error('❌ 脚本解析失败:', result.error);
}

// 测试错误情况
console.log('\n开始测试错误情况...');

// 缺少app_id的launch_app命令
const invalidScript1 = `
name: "错误测试1"
steps:
  - launch_app:
      app_name: "Test App"
`;

// 缺少定位参数的click命令
const invalidScript2 = `
name: "错误测试2"
steps:
  - click:
      area: [0, 0, 100, 100]
`;

// 缺少from参数的scroll命令
const invalidScript3 = `
name: "错误测试3"
steps:
  - scroll:
      to: [200, 100]
`;

// 测试这些错误脚本
const invalidScripts = [
  { name: '缺少app_id的launch_app', script: invalidScript1 },
  { name: '缺少定位参数的click', script: invalidScript2 },
  { name: '缺少from参数的scroll', script: invalidScript3 }
];

for (const { name, script } of invalidScripts) {
  console.log(`\n测试: ${name}`);
  const result = parseYamlScript(script);
  if (!result.success) {
    console.log('✅ 预期的错误:', result.error);
  } else {
    console.error('❌ 预期失败但成功了');
  }
}