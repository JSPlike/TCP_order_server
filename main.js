const { app, BrowserWindow, ipcMain } = require('electron');
const { createReadStream } = require('fs');

const path = require('path');
const net = require('net');
const url = require('url');

let mainWindow = null;
let tcpClient = null;
let isConnected = false;

// 메인 윈도우 생성
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.loadURL('http://localhost:3000');

  mainWindow.on('closed', () => {
    mainWindow = null;
    disconnectTCP();
  });
}

app.whenReady().then(() => {
  createWindow();

  ipcMain.handle('connect-tcp', async (event, serverConfig) => {
    console.log('tcp waiting.....');
    return new Promise((resolve, reject) => {
      
      client = new net.Socket();

      client.connect(serverConfig.port, serverConfig.host, () => {
        console.log("the conection is completed!");
        isConnected = true;
        event.sender.send('tcp-status', { connected: true });
        resolve({ success: true });
      });

      client.on('data', (data) => {
        event.sender.send('tcp-data', data.toString());
      });

      client.on('error', (err) => {
        console.log("the conection is faled!!");
        isConnected = false;
        event.sender.send('tcp-error', err.message);
        reject(err);
      });

      client.on('close', () => {
        isConnected = false;
        event.sender.send('tcp-status', { connected: false });
      });
    });
  });

  ipcMain.handle('disconnect-tcp', () => {
    if (client) {
      client.destroy();
      isConnected = false;
    }
    return { success: true };
  });

  ipcMain.handle('send-order', (event, orderData) => {
    if (client && isConnected) {
      try {
        // 객체를 JSON 문자열로 변환
        const message = JSON.stringify(orderData);
        client.write(message);
        return { success: true };
      } catch (e) {
        return { success: false, message: 'Failed to send order: ' + e.message };
      }
    } else {
      return { success: false, message: 'Not connected' };
    }
  });

  ipcMain.handle('get-connection-status', () => {
    return { connected: isConnected };
  });

  ipcMain.on('tcp-send', (_, json) => {
    console.log('socket: ' + client);
    if (client) {
      console.log(json);
      client.write(json + '\n'); // 서버 구분자에 따라 조절
    }
  });
});

// 수신
class UnifiedTcpClient  {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.isReceiving = false;
    this.host = null;
    this.port = null;
    this.receivingCancelled = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 3000;
  }

  connect(host, port) {
    this.client = new net.Socket();
    
    this.client.connect(port, host, () => {
      console.log('tcp conection');
      this.isConnected = true;
    });

    this.client.on('data', (data) => {
      try {
        // 데이터 파싱 (프로토콜에 맞게 수정 필요)
        const receivedData = this.parseReceivedData(data);
        
        // C#의 이벤트와 유사하게 emit
        this.emit('ReceiveTrEvent_TRRCVOMR01_AskBid', {
          data: receivedData,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('데이터 파싱 오류:', error);
      }
    });

    this.client.on('close', () => {
      console.log('TCP 연결 종료');
      this.isConnected = false;
    });

    this.client.on('error', (err) => {
      console.error('TCP 오류:', err);
      this.emit('error', err);
    });
  }

  parseReceivedData(buffer) {
    // 실제 프로토콜에 맞게 구현
    // 예시: 고정길이 또는 구분자 기반 파싱
    const dataString = buffer.toString('utf8');
    return JSON.parse(dataString); // 또는 다른 파싱 로직
  }

  disconnect() {
    if (this.client) {
      this.client.destroy();
    }
  }
}