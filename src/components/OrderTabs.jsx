import React, { useState } from 'react';
import OrderForm from './OrderForm';

const tabLabels = ['일반호가', '양방향호가', '선물거래'];

const OrderTabs = () => {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div>
      <div style={{ display: 'flex', borderBottom: '1px solid #ccc' }}>
        {tabLabels.map((label, index) => (
          <button
            key={index}
            onClick={() => setActiveTab(index)}
            style={{
              padding: '10px 20px',
              border: 'none',
              borderBottom: activeTab === index ? '2px solid blue' : 'none',
              backgroundColor: 'white',
              color: 'black',
              cursor: 'pointer',
              fontWeight: activeTab === index ? 'bold' : 'normal',
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <div style={{ padding: '20px' }}>
        <OrderForm tabType={tabLabels[activeTab]} />
      </div>
    </div>
  );
};

export default OrderTabs;
