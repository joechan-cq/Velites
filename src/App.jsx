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
              height="calc(100vh - 150px)" 
            />
          </div>
        </div>
      </div>
    </>
  )
}

export default App