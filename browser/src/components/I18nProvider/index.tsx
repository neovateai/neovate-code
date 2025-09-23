import { Spin } from 'antd';
import type React from 'react';
import { Suspense } from 'react';

interface I18nProviderProps {
  children: React.ReactNode;
}

const I18nProvider: React.FC<I18nProviderProps> = ({ children }) => {
  return (
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
  );
};

export default I18nProvider;
