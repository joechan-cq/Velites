import { useState } from 'react'
import axios from 'axios'
import './App.css'

function App() {
  const [devices, setDevices] = useState([])
  const [connectedDevice, setConnectedDevice] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

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
      const response = await axios.post(`http://localhost:3001/api/connect/${deviceId}`, { platform })
      setConnectedDevice({
        id: deviceId,
        platform,
        ...response.data
      })
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
      setConnectedDevice(null)
    } catch (err) {
      setError('断开设备失败: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="app-container">
        {/* 左侧设备管理面板 */}
        <div className="left-panel">
          <div className="card">
            <h2>设备管理</h2>
            
            <button onClick={fetchDevices} disabled={loading}>
              {loading ? '加载中...' : '获取可用设备'}
            </button>
            
            {error && <p className="error">{error}</p>}
            
            {devices.length > 0 && (
              <div className="devices-list">
                <h3>可用设备</h3>
                <ul>
                  {devices.map((device) => (
                    <li key={device.id} className="device-item">
                      <div className="device-info">
                        <strong>ID:</strong> {device.id}<br />
                        <strong>平台:</strong> {device.platform}<br />
                        <strong>状态:</strong> {device.status}
                      </div>
                      <button 
                        onClick={() => connectDevice(device.id, device.platform)}
                        disabled={loading || connectedDevice?.id === device.id}
                      >
                        {connectedDevice?.id === device.id ? '已连接' : '连接'}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {devices.length === 0 && !loading && (
              <p>暂无可用设备</p>
            )}
          </div>
          
          {connectedDevice && (
            <div className="connected-info">
              <h3>当前连接设备</h3>
              <p>设备ID: {connectedDevice.id} ({connectedDevice.platform})</p>
              {connectedDevice.message && <p>{connectedDevice.message}</p>}
              <button 
                onClick={() => disconnectDevice(connectedDevice.id)}
                disabled={loading}
              >
                {loading ? '断开中...' : '断开连接'}
              </button>
            </div>
          )}
        </div>
        
        {/* 右侧代码编辑器面板 */}
        <div className="right-panel">
          <div className="card">
            <h2>脚本编辑器</h2>
            <div className="editor-placeholder">
              <p>代码编辑器区域</p>
              <p>（后续将嵌入代码编辑器）</p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default App