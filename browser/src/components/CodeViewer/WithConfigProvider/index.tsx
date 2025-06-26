import { ConfigProvider } from 'antd';
import type { FC } from 'react';

// HOC: withConfigProvider
export function withConfigProvider<T extends object>(Component: FC<T>): FC<T> {
  return (props: T) => (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#00b96b',
        },
      }}
    >
      <Component {...props} />
    </ConfigProvider>
  );
}
