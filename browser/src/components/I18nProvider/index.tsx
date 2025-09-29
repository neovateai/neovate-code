import { ConfigProvider, Spin } from 'antd';
import { Suspense } from 'react';

interface I18nProviderProps {
  children: React.ReactNode;
}

const I18nProvider: React.FC<I18nProviderProps> = ({ children }) => {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#7357FE',
        },
      }}
    >
      <Suspense
        fallback={
          <Spin
            size="large"
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100vh',
            }}
          />
        }
      >
        {children}
      </Suspense>
    </ConfigProvider>
  );
};

export default I18nProvider;
