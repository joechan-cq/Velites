import express from 'express';
import cors from 'cors';
import { exec } from 'child_process';
import { spawn } from 'child_process';
import util from 'util';
import { remote } from 'webdriverio';
import path from 'path';
import { fileURLToPath } from 'url';
import process from 'process';

// 获取当前文件路径信息（ES模块兼容方式）
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 存储Appium进程实例
let appiumProcess = null;
const appiumServerPort = 4723;

// 检查Appium服务器是否运行（合并了原有两个函数的功能）
async function checkAppiumHealth() {
  try {
    const http = await import('http');
    return new Promise((resolve) => {
      const req = http.request({
        hostname: 'localhost',
        port: appiumServerPort,
        path: '/status',
        method: 'GET',
        timeout: 2000
      }, (res) => {
        resolve(res.statusCode === 200);
      });

      req.on('error', () => {
        resolve(false);
      });

      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });

      req.end();
    });
  } catch (error) {
    console.error('Error checking Appium health:', error);
    return false;
  }
}

// 启动Appium服务器
async function startAppiumServer() {
  // 先检查是否已经在运行
  const alreadyRunning = await checkAppiumHealth();
  if (alreadyRunning) {
    console.log('Appium server is already running.');
    return Promise.resolve(null); // 返回null表示使用已存在的实例
  }
  
  console.log('Starting Appium server...');
  
  // 获取本地Appium二进制文件路径
  const appiumBinaryPath = path.join(__dirname, 'node_modules', '.bin', 'appium');
  
  return new Promise((resolve, reject) => {
    // 启动Appium进程
    appiumProcess = spawn(appiumBinaryPath, ['--port', `${appiumServerPort}`], {
      stdio: 'inherit',
      shell: true
    });
    
    // 监听Appium进程退出事件
    appiumProcess.on('exit', (code, signal) => {
      console.log(`Appium server exited with code ${code} and signal ${signal}`);
      appiumProcess = null;
      
      // 如果进程正常退出或被手动终止，不做特殊处理
      if (signal === 'SIGTERM' || code === 0) {
        console.log('Appium server stopped normally.');
        return;
      }
      
      // 如果是非正常退出，尝试重新启动
      console.log('Appium server exited unexpectedly. Attempting to restart...');
      setTimeout(() => startAppiumServer(), 5000);
    });
    
    // 监听Appium进程错误事件
    appiumProcess.on('error', (error) => {
      console.error('Appium process error:', error);
      appiumProcess = null;
      reject(error);
    });
    
    // 等待Appium服务器启动完成
    const checkInterval = setInterval(async () => {
      const isRunning = await checkAppiumHealth();
      if (isRunning) {
        clearInterval(checkInterval);
        console.log('Appium server started successfully!');
        resolve(appiumProcess);
      }
    }, 1000);
    
    // 设置超时
    setTimeout(async () => {
      clearInterval(checkInterval);
      if (!await checkAppiumHealth()) {
        console.error('Failed to start Appium server within timeout period.');
        if (appiumProcess) {
          appiumProcess.kill();
          appiumProcess = null;
        }
        reject(new Error('Appium server failed to start'));
      }
    }, 15000);
  });
}

const app = express();
const port = 3001;

// 存储Appium驱动实例
let appiumDrivers = new Map();

// 启用CORS
app.use(cors());

// 解析JSON请求体
app.use(express.json());



// 将exec转换为Promise
const execAsync = util.promisify(exec);

// 解析ADB设备列表
function parseAdbDevices(output) {
  const lines = output.split('\n');
  const devices = [];
  
  for (const line of lines) {
    const match = line.match(/^(\S+)\s+(device|offline|unauthorized)$/);
    if (match) {
      devices.push({
        id: match[1],
        status: match[2]
      });
    }
  }
  
  return devices;
}

// 解析iOS设备列表
function parseIosDevices(output) {
  const lines = output.split('\n');
  const devices = [];
  
  for (const line of lines) {
    const match = line.match(/^(\S+)\s+device$/);
    if (match) {
      devices.push({
        id: match[1],
        status: 'device',
        platform: 'ios'
      });
    }
  }
  
  return devices;
}

// 获取所有设备
app.get('/api/devices', async (req, res) => {
  try {
    let devices = [];
    
    // 检测Android设备（使用ADB）
    try {
      const { stdout: adbOutput } = await execAsync('adb devices');
      const androidDevices = parseAdbDevices(adbOutput);
      devices = devices.concat(androidDevices.map(device => ({
        ...device,
        platform: 'android'
      })));
    } catch (adbError) {
      console.log('ADB not found or error:', adbError.message);
    }
    
    // 检测iOS设备（使用idevice_id）
    try {
      const { stdout: iosOutput } = await execAsync('idevice_id -l');
      const iosDevices = parseIosDevices(iosOutput);
      devices = devices.concat(iosDevices);
    } catch (iosError) {
      console.log('idevice_id not found or error:', iosError.message);
    }
    
    res.json({ devices });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 连接设备
app.post('/api/connect/:deviceId', async (req, res) => {
  const { deviceId } = req.params;
  const { platform } = req.body;
  
  try {
    // 选择相应的Appium服务配置 (Appium 2.x使用根路径，不再需要/wd/hub)
    const appiumConfig = {
      protocol: 'http',
      hostname: 'localhost',
      port: appiumServerPort,
      path: '/', // Appium 2.x默认路径
      capabilities: {
        platformName: platform,
        'appium:deviceName': deviceId,
        'appium:udid': deviceId,
        'appium:automationName': platform === 'android' ? 'UiAutomator2' : 'XCUITest',
        // 可以根据需要添加更多capabilities
        'appium:newCommandTimeout': 60
      }
    };

    // 检查Appium服务器是否运行，如果没有运行则尝试启动
    const isAppiumRunning = await checkAppiumHealth();
    if (!isAppiumRunning) {
      console.log('Appium server is not running, attempting to start it...');
      await startAppiumServer();
      
      // 等待Appium服务器完全启动
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // 创建WebDriver实例
    const driver = await remote(appiumConfig);
    
    // 保存驱动实例
    appiumDrivers.set(deviceId, driver);
    
    res.json({
      success: true,
      message: `Connected to device ${deviceId}`,
      deviceId,
      platform
    });
  } catch (error) {
    console.error('Appium connection error:', error);
    res.status(500).json({ 
      error: error.message,
      details: error.stack 
    });
  }
});

// 断开设备连接
app.post('/api/disconnect/:deviceId', async (req, res) => {
  const { deviceId } = req.params;
  
  try {
    // 获取驱动实例
    const driver = appiumDrivers.get(deviceId);
    
    if (!driver) {
      return res.status(404).json({ 
        error: `Device ${deviceId} is not connected` 
      });
    }
    
    // 断开连接
    await driver.deleteSession();
    
    // 移除驱动实例
    appiumDrivers.delete(deviceId);
    
    res.json({
      success: true,
      message: `Disconnected from device ${deviceId}`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 执行Appium命令
app.post('/api/execute/:deviceId', async (req, res) => {
  const { deviceId } = req.params;
  const { command, params = [] } = req.body;
  
  try {
    // 获取驱动实例
    const driver = appiumDrivers.get(deviceId);
    
    if (!driver) {
      return res.status(404).json({ 
        error: `Device ${deviceId} is not connected` 
      });
    }
    
    // 检查命令是否存在
    if (typeof driver[command] !== 'function') {
      return res.status(400).json({ 
        error: `Command ${command} is not supported` 
      });
    }
    
    // 执行命令
    const result = await driver[command](...params);
    
    res.json({
      success: true,
      result
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 启动服务器
async function startServer() {
  try {
    // 启动Appium服务器
    await startAppiumServer();
    
    // 启动Express服务器
    app.listen(port, () => {
      console.log(`Server running at http://localhost:${port}`);
    });
    
    // 监听进程终止事件，确保Appium进程也被正确终止
    process.on('SIGINT', () => {
      console.log('Shutting down server...');
      if (appiumProcess) {
        console.log('Stopping Appium server...');
        appiumProcess.kill('SIGTERM');
      }
      process.exit(0);
    });
    
  } catch (error) {
    console.error('Error starting server:', error);
    
    // 如果启动失败，确保Appium进程也被终止
    if (appiumProcess) {
      appiumProcess.kill('SIGTERM');
    }
    
    process.exit(1);
  }
}

// 启动服务器
startServer();