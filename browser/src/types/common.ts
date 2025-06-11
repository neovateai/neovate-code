// WebSocket 消息基础接口
export interface BaseMessage {
  id: string;
  timestamp: number;
  type: string;
  source?: 'user' | 'agent' | 'system';
}

// 聊天消息（支持流式输出）
export interface ChatMessage extends BaseMessage {
  type: 'chat';
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
  delta?: string; // 流式输出的增量内容
  finished?: boolean;
  tokenUsage?: {
    totalTokens: number;
    promptTokens: number;
    completionTokens: number;
  };
}

// Agent 动作消息
export interface AgentAction extends BaseMessage {
  type: 'action';
  action:
    | 'read_file'
    | 'write_file'
    | 'run_command'
    | 'browse_web'
    | 'search_code';
  args: Record<string, any>;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: any;
  error?: string;
  queryId?: string;
  executionTime?: number;
}

// 系统事件消息
export interface SystemEvent extends BaseMessage {
  type: 'event';
  event:
    | 'file_changed'
    | 'project_loaded'
    | 'agent_started'
    | 'agent_stopped'
    | 'error'
    | 'query_start'
    | 'query_end';
  data: any;
}

// 文件操作消息
export interface FileOperation extends BaseMessage {
  type: 'file_op';
  operation: 'create' | 'update' | 'delete' | 'move' | 'copy';
  path: string;
  content?: string;
  oldPath?: string;
  diff?: string;
  oldContent?: string;
  newContent?: string;
}

// 任务状态消息
export interface TaskStatus extends BaseMessage {
  type: 'task_status';
  taskId: string;
  status: 'created' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress?: number;
  description?: string;
  result?: any;
  error?: string;
}

// 会话信息消息
export interface SessionInfo extends BaseMessage {
  type: 'session_info';
  data: {
    sessionId: string;
    config: any;
    workingDirectory: string;
    availableTools: string[];
    mcpClients: string[];
  };
}

// 联合消息类型
export type WebSocketMessage =
  | ChatMessage
  | AgentAction
  | SystemEvent
  | FileOperation
  | TaskStatus
  | SessionInfo;

// Agent 状态
export interface AgentState {
  id: string;
  status: 'idle' | 'running' | 'error';
  currentAction?: string;
  progress?: number;
  error?: string;
}

// 任务状态
export interface TaskState {
  id: string;
  status: 'created' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  description: string;
  result?: any;
  error?: string;
}

// WebSocket 连接状态
export enum WebSocketReadyState {
  CONNECTING = 0,
  OPEN = 1,
  CLOSING = 2,
  CLOSED = 3,
}

// 消息处理器接口
export interface MessageHandler {
  onChatMessage(message: ChatMessage): void;
  onAgentAction(message: AgentAction): void;
  onSystemEvent(message: SystemEvent): void;
  onFileOperation(message: FileOperation): void;
  onTaskStatus(message: TaskStatus): void;
  onSessionInfo(message: SessionInfo): void;
}

// 应用配置
export interface AppConfig {
  apiBaseUrl: string;
  wsUrl: string;
  theme: 'light' | 'dark';
  language: 'zh-CN' | 'en-US';
}

// 文件信息
export interface FileInfo {
  path: string;
  name: string;
  size: number;
  type: 'file' | 'directory';
  lastModified: number;
  content?: string;
}

// 会话信息
export interface Session {
  id: string;
  name: string;
  createdAt: number;
  lastActiveAt: number;
  messageCount: number;
  status: 'active' | 'inactive';
}
