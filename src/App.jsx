import React, { useState, useEffect } from 'react';
import OrderTabs from './components/OrderTabs';
import './App.css';

function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [serverMessages, setServerMessages] = useState([]);
  const [error, setError] = useState('');
  const [host, setHost] = useState('192.168.0.122');
  const [port, setPort] = useState(50002);

  const [loginJson, setLoginJson] = useState('');

  // 수신 데이터 상태
  const [receivedMessages, setReceivedMessages] = useState([]);
  const [isReceiving, setIsReceiving] = useState(false);

  useEffect(() => {
    console.log('tcpAPI:', window.tcpAPI);
    if(!window.tcpAPI) {
      console.warn("tcpAPI가 정의되지 않았습니다.");
      return;
    }

    // 현재 연결 상태 확인
    window.tcpAPI.getConnectionStatus().then(status => {
      console.log('현재 연결상태 : ' + status.connected);
      setIsConnected(status.connected);
    });
    
    // 이벤트 리스너 등록
    const unsubscribeStatus = window.tcpAPI.onStatusChange((data) => {
      setIsConnected(data.connected);
      if (data.connected) {
        setError('');
      }
    });

    const unsubscribeError = window.tcpAPI.onError((message) => {
      setError(message);
      setServerMessages('');
    });

    // 메시지 수신 리스너 (C#의 OnMessageReceived와 동일한 역할)
    const unsubscribeMessage = window.tcpAPI.onMessageReceived((message) => {
      console.log('메시지 수신:', message);
      
      setReceivedMessages(prev => {
        const newMessage = {
          id: Date.now() + Math.random(),
          message: message,
          timestamp: new Date().toISOString(),
          type: detectMessageType(message) // 메시지 타입 감지
        };
        
        const newMessages = [...prev, newMessage];
        // 최신 100개만 유지
        return newMessages.slice(-100);
      });
    });

    return () => {
      unsubscribeStatus();
      unsubscribeError();
      unsubscribeMessage();
    };
  }, []);

  // 메시지 타입 감지 함수 (필요에 따라 수정)
  const detectMessageType = (message) => {
    try {
      const parsed = JSON.parse(message);
      return parsed.type || 'unknown';
    } catch {
      // JSON이 아닌 경우 문자열 패턴으로 판단
      if (message.includes('주문')) return 'order';
      if (message.includes('호가')) return 'quote';
      if (message.includes('체결')) return 'execution';
      return 'general';
    }
  };

  const handleConnect = async () => {
    try {
      console.log('conecting test');
      const result = await window.tcpAPI.connectToServer({ host, port });
      console.log(result);
      if (result.success) {
        setIsConnected(true);
        setError(null);
        
        // 연결 성공 후 수신 시작
        //await window.tcpAPI.startReceiving();
        setIsReceiving(true);
      } else {
        setError(result.error || '연결 실패');
      }
    } catch (e) {
      setError(e.message);
    }
  };

  const handleDisconnect = async () => {
    try {
      //await window.tcpAPI.stopReceiving(); // 수신 중지
      await window.tcpAPI.disconnectFromServer(); // 연결 해제
      setIsReceiving(false);
    } catch (e) {
      console.error('연결 해제 오류:', e);
    }
  };


  const handleSendLogin = () => {
    try {
      const cleand = loginJson.trim();
      const parsed = JSON.parse(cleand); // 먼저 JSON 형식 확인
      const jsonData = JSON.stringify(parsed); // 다시 문자열로 변환 후 전송

      if (!window.tcpAPI || typeof window.tcpAPI.send !== 'function') {
        alert("tcpAPI가 제대로 연결되지 않았습니다.");
        return;
      }

      window.tcpAPI.send(jsonData);
    } catch (err) {
      alert('유효한 JSON이 아닙니다.');
    }
  };

  // 수신 데이터 클리어
  const clearMessages = () => {
    setReceivedMessages([]);
  };

  return (
    
    <div style={{ padding: '20px' }}>
      <h3>TCP 주문 시스템 서버연결</h3>

      {/* ▶ 송신/수신 소켓을 좌우로 나란히 */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '30px' }}>
        {/* 송신 소켓 */}
        <div style={{ flex: 1, border: '1px solid #ddd', padding: '15px', borderRadius: '5px' }}>
          <h4>주문 전송 소켓</h4>
          <div style={{ marginBottom: '20px' }}>
            {!isConnected && (
              <>
                <div style={{ marginBottom: '10px' }}>
                  <label>IP: </label>
                  <input
                    type="text"
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                    disabled={isConnected}
                  />
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <label>Port: </label>
                  <input
                    type="number"
                    value={port}
                    onChange={(e) => setPort(parseInt(e.target.value))}
                    disabled={isConnected}
                  />
                </div>
              </>
            )}

            {isConnected ? (
              <button onClick={handleDisconnect}>연결 해제</button>
            ) : (
              <button onClick={handleConnect}>서버에 연결</button>
            )}

            <div style={{ marginTop: '10px' }}>
              상태:{' '}
              <span style={{ color: isConnected ? 'green' : 'red' }}>
                {isConnected ? '연결됨' : '연결 안됨'}
              </span>
            </div>
          </div>
        </div>
        {/* 오른쪽: 로그인 JSON 전송 */}
        <div style={{ flex: 1, border: '1px solid #ddd', padding: '15px', borderRadius: '5px' }}>
          <h4>로그인 요청 (JSON)</h4>
          <textarea
            style={{ width: '100%', height: '150px', marginBottom: '10px' }}
            value={loginJson}
            onChange={(e) => setLoginJson(e.target.value)}
            placeholder='예: { "type": "Logon", "username": "test", "password": "1234" }'
          />
          <button onClick={handleSendLogin}>전송</button>
        </div>

      </div>
      
      {/* 에러 메시지 */}
      {error && (
        <div style={{ color: 'red', marginBottom: '20px' }}>
          에러: {error}
        </div>
      )}

      {/* 주문 탭 */}
      {isConnected && <OrderTabs />}

      {/* 서버 응답 */}
      {serverMessages.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <h2>서버 응답</h2>
          <div
            style={{
              maxHeight: '200px',
              overflow: 'auto',
              border: '1px solid #ccc',
              padding: '10px',
            }}
          >
            {serverMessages.map((msg, index) => (
              <div key={index}>{msg}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
