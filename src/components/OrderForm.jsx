import React, { useState, useEffect } from 'react';
import './OrderForm.css'; // 필요한 경우 CSS 파일 생성

function generateOrderId() {
  const randomNumber = Math.floor(Math.random() * 10000000); // 0 ~ 9999999
  const paddedNumber = String(randomNumber).padStart(7, '0'); // 7자리로 0 패딩
  return 'ON1' + paddedNumber;
}

function OrderForm({ tabType }) {
  const [orderQuantity, setOrderQuantity] = useState('');
  const [orderPrice, setOrderPrice] = useState('');
  const [orderSellPrice, setOrderSellPrice] = useState('');
  const [orderBuyPrice, setOrderBuyPrice] = useState('');
  const [messages, setMessages] = useState([]);
  const [orderSide, setOrderSide] = useState('SELL'); // 매도 기본값
  const [serverResponse, setServerResponse] = useState([]);
  const [responseData, setResponseData] = useState('');

  // 서버 응답 수신 리스너 설정
  useEffect(() => {
    const unsubscribeData = window.tcpAPI.onDataReceived((data) => {
      try {
        const parsedData = JSON.parse(data);
        setServerResponse(prev => [...prev, parsedData]);
      } catch (err) {
        // 일반 텍스트 응답인 경우
        setServerResponse(prev => [...prev, { message: data }]);
      }
    });

    const unsubscribeError = window.tcpAPI.onError((message) => {
      setServerResponse(prev => [...prev, { error: message }]);
    });

    return () => {
      unsubscribeData();
      unsubscribeError();
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    let tr = {};
    let protoCode = "";
    let data = {};

    if (tabType === '선물거래') {
      protoCode = "TRSNDODR10";
      data.beginString = "FIX.4.2";
      data.bodyLength = 0;
      data.msgType = "D";
      data.senderCompID = "YOUR_CLIENT_ID";
      data.targetCompID = "KRX_SERVER_ID";
      data.msgSeqNum = 0;
      data.sendingTime = new Date().toISOString().replace('T', '-').slice(0, 23);
      data.clOrdID = "CLORD" + Math.floor(Math.random() * 100000);
      data.handlInst = 3; // [1: 자동, 2: 수동, 3: 없음]
      data.symbol = "KOSPI200_FUT";
      data.securityType = "FUT"; // 고정
      data.maturityMonthYear = "20251231"; // 만기월 yMd
      data.securityExchange = "XKRX"; // 거래소코드
      data.side = orderSide === "SELL" ? 2 : 1; // [1: 매수, 2: 매도, 3: 공매도, 4: 매수커버]
      data.orderQty = parseInt(orderQuantity);
      data.ordType = 2; // [1: 시장가, 2: 지정가, 3: 중간가, 4: 최우선지정가
      data.price = parseFloat(orderPrice);
      data.timeInForce = 0; // [0: 당일, 1: GTC, 3: IOC, 4: FOK]
      data.checkSum = 1;
    } else {
      protoCode = "TRSNDODR01";
      data.orgOrderId = generateOrderId();
      data.msgSeqNo = 0; //서버에서 처리
      data.trCode = "TCHODR40001"; //일반호가
      data.meGroupNo = "00";
      data.marketId = "KTS" //고정값
      data.boardId = "G1"; //G1:일반호가, S1:신고매매, WS:발행전(WIT), R1:협의매매
      data.mbrNo = "11111";
      data.branchNo = "88243";
      data.issueCode = "KR103501GC90"; // 종목코드
      data.accountNo = "100245188243";
      data.ordTypeCode = "2"; //고정값 : 1 시장가(Market), 2 지정가(Limit)
      data.ordCntnCode = "0";
      data.askTypeCode = "02"; // 고정값: 00 해당없음, 01 일반매도, 06 기타매도
      data.trustPrincTypeCode = "10";
      data.trustCompayNo = null;
      data.accountTypeCode = "00";
      data.countryCode = "410";
      data.invstTypeCode = "1000";
      data.foreignInvstTypeCode = "00";
      data.nonTaxYn = "Y";
      data.ordMediaTypeCode = "4"; //고정값 4 HTS : 고객PC, 객장/사이버룸 단말 등
      data.ordrIdInform = "192168561";
      data.macAddr = "34C93D03E22E";
      data.ordDate = null;
      data.ordTime = null;
      data.mbrUseArea = null;
      data.trdrNo = 90011;
      data.mmOrdTypeNo = 1;
      data.modCnclTypeCode = orderSide === "SELL" ? 1 : 2; //1: 매도, 2: 매수
      
      if (tabType === '일반호가') {
        data.ordPrc = parseFloat(orderPrice);
        data.OrdQty = parseInt(orderQuantity);
      } else if (tabType === '양방향호가') {
        data.askOrdPrc = parseFloat(orderSellPrice);
        data.bidOrdPrc = parseFloat(orderBuyPrice);
        data.askOrdQty = parseInt(orderQuantity);
        data.bidOrdQty = parseInt(orderQuantity);
      }
    }

    tr = {
      data: [data],
      protoCode: protoCode,
      mbrNo: "11111",
      trdrNo: "90011",
      tokenId: "69a9cd64-0ad6-47df-a4ee-441c949ee48a",
      ordStsCode: null,
      msgCode: null,
      msgContn: null,
      UserId: "JOONYOUNG",
      macAddr: "34:C9:3D:03:E2:2E"
    };

    console.log("주문 데이터 전송:", JSON.stringify(tr));
    
    // TCP 소켓을 통해 주문 데이터 전송 (WebSocket 대신)
    const result = await window.tcpAPI.sendOrder(tr);
    
    if (result) {
      setResponseData((prev) => [...prev, result]);
      console.log(result);
      const messageObj = {
        side: orderSide,
        tab: tabType,
        quantity: parseInt(orderQuantity),
        orderPrice: parseFloat(orderPrice),
        timestamp: new Date().toISOString()
      };
      
      if (tabType === '양방향호가') {
        messageObj.sellPrice = parseFloat(orderSellPrice);
        messageObj.buyPrice = parseFloat(orderBuyPrice);
      }
      
      setMessages((prev) => [...prev, messageObj]);
      
      // 폼 초기화
      setOrderQuantity('');
      setOrderPrice('');
      if (tabType === '양방향호가') {
        setOrderSellPrice('');
        setOrderBuyPrice('');
      }
    }
  };

  // 주문 타입에 따른 표시 메시지 포맷
  const formatOrderMessage = (msg) => {
    if (tabType === '양방향호가') {
      return `✅ 양방향호가 체결: ${msg.quantity} 수량, 매도 ${msg.sellPrice}, 매수 ${msg.buyPrice}`;
    } else {
      return `✅ [${msg.side === 'SELL' ? '매도' : '매수'}] ${msg.tab} 체결: ${msg.quantity} 수량, ${msg.orderPrice} 가격`;
    }
  };

  return (
    <div style={{ display: 'flex', padding: '20px', gap: '20px', alignItems: 'flex-start', justifyContent: 'center', width: '900px'}}>
      <div className="order-form">
        <h3>{tabType} 주문</h3>
        <form onSubmit={handleSubmit}>
          {tabType !== '양방향호가' && (
            <div className="form-group">
              <label>매도/매수:</label>
              <select 
                value={orderSide} 
                onChange={(e) => setOrderSide(e.target.value)}
                className="form-control"
              >
                <option value="SELL">매도</option>
                <option value="BUY">매수</option>
              </select>
            </div>
          )}
          
          <div className="form-group">
            <label>주문 수량:</label>
            <input
              type="number"
              className="form-control"
              value={orderQuantity}
              onChange={(e) => setOrderQuantity(e.target.value)}
              required
              min="1"
            />
          </div>
          
          {tabType === '양방향호가' ? (
            <>
              <div className="form-group">
                <label>매도 금액:</label>
                <input
                  type="number"
                  className="form-control"
                  value={orderSellPrice}
                  onChange={(e) => setOrderSellPrice(e.target.value)}
                  required
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="form-group">
                <label>매수 금액:</label>
                <input
                  type="number"
                  className="form-control"
                  value={orderBuyPrice}
                  onChange={(e) => setOrderBuyPrice(e.target.value)}
                  required
                  min="0"
                  step="0.01"
                />
              </div>
            </>
          ) : (
            <div className="form-group">
              <label>주문 금액:</label>
              <input
                type="number"
                className="form-control"
                value={orderPrice}
                onChange={(e) => setOrderPrice(e.target.value)}
                required
                min="0"
                step="0.01"
              />
            </div>
          )}
          
          <button type="submit" className="submit-btn">주문 전송</button>
        </form>
      </div>

      <div className='result-form'>
        {messages.length > 0 && (
          <div className="messages-container">
            <h4>주문 내역:</h4>
            <ul className="messages-list">
              {messages.map((msg, idx) => (
                <li key={idx}>{formatOrderMessage(msg)}</li>
              ))}
            </ul>
          </div>
        )}

        {responseData.length > 0 && (
          <div className="server-response-container" style={{ marginTop: '20px' }}>
            <h4>서버 응답:</h4>
            <ul className="server-response-list">
              {responseData.map((response, idx) => (
                <li key={idx}>
                  {response.error ? 
                    <span className="error-message">❌ 오류: {response.error}</span> : 
                    <span>{response.message || JSON.stringify(response)}</span>
                  }
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default OrderForm;