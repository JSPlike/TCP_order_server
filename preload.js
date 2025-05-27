const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('tcpAPI', {
  test: () => 'hello world',
  connectToServer: (serverConfig) => ipcRenderer.invoke('connect-tcp', serverConfig),
  disconnectFromServer: () => ipcRenderer.invoke('disconnect-tcp'),
  send: (json) => {
    console.log('tcp send in preload');
    ipcRenderer.send('tcp-send', json)
  },
  sendOrder: (orderData) => ipcRenderer.invoke('send-order', orderData),
  getConnectionStatus: () => ipcRenderer.invoke('get-connection-status'),

  onStatusChange: (callback) => {
    ipcRenderer.on('tcp-status', (_, data) => callback(data));
    return () => ipcRenderer.removeAllListeners('tcp-status');
  },
  onDataReceived: (callback) => {
    ipcRenderer.on('tcp-data', (_, data) => callback(data));
    return () => ipcRenderer.removeAllListeners('tcp-data');
  },
  onError: (callback) => {
    ipcRenderer.on('tcp-error', (_, message) => callback(message));
    return () => ipcRenderer.removeAllListeners('tcp-error');
  },

  // C#의 OnMessageReceived와 동일한 역할
  onMessageReceived: (callback) => {
    const handler = (event, message) => callback(message);
    ipcRenderer.on('message-received', handler);
    return () => ipcRenderer.removeListener('message-received', handler);
  },
  
  // 이벤트 리스너 제거
  removeAllDataListeners: () => {
    ipcRenderer.removeAllListeners('tcp-data-received');
    ipcRenderer.removeAllListeners('receiver-status-changed');
  }
});