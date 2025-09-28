import { useCallback, useEffect, useRef, useState } from 'react';
import type { ClientConfig } from '../client';
import { MessageBus, WebSocketTransport } from '../client';

export interface UseClientOptions {
  config: ClientConfig;
  autoConnect?: boolean;
}

export interface ClientState {
  transport: 'disconnected' | 'connecting' | 'connected' | 'error' | 'closed';
  messageBus: boolean;
  isReady: boolean;
}

export const useClient = ({
  config,
  autoConnect = false,
}: UseClientOptions) => {
  const [state, setState] = useState<ClientState>({
    transport: 'disconnected',
    messageBus: false,
    isReady: false,
  });

  const transportRef = useRef<WebSocketTransport | null>(null);
  const messageBusRef = useRef<MessageBus | null>(null);

  const connect = useCallback(async () => {
    if (transportRef.current?.isConnected()) {
      return;
    }

    try {
      setState((prev) => ({ ...prev, transport: 'connecting' }));

      const transport = new WebSocketTransport({
        url: `ws://${window.location.hostname}:${window.location.port}/ws`,
        reconnectInterval: config.reconnectInterval,
        maxReconnectInterval: config.maxReconnectInterval,
        shouldReconnect: config.shouldReconnect,
      });

      transport.onError(() => {
        setState((prev) => ({
          ...prev,
          transport: 'error',
          messageBus: false,
          isReady: false,
        }));
      });

      transport.onClose(() => {
        setState((prev) => ({
          ...prev,
          transport: 'disconnected',
          messageBus: false,
          isReady: false,
        }));
      });

      const messageBus = new MessageBus();
      messageBus.setTransport(transport);
      messageBus.setDefaultTimeout(config.defaultTimeout || 30000);

      transportRef.current = transport;
      messageBusRef.current = messageBus;

      await transport.connect();

      setState({
        transport: 'connected',
        messageBus: true,
        isReady: true,
      });
    } catch (error) {
      setState({
        transport: 'error',
        messageBus: false,
        isReady: false,
      });
      throw error;
    }
  }, [
    config.reconnectInterval,
    config.maxReconnectInterval,
    config.shouldReconnect,
    config.defaultTimeout,
  ]);

  const disconnect = async () => {
    try {
      if (transportRef.current) {
        await transportRef.current.close();
        transportRef.current = null;
      }
      if (messageBusRef.current) {
        messageBusRef.current.cancelPendingRequests();
        messageBusRef.current = null;
      }
      setState({
        transport: 'disconnected',
        messageBus: false,
        isReady: false,
      });
    } catch (error) {
      console.error('Disconnect failed:', error);
    }
  };

  const request = async <T = unknown, R = unknown>(
    method: string,
    params: T,
    options?: { timeout?: number },
  ): Promise<R> => {
    if (!messageBusRef.current) {
      throw new Error('Message bus not available');
    }
    return messageBusRef.current.request<T, R>(method, params, options);
  };

  const onEvent = <T = unknown>(
    event: string,
    handler: (data: T) => void,
  ): void => {
    if (messageBusRef.current) {
      messageBusRef.current.onEvent(event, handler);
    }
  };

  const removeEventHandler = <T = unknown>(
    event: string,
    handler: (data: T) => void,
  ): void => {
    if (messageBusRef.current) {
      messageBusRef.current.removeEventHandler(event, handler);
    }
  };

  // Auto connect
  useEffect(() => {
    if (autoConnect) {
      connect().catch(console.error);
    }
  }, [autoConnect, connect]);

  // Update transport state
  useEffect(() => {
    const interval = setInterval(() => {
      if (transportRef.current) {
        const transportState = transportRef.current.getState();
        setState((prev) => ({
          ...prev,
          transport: transportState,
        }));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (transportRef.current) {
        transportRef.current.close();
      }
      if (messageBusRef.current) {
        messageBusRef.current.cancelPendingRequests();
      }
    };
  }, []);

  return {
    state,
    connect,
    disconnect,
    request,
    onEvent,
    removeEventHandler,
    transport: transportRef.current,
    messageBus: messageBusRef.current,
  };
};
