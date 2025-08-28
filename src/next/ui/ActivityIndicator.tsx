import { Text } from 'ink';
import React from 'react';
import { useAppStore } from './store';

export function ActivityIndicator() {
  const { status } = useAppStore();
  if (status === 'idle') return null;
  if (status === 'processing') return <Text>Processing...</Text>;
  return null;
}
