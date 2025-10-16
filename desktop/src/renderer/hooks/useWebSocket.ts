import { useState, useEffect, useCallback, useRef } from 'react';
import { MessageBus } from '../../../../src/messageBus';
import { WebSocketTransport } from '../../../../src/commands/servernext/websocketTransport';

interface UseWebSocketOptions {
  url?: string;
  autoConnect?: boolean;
}

interface WebSocketState {
  isConnected: boolean;
  isConnecting: boolean;
  error: Error | null;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const { url = 'ws://localhost:7001/ws', autoConnect = true } = options;

  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    isConnecting: false,
    error: null,
  });

  const messageBusRef = useRef<MessageBus | null>(null);
  const transportRef = useRef<WebSocketTransport | null>(null);

  const connect = useCallback(async () => {
    if (state.isConnecting || state.isConnected) {
      return;
    }

    setState((prev) => ({ ...prev, isConnecting: true, error: null }));

    try {
      const transport = new WebSocketTransport(url);
      const messageBus = new MessageBus();

      transport.onClose(() => {
        setState((prev) => ({
          ...prev,
          isConnected: false,
          isConnecting: false,
        }));
      });

      transport.onError((error) => {
        setState((prev) => ({ ...prev, error, isConnecting: false }));
      });

      messageBus.setTransport(transport);

      // Wait for connection
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 5000);

        const checkConnection = setInterval(() => {
          if (transport.isConnected()) {
            clearInterval(checkConnection);
            clearTimeout(timeout);
            resolve();
          }
        }, 100);
      });

      transportRef.current = transport;
      messageBusRef.current = messageBus;

      setState({
        isConnected: true,
        isConnecting: false,
        error: null,
      });
    } catch (error) {
      setState({
        isConnected: false,
        isConnecting: false,
        error: error as Error,
      });
    }
  }, [url, state.isConnecting, state.isConnected]);

  const disconnect = useCallback(async () => {
    if (transportRef.current) {
      await transportRef.current.close();
      transportRef.current = null;
      messageBusRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    ...state,
    messageBus: messageBusRef.current,
    connect,
    disconnect,
  };
}
