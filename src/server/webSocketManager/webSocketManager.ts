import { randomUUID } from 'crypto';
import { editQuery } from '../../llms/query';
import { ServerOptions } from '../types';
import { SocketServer } from './socketServer';

interface WebSocketManagerOptions extends ServerOptions {}

// WebSocket 消息类型定义
type SockWriteType =
  | 'connected'
  | 'action'
  | 'event'
  | 'file_op'
  | 'task_status'
  | 'chat';

interface SocketMessage {
  type: SockWriteType;
  sessionId: string;
  data?: Record<string, any> | string | boolean;
}

// 聊天消息类型
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  streaming?: boolean;
  delta?: string;
  finished?: boolean;
  tokenUsage?: {
    totalTokens: number;
    promptTokens: number;
    completionTokens: number;
  };
}

// Agent 动作消息
interface AgentAction {
  id: string;
  type: 'tool_call' | 'thinking' | 'planning';
  toolName?: string;
  parameters?: Record<string, any>;
  result?: any;
  status: 'started' | 'running' | 'completed' | 'failed';
  timestamp: number;
}

// 系统事件消息
interface SystemEvent {
  id: string;
  event:
    | 'file_changed'
    | 'project_loaded'
    | 'agent_started'
    | 'agent_stopped'
    | 'error'
    | 'query_start'
    | 'query_end';
  data: any;
  timestamp: number;
}

// 文件操作消息
interface FileOperation {
  id: string;
  operation: 'create' | 'read' | 'update' | 'delete' | 'move' | 'copy';
  path: string;
  content?: string;
  oldPath?: string;
  newPath?: string;
  success: boolean;
  error?: string;
  timestamp: number;
}

// 任务状态消息
interface TaskStatus {
  id: string;
  taskId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress?: number;
  message?: string;
  timestamp: number;
}

export class WebSocketManager {
  public readonly socketServer: SocketServer;
  private readonly options: WebSocketManagerOptions;

  constructor(opts: WebSocketManagerOptions) {
    const socketServer = new SocketServer({
      prompt: opts.prompt,
      sessionId: opts.context.sessionId,
    });
    this.socketServer = socketServer;
    this.options = opts;
  }

  public async prepare() {
    await this.socketServer.prepare();
    await this.setupWebSocketEvents();

    this.setupMessageHandlers();
  }

  private setupWebSocketEvents() {
    this.socketServer.wsServer.on('connection', (socket) => {
      socket.on('message', (message) => {
        console.log('message --->', message);
      });
    });
  }

  public async close() {
    await this.socketServer.close();
  }

  /**
   * 设置消息处理器
   */
  private setupMessageHandlers() {
    this.options.context.pluginContext.eventManager.onStreamData((data) => {
      console.log('data --->', data, data.type === 'text');
      // 处理不同类型的事件数据
      switch (data.type) {
        case 'text':
          console.log('text --->', data.content);
          // 流式处理文本消息更合适，而不是每次都作为完整消息发送
          this.sendStreamingChatMessage(data.content, data.content, false);
          break;
        case 'tool_call':
          // 工具调用需要提供更完整的参数，目前只传了result
          this.sendAgentAction({
            type: 'tool_call',
            toolName: data.metadata?.tool || 'unknown',
            parameters: data.metadata?.input,
            result: data.content,
            status: 'completed',
          });
          break;
        case 'error':
          // 应该处理错误类型的消息
          this.sendSystemEvent('error', data.content);
          break;
        default:
          console.warn('未知的事件类型:', data.type, data);
          break;
      }
    });
  }

  /**
   * 发送聊天消息到所有连接的客户端
   */
  public sendChatMessage(message: Partial<ChatMessage>) {
    const chatMessage: ChatMessage = {
      id: this.generateId(),
      timestamp: Date.now(),
      role: 'assistant',
      content: '',
      ...message,
    };

    this.socketServer.sockWrite({
      type: 'chat',
      sessionId: this.options.context.sessionId,
      data: chatMessage,
    });
  }

  /**
   * 发送流式聊天消息
   */
  public sendStreamingChatMessage(
    content: string,
    delta?: string,
    finished = false,
  ) {
    const message: ChatMessage = {
      id: this.generateId(),
      role: 'assistant',
      content,
      delta,
      streaming: !finished,
      finished,
      timestamp: Date.now(),
    };

    this.socketServer.sockWrite({
      type: 'chat',
      sessionId: this.options.context.sessionId,
      data: message,
    });
  }

  /**
   * 发送 Agent 动作消息
   */
  public sendAgentAction(action: Partial<AgentAction>) {
    const agentAction: AgentAction = {
      id: this.generateId(),
      type: 'tool_call',
      status: 'started',
      timestamp: Date.now(),
      ...action,
    };

    this.socketServer.sockWrite({
      type: 'action',
      sessionId: this.options.context.sessionId,
      data: agentAction,
    });
  }

  /**
   * 发送系统事件消息
   */
  public sendSystemEvent(event: SystemEvent['event'], data: any) {
    const systemEvent: SystemEvent = {
      id: this.generateId(),
      event,
      data,
      timestamp: Date.now(),
    };

    this.socketServer.sockWrite({
      type: 'event',
      sessionId: this.options.context.sessionId,
      data: systemEvent,
    });
  }

  /**
   * 发送文件操作消息
   */
  public sendFileOperation(operation: Partial<FileOperation>) {
    const fileOp: FileOperation = {
      id: this.generateId(),
      operation: 'read',
      path: '',
      success: true,
      timestamp: Date.now(),
      ...operation,
    };

    this.socketServer.sockWrite({
      type: 'file_op',
      sessionId: this.options.context.sessionId,
      data: fileOp,
    });
  }

  /**
   * 发送任务状态消息
   */
  public sendTaskStatus(status: Partial<TaskStatus>) {
    const taskStatus: TaskStatus = {
      id: this.generateId(),
      taskId: '',
      status: 'pending',
      timestamp: Date.now(),
      ...status,
    };

    this.socketServer.sockWrite({
      type: 'task_status',
      sessionId: this.options.context.sessionId,
      data: taskStatus,
    });
  }

  /**
   * 发送连接成功消息
   */
  public sendConnectedMessage() {
    this.socketServer.sockWrite({
      type: 'connected',
      sessionId: this.options.context.sessionId,
      data: {
        sessionId: this.options.context.sessionId,
        timestamp: Date.now(),
        message: 'WebSocket connected successfully',
      },
    });
  }

  /**
   * 广播消息到所有客户端
   */
  public broadcast(type: SockWriteType, data: any) {
    this.socketServer.sockWrite({
      type,
      sessionId: this.options.context.sessionId,
      data,
    });
  }

  /**
   * 获取连接的客户端数量
   */
  public getConnectedClientsCount(): number {
    return this.socketServer['sockets'].length;
  }

  /**
   * 检查是否有客户端连接
   */
  public hasConnectedClients(): boolean {
    return this.getConnectedClientsCount() > 0;
  }

  /**
   * 生成唯一消息 ID
   */
  private generateId(): string {
    return `msg_${Date.now()}_${randomUUID()}`;
  }
}
