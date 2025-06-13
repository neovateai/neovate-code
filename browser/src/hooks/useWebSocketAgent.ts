import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  AgentAction,
  ChatMessage,
  FileOperation,
  SystemEvent,
  TaskStatus,
  WebSocketMessage,
} from '@/types/common';

// WebSocket 连接状态
export enum WebSocketReadyState {
  CONNECTING = 0,
  OPEN = 1,
  CLOSING = 2,
  CLOSED = 3,
}

// WebSocket Agent 配置
interface WebSocketAgentOptions {
  autoConnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  onMessage?: (message: WebSocketMessage) => void;
  onChatMessage?: (message: ChatMessage) => void;
  onAgentAction?: (message: AgentAction) => void;
  onSystemEvent?: (message: SystemEvent) => void;
  onFileOperation?: (message: FileOperation) => void;
  onTaskStatus?: (message: TaskStatus) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
}

// WebSocket Agent 状态
interface WebSocketAgentState {
  socket: WebSocket | null;
  readyState: WebSocketReadyState;
  isConnected: boolean;
  isConnecting: boolean;
  lastMessage: WebSocketMessage | null;
  error: string | null;
  reconnectCount: number;
}

// 获取 WebSocket URL
const getSocketUrl = () => {
  const h = location;
  const host = h.host;
  const isHttps = h.protocol === 'https:';
  return `${isHttps ? 'wss' : 'ws'}://${host}/ws-chat`;
};

/**
 * WebSocket Agent Hook
 * 用于与 WebSocketManager 交互，支持在 useXAgent 中使用
 */
export function useWebSocketAgent(options: WebSocketAgentOptions = {}) {
  const {
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
    onMessage,
    onChatMessage,
    onAgentAction,
    onSystemEvent,
    onFileOperation,
    onTaskStatus,
    onConnect,
    onDisconnect,
    onError,
  } = options;

  const [state, setState] = useState<WebSocketAgentState>({
    socket: null,
    readyState: WebSocketReadyState.CLOSED,
    isConnected: false,
    isConnecting: false,
    lastMessage: null,
    error: null,
    reconnectCount: 0,
  });

  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messageBufferRef = useRef<WebSocketMessage[]>([]);

  // 清理重连定时器
  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  // 处理收到的消息
  const handleMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);

        setState((prev) => ({
          ...prev,
          lastMessage: message,
          error: null,
        }));

        // 缓存消息
        messageBufferRef.current.push(message);

        // 调用通用消息处理器
        onMessage?.(message);

        // 根据消息类型调用特定处理器
        switch (message.type) {
          case 'chat':
            onChatMessage?.(message as ChatMessage);
            break;
          case 'action':
            onAgentAction?.(message as AgentAction);
            break;
          case 'event':
            onSystemEvent?.(message as SystemEvent);
            break;
          case 'file_op':
            onFileOperation?.(message as FileOperation);
            break;
          case 'task_status':
            onTaskStatus?.(message as TaskStatus);
            break;
          default:
            console.warn('Unknown message type:', message.type);
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
        setState((prev) => ({
          ...prev,
          error:
            error instanceof Error ? error.message : 'Failed to parse message',
        }));
      }
    },
    [
      onMessage,
      onChatMessage,
      onAgentAction,
      onSystemEvent,
      onFileOperation,
      onTaskStatus,
    ],
  );

  // 连接 WebSocket
  const connect = () => {
    if (state.socket?.readyState === WebSocket.OPEN || state.isConnecting) {
      return;
    }

    setState((prev) => ({
      ...prev,
      isConnecting: true,
      error: null,
    }));

    try {
      const socket = new WebSocket(getSocketUrl(), 'chat');

      socket.addEventListener('open', () => {
        setState((prev) => ({
          ...prev,
          socket,
          readyState: WebSocketReadyState.OPEN,
          isConnected: true,
          isConnecting: false,
          error: null,
          reconnectCount: 0,
        }));
        clearReconnectTimeout();
        onConnect?.();
      });

      socket.addEventListener('message', handleMessage);

      socket.addEventListener('close', () => {
        setState((prev) => ({
          ...prev,
          socket: null,
          readyState: WebSocketReadyState.CLOSED,
          isConnected: false,
          isConnecting: false,
        }));
        onDisconnect?.();

        // 自动重连
        if (state.reconnectCount < maxReconnectAttempts) {
          reconnectTimeoutRef.current = setTimeout(() => {
            setState((prev) => ({
              ...prev,
              reconnectCount: prev.reconnectCount + 1,
            }));
            connect();
          }, reconnectInterval);
        }
      });

      socket.addEventListener('error', (event) => {
        const errorMessage = 'WebSocket connection error';
        setState((prev) => ({
          ...prev,
          error: errorMessage,
          isConnecting: false,
        }));
        onError?.(event);
      });
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to connect',
        isConnecting: false,
      }));
    }
  };

  // 断开连接
  const disconnect = useCallback(() => {
    clearReconnectTimeout();
    if (state.socket) {
      state.socket.close();
    }
    setState((prev) => ({
      ...prev,
      socket: null,
      readyState: WebSocketReadyState.CLOSED,
      isConnected: false,
      isConnecting: false,
      reconnectCount: 0,
    }));
  }, [state.socket, clearReconnectTimeout]);

  // 发送消息
  const sendMessage = useCallback(
    (message: any) => {
      if (state.socket?.readyState === WebSocket.OPEN) {
        const messageStr =
          typeof message === 'string' ? message : JSON.stringify(message);
        state.socket.send(messageStr);
        return true;
      }
      console.warn('WebSocket is not connected');
      return false;
    },
    [state.socket],
  );

  // 发送聊天消息
  const sendChatMessage = useCallback(
    (content: string, role: 'user' | 'assistant' = 'user') => {
      const message = {
        type: 'chat',
        role,
        content,
        timestamp: Date.now(),
      };
      return sendMessage(message);
    },
    [sendMessage],
  );

  // 获取消息历史
  const getMessageHistory = useCallback((type?: string) => {
    if (type) {
      return messageBufferRef.current.filter((msg) => msg.type === type);
    }
    return [...messageBufferRef.current];
  }, []);

  // 清空消息历史
  const clearMessageHistory = useCallback(() => {
    messageBufferRef.current = [];
  }, []);

  console.log('state --->', state);

  // 创建用于 useXAgent 的请求函数
  const createAgentRequest = () => {
    return async (
      { message }: { message: { role: string; content: string } },
      {
        onUpdate,
        onSuccess,
        onError,
      }: {
        onUpdate: (data: any) => void;
        onSuccess: (data: any) => void;
        onError: (error: any) => void;
      },
    ) => {
      console.log('createAgentRequest state --->', state);
      if (!state.isConnected) {
        onError(new Error('WebSocket not connected'));
        return;
      }

      try {
        // 发送用户消息
        const success = sendChatMessage(
          message.content,
          message.role as 'user' | 'assistant',
        );
        if (!success) {
          throw new Error('Failed to send message');
        }

        let responseContent = '';
        let isComplete = false;

        // 创建消息监听器
        const messageListener = (wsMessage: WebSocketMessage) => {
          if (wsMessage.type === 'chat') {
            const chatMessage = wsMessage as ChatMessage;

            console.log('chatMessage', chatMessage);

            if (chatMessage.role === 'assistant') {
              if (chatMessage.streaming && chatMessage.delta) {
                responseContent += chatMessage.delta;
                onUpdate({
                  content: chatMessage.delta,
                  role: 'assistant',
                });
              } else if (chatMessage.finished || !chatMessage.streaming) {
                responseContent = chatMessage.content;
                isComplete = true;
                onSuccess([
                  {
                    content: responseContent,
                    role: 'assistant',
                  },
                ]);
              }
            }
          }
        };

        // 临时添加消息监听器
        const originalOnMessage = options.onMessage;
        options.onMessage = (msg) => {
          messageListener(msg);
          originalOnMessage?.(msg);
        };

        // 设置超时
        const timeout = setTimeout(() => {
          if (!isComplete) {
            onError(new Error('Request timeout'));
          }
        }, 30000);

        // 等待响应完成
        const checkComplete = () => {
          if (isComplete) {
            clearTimeout(timeout);
            options.onMessage = originalOnMessage;
          } else {
            setTimeout(checkComplete, 100);
          }
        };
        checkComplete();
      } catch (error) {
        onError(error);
      }
    };
  };

  // 自动连接
  useEffect(() => {
    connect();

    return () => {
      disconnect();
      clearReconnectTimeout();
    };
  }, []); // 移除 connect 和 disconnect 的依赖，避免无限循环

  return {
    // 状态
    ...state,

    // 方法
    connect,
    disconnect,
    sendMessage,
    sendChatMessage,
    getMessageHistory,
    clearMessageHistory,
    createAgentRequest,

    // 便捷属性
    isReady: state.isConnected && state.readyState === WebSocketReadyState.OPEN,
    canSend: state.socket?.readyState === WebSocket.OPEN,
  };
}
