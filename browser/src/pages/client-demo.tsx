/** biome-ignore-all lint/correctness/useExhaustiveDependencies: <explanation> */
/** biome-ignore-all lint/a11y/noLabelWithoutControl: <explanation> */
/** biome-ignore-all lint/a11y/useButtonType: <explanation> */
import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import type {
  ClientConfig,
  InitializeParams,
  InitializeResult,
  SendMessageParams,
  SendMessageResult,
} from '../client';
import { useClient } from '../hooks/useClient';

interface LogEntry {
  timestamp: string;
  type: 'info' | 'error' | 'success' | 'warning';
  message: string;
  data?: unknown;
}

const ClientDemo = () => {
  const [config, setConfig] = useState<ClientConfig>({
    reconnectInterval: 1000,
    maxReconnectInterval: 30000,
    defaultTimeout: 30000,
    shouldReconnect: true,
  });

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [sessionId, setSessionId] = useState<string>('');
  const [cwd, setCwd] = useState<string>('/tmp');
  const [message, setMessage] = useState<string>('Hello from client!');
  const [responses, setResponses] = useState<Record<string, unknown>[]>([]);

  const {
    state,
    connect: clientConnect,
    disconnect: clientDisconnect,
    request,
    onEvent,
    removeEventHandler,
  } = useClient({ config, autoConnect: true });

  const addLog = (type: LogEntry['type'], message: string, data?: unknown) => {
    const entry: LogEntry = {
      timestamp: new Date().toLocaleTimeString(),
      type,
      message,
      data,
    };
    setLogs((prev) => [...prev, entry]);
  };

  const connect = async () => {
    try {
      addLog('info', 'Starting connection...');
      await clientConnect();
      addLog('success', 'Connected successfully');
    } catch (error) {
      addLog('error', 'Connection failed', error);
    }
  };

  const disconnect = async () => {
    try {
      await clientDisconnect();
      addLog('info', 'Disconnected');
    } catch (error) {
      addLog('error', 'Disconnect failed', error);
    }
  };

  const initialize = async () => {
    if (!state.isReady) {
      addLog('error', 'Client not ready');
      return;
    }

    try {
      const params: InitializeParams = {
        cwd,
        sessionId: sessionId || undefined,
      };

      addLog('info', 'Sending initialize request', params);
      const result = await request<InitializeParams, InitializeResult>(
        'initialize',
        params,
      );

      addLog('success', 'Initialize response received', result);
      setResponses((prev) => [...prev, { method: 'initialize', result }]);

      if (result.data?.sessionId) {
        setSessionId(result.data.sessionId);
      }
    } catch (error) {
      addLog('error', 'Initialize failed', error);
    }
  };

  const sendMessage = async () => {
    if (!state.isReady) {
      addLog('error', 'Client not ready');
      return;
    }

    try {
      const params: SendMessageParams = {
        message,
        cwd,
        sessionId: sessionId || undefined,
      };

      addLog('info', 'Sending message request', params);
      const result = await request<SendMessageParams, SendMessageResult>(
        'send',
        params,
      );

      addLog('success', 'Message response received', result);
      setResponses((prev) => [...prev, { method: 'sendMessage', result }]);

      if (result.sessionId) {
        setSessionId(result.sessionId);
      }
    } catch (error) {
      console.error(error);
      addLog('error', 'Send message failed', error);
    }
  };

  const getStatus = async () => {
    if (!state.isReady) {
      addLog('error', 'Client not ready');
      return;
    }

    try {
      const params = {
        cwd,
        sessionId,
      };

      addLog('info', 'Sending status request', params);
      const result = await request('getStatus', params);

      addLog('success', 'Status response received', result);
      setResponses((prev) => [...prev, { method: 'getStatus', result }]);
    } catch (error) {
      addLog('error', 'Get status failed', error);
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const clearResponses = () => {
    setResponses([]);
  };

  // Setup event handlers
  useEffect(() => {
    const handleConnected = () => {
      addLog('success', 'Received connected event');
    };

    const handleDisconnected = () => {
      addLog('warning', 'Received disconnected event');
    };

    const handleMessage = (data: unknown) => {
      addLog('info', 'Received message event', data);
    };

    const handleError = (data: unknown) => {
      addLog('error', 'Received error event', data);
    };

    onEvent('connected', handleConnected);
    onEvent('disconnected', handleDisconnected);
    onEvent('message', handleMessage);
    onEvent('error', handleError);

    return () => {
      removeEventHandler('connected', handleConnected);
      removeEventHandler('disconnected', handleDisconnected);
      removeEventHandler('message', handleMessage);
      removeEventHandler('error', handleError);
    };
  }, [onEvent, removeEventHandler]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'text-green-600';
      case 'connecting':
        return 'text-yellow-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getLogColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      case 'warning':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">WebSocket Client Demo</h1>

      {/* Status */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h2 className="text-xl font-semibold mb-3">连接状态</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="font-medium">Transport: </span>
            <span className={getStatusColor(state.transport)}>
              {state.transport}
            </span>
          </div>
          <div>
            <span className="font-medium">Message Bus: </span>
            <span
              className={state.messageBus ? 'text-green-600' : 'text-red-600'}
            >
              {state.messageBus ? 'Ready' : 'Not Ready'}
            </span>
          </div>
        </div>
      </div>

      {/* Configuration */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h2 className="text-xl font-semibold mb-3">配置</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              WebSocket URL
            </label>
            <input
              type="text"
              value={config.wsUrl}
              onChange={(e) =>
                setConfig((prev) => ({ ...prev, wsUrl: e.target.value }))
              }
              className="w-full p-2 border rounded"
              disabled={state.transport === 'connected'}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Reconnect Interval (ms)
            </label>
            <input
              type="number"
              value={config.reconnectInterval}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  reconnectInterval: Number(e.target.value),
                }))
              }
              className="w-full p-2 border rounded"
              disabled={state.transport === 'connected'}
            />
          </div>
        </div>
      </div>

      {/* Connection Controls */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h2 className="text-xl font-semibold mb-3">连接控制</h2>
        <div className="flex gap-2">
          <button
            onClick={connect}
            disabled={
              state.transport === 'connected' ||
              state.transport === 'connecting'
            }
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
          >
            连接
          </button>
          <button
            onClick={disconnect}
            disabled={state.transport === 'disconnected'}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:bg-gray-400"
          >
            断开连接
          </button>
        </div>
      </div>

      {/* API Testing */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h2 className="text-xl font-semibold mb-3">API 测试</h2>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">Session ID</label>
            <input
              type="text"
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              className="w-full p-2 border rounded"
              placeholder="自动生成"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Working Directory
            </label>
            <input
              type="text"
              value={cwd}
              onChange={(e) => setCwd(e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full p-2 border rounded h-20"
            placeholder="输入要发送的消息"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={initialize}
            disabled={!state.isReady}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400"
          >
            Initialize
          </button>
          <button
            onClick={sendMessage}
            disabled={!state.isReady}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
          >
            Send Message
          </button>
          <button
            onClick={getStatus}
            disabled={!state.isReady}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:bg-gray-400"
          >
            Get Status
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Logs */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-xl font-semibold">日志</h2>
            <button
              onClick={clearLogs}
              className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm"
            >
              清除
            </button>
          </div>
          <div className="bg-black text-white p-4 rounded-lg h-96 overflow-auto text-sm font-mono">
            {logs.map((log, index) => (
              <div key={index} className="mb-2">
                <span className="text-gray-400">[{log.timestamp}]</span>
                <span className={`ml-2 ${getLogColor(log.type)}`}>
                  [{log.type.toUpperCase()}]
                </span>
                <span className="ml-2">{log.message}</span>
                {log.data && (
                  <pre className="text-gray-300 ml-8 mt-1 text-xs">
                    {JSON.stringify(log.data, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Responses */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-xl font-semibold">API 响应</h2>
            <button
              onClick={clearResponses}
              className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm"
            >
              清除
            </button>
          </div>
          <div className="bg-gray-800 text-white p-4 rounded-lg h-96 overflow-auto text-sm">
            {responses.map((response, index) => (
              <div key={index} className="mb-4 pb-4 border-b border-gray-600">
                <div className="text-green-400 font-semibold mb-2">
                  {response.method}
                </div>
                <pre className="text-gray-300 text-xs">
                  {JSON.stringify(response.result, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export const Route = createFileRoute('/client-demo')({
  component: ClientDemo,
});
