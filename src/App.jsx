import { useState, useEffect } from 'react'
import axios from 'axios'
import './App.css'
import { CODE_EXAMPLE, CodeEditor } from './components/CodeEditor'

function App() {
  const [devices, setDevices] = useState([])
  const [deviceConnections, setDeviceConnections] = useState({}) // 记录每个设备的连接状态
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [scriptContent, setScriptContent] = useState(`${CODE_EXAMPLE}`)
  const [isExecuting, setIsExecuting] = useState(false) // 执行脚本的状态

  // 获取设备列表
  const fetchDevices = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await axios.get('http://localhost:3001/api/devices')
      setDevices(response.data.devices)
    } catch (err) {
      setError('获取设备列表失败: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // 连接设备
  const connectDevice = async (deviceId, platform) => {
    setLoading(true)
    setError(null)
    try {
      await axios.post(`http://localhost:3001/api/connect/${deviceId}`, { platform })
      // 更新设备连接状态
      setDeviceConnections(prev => ({
        ...prev,
        [deviceId]: true
      }))
    } catch (err) {
      setError('连接设备失败: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // 断开设备连接
  const disconnectDevice = async (deviceId) => {
    setLoading(true)
    setError(null)
    try {
      await axios.post(`http://localhost:3001/api/disconnect/${deviceId}`)
      // 更新设备连接状态
      setDeviceConnections(prev => ({
        ...prev,
        [deviceId]: false
      }))
    } catch (err) {
      // 即使断开失败，也将前端状态更新为断开
      setDeviceConnections(prev => ({
        ...prev,
        [deviceId]: false
      }))
      setError('断开设备失败: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const [executionStatus, setExecutionStatus] = useState(null) // 记录脚本执行状态
  const [showAlert, setShowAlert] = useState(false) // 控制弹窗是否显示

  // 执行脚本
  const executeScript = async () => {
    // 确保至少有一个设备连接
    const hasConnectedDevice = Object.values(deviceConnections).some(status => status === true)
    if (!hasConnectedDevice) {
      setError('请先连接至少一个设备')
      return
    }

    // 确保脚本内容不为空
    if (!scriptContent.trim()) {
      setError('请先编写脚本内容')
      return
    }

    setIsExecuting(true)
    setError(null)
    setExecutionStatus(null)
    
    try {
      // 获取第一个连接的设备ID
      const connectedDeviceId = Object.keys(deviceConnections).find(id => deviceConnections[id] === true)
      
      const response = await axios.post('http://localhost:3001/api/execute-script', {
        script: scriptContent,
        deviceId: connectedDeviceId
      })
      
      setExecutionStatus({
        type: 'success',
        message: '脚本执行成功',
        result: response.data
      })
      
      // 显示弹窗
      setShowAlert(true)
    } catch (err) {
      setError('执行脚本失败: ' + err.message)
      setExecutionStatus({
        type: 'error',
        message: '脚本执行失败',
        error: err.message
      })
      
      // 显示弹窗
      setShowAlert(true)
    } finally {
      setIsExecuting(false)
    }
  }

  // 检查当前连接的设备
  const checkConnectedDevices = async () => {
    try {
      const response = await axios.get('http://localhost:3001/api/connected-devices')
      const connectedDevices = response.data.devices
      
      // 更新设备连接状态
      setDeviceConnections(prev => {
        const newConnections = { ...prev }
        // 首先将所有设备状态设置为false
        Object.keys(newConnections).forEach(deviceId => {
          newConnections[deviceId] = false
        })
        // 然后将服务器返回的连接设备设置为true
        connectedDevices.forEach(deviceId => {
          newConnections[deviceId] = true
        })
        return newConnections
      })
    } catch (err) {
      console.error('检查连接设备失败:', err)
    }
  }

  // 定期检查连接状态
  useEffect(() => {
    // 启动定期检查（每5秒检查一次）
    const interval = setInterval(checkConnectedDevices, 3000)
    
    // 组件挂载时立即检查一次
    checkConnectedDevices()
    
    // 组件卸载时清除定期检查
    return () => {
      if (interval) {
        clearInterval(interval)
      }
    }
  }, [])

  return (
    <>
      <div className="app-container">
        {/* 左侧设备管理面板 */}
        <div className="left-panel">
          <div className="card">
            <div className="header-row">
              <h2>设备管理</h2>
              <button 
                className="refresh-button" 
                onClick={fetchDevices} 
                disabled={loading}
                title="获取可用设备"
              >
                {loading ? '↻' : '↻'}
              </button>
            </div>
            
            {error && <p className="error">{error}</p>}
            
            {devices.length > 0 && (
              <div className="devices-list">
                <h3>可用设备</h3>
                <ul>
                  {devices.map((device) => (
                    <li key={device.id} className="device-item">
                      {deviceConnections[device.id] && (
                        <div className="connection-status">已连接</div>
                      )}
                      <div className="device-info">
                        <strong>ID:</strong> {device.id}<br />
                        <strong>平台:</strong> {device.platform}<br />
                      </div>
                      <div className="device-actions">
                        {!deviceConnections[device.id] && (
                          <button 
                            className="connect-button"
                            onClick={() => connectDevice(device.id, device.platform)}
                            disabled={loading}
                          >
                            连接
                          </button>
                        )}
                        {deviceConnections[device.id] && (
                          <button 
                            className="disconnect-button"
                            onClick={() => disconnectDevice(device.id)}
                            disabled={loading}
                          >
                            {loading ? '断开中...' : '断开'}
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {devices.length === 0 && !loading && (
              <p>暂无可用设备</p>
            )}
          </div>
          

        </div>
        
        {/* 右侧代码编辑器面板 */}
        <div className="right-panel">
          <div className="card">
            <h2>脚本编辑器</h2>
            <CodeEditor 
              value={scriptContent} 
              onChange={setScriptContent} 
              height="calc(100vh - 200px)" 
            />
            <div className="editor-actions">
              <button 
                className="execute-button"
                onClick={executeScript}
                disabled={isExecuting || loading}
              >
                {isExecuting ? '执行中...' : '执行脚本'}
              </button>
            </div>
            {executionStatus && (
              <div className={`execution-status ${executionStatus.type}`}>
                <strong>{executionStatus.message}</strong>
                {executionStatus.type === 'success' && (
                  <div className="execution-result">
                    <p>命令执行数量: {executionStatus.result.executionResult.summary.totalCommands}</p>
                    <p>成功执行: {executionStatus.result.executionResult.summary.successfulCommands}</p>
                    <p>失败执行: {executionStatus.result.executionResult.summary.failedCommands}</p>
                  </div>
                )}
                {executionStatus.type === 'error' && (
                  <div className="execution-error">
                    <p>{executionStatus.error}</p>
                  </div>
                )}
              </div>
            )}
            
            {/* 执行结果弹窗 */}
            {showAlert && executionStatus && (
              <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)', zIndex: 1000, width: '80%', maxWidth: '500px' }}>
                <div style={{ position: 'relative' }}>
                  <h2 style={{ marginBottom: '20px' }}>
                    {executionStatus.type === 'success' ? '脚本执行成功' : '脚本执行失败'}
                  </h2>
                  
                  {executionStatus.type === 'error' && (
                    <div style={{ marginBottom: '20px', color: '#dc3545' }}>
                      <p><strong>错误信息:</strong> {executionStatus.error}</p>
                    </div>
                  )}
                  
                  <div style={{ textAlign: 'right' }}>
                    <button onClick={() => setShowAlert(false)} style={{ padding: '8px 16px', backgroundColor: '#646cff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                      关闭
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default App