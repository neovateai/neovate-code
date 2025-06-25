import React, { createContext, useContext } from 'react';
import { Store } from '../store';

const StoreContext = createContext<Store | null>(null);

export const StoreProvider = ({
  children,
  store,
}: {
  children: React.ReactNode;
  store: Store;
}) => {
  return (
    <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
  );
};

export const useStore = () => {
  const store = useContext(StoreContext);
  if (!store) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return store;
};
