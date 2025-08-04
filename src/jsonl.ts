import { WriteStream, createWriteStream, existsSync, mkdirSync } from 'fs';
import { dirname, resolve } from 'path';
import { randomUUID } from './utils/randomUUID';

interface MessageContent {
  type: 'text' | 'tool_use' | 'tool_result';
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, any>;
  content?: string;
  is_error?: boolean;
  tool_use_id?: string;
}

interface Usage {
  input_tokens: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
  output_tokens: number;
  service_tier?: string;
}

interface UserMessage {
  role: 'user';
  content: string | MessageContent[];
}

interface AssistantMessage {
  id: string;
  type: 'message';
  role: 'assistant';
  model: string;
  content: MessageContent[];
  stop_reason: string | null;
  stop_sequence: string | null;
  usage: Usage;
}

type Message = UserMessage | AssistantMessage;

interface LogEntry {
  parentUuid: string | null;
  isSidechain: boolean;
  userType: string;
  cwd: string;
  sessionId: string;
  version: string;
  gitBranch: string;
  type: 'user' | 'assistant';
  message: Message;
  uuid: string;
  timestamp: string;
  requestId?: string;
  toolUseResult?: any;
}

interface JsonlLoggerConfig {
  filePath: string;
  sessionId?: string;
  version?: string;
  userType?: string;
  cwd?: string;
  gitBranch?: string;
}

interface MetadataUpdate {
  cwd?: string;
  gitBranch?: string;
  version?: string;
}

interface ToolUseResult {
  stdout?: string;
  stderr?: string;
  interrupted?: boolean;
  isImage?: boolean;
  [key: string]: any;
}

// Format compatible with claude-code
export class JsonlLogger {
  private static readonly DEFAULT_VERSION = '1.0.0';
  private static readonly DEFAULT_USER_TYPE = 'external';
  private static readonly DEFAULT_MODEL = '';
  private static readonly DEFAULT_SERVICE_TIER = 'standard';

  private writeStream: WriteStream;
  private sessionId: string;
  private version: string;
  private userType: string;
  private cwd: string;
  private gitBranch: string;
  private lastUuid: string | null = null;

  constructor(config: JsonlLoggerConfig) {
    const safePath = this.validateAndCreatePath(config.filePath);

    try {
      this.writeStream = createWriteStream(safePath, { flags: 'a' });
      this.setupStreamErrorHandling();
    } catch (error) {
      throw new Error(
        `Failed to create log file at ${safePath}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }

    this.sessionId = config.sessionId || randomUUID();
    this.version = config.version || JsonlLogger.DEFAULT_VERSION;
    this.userType = config.userType || JsonlLogger.DEFAULT_USER_TYPE;
    this.cwd = config.cwd || process.cwd();
    this.gitBranch = config.gitBranch || '';
  }

  private validateAndCreatePath(filePath: string): string {
    const safePath = resolve(filePath);
    const dir = dirname(safePath);

    if (!existsSync(dir)) {
      try {
        mkdirSync(dir, { recursive: true });
      } catch (error) {
        throw new Error(
          `Failed to create directory ${dir}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    return safePath;
  }

  private setupStreamErrorHandling(): void {
    this.writeStream.on('error', (error) => {
      console.error('LogWriter stream error:', error);
    });
  }

  writeUserMessage(content: string | MessageContent[]): string {
    const uuid = randomUUID();
    const entry: LogEntry = {
      parentUuid: this.lastUuid,
      isSidechain: false,
      userType: this.userType,
      cwd: this.cwd,
      sessionId: this.sessionId,
      version: this.version,
      gitBranch: this.gitBranch,
      type: 'user',
      message: {
        role: 'user',
        content,
      },
      uuid,
      timestamp: new Date().toISOString(),
    };

    this.writeEntry(entry);
    this.lastUuid = uuid;
    return uuid;
  }

  writeAssistantMessage(
    content: MessageContent[],
    options: {
      id?: string;
      model?: string;
      stopReason?: string | null;
      stopSequence?: string | null;
      usage?: Usage;
      requestId?: string;
    } = {},
  ): string {
    const uuid = randomUUID();
    const entry: LogEntry = {
      parentUuid: this.lastUuid,
      isSidechain: false,
      userType: this.userType,
      cwd: this.cwd,
      sessionId: this.sessionId,
      version: this.version,
      gitBranch: this.gitBranch,
      type: 'assistant',
      message: {
        id: options.id || `msg_${randomUUID()}`,
        type: 'message',
        role: 'assistant',
        model: options.model || JsonlLogger.DEFAULT_MODEL,
        content,
        stop_reason: options.stopReason || null,
        stop_sequence: options.stopSequence || null,
        usage: options.usage || {
          input_tokens: 0,
          output_tokens: 0,
          service_tier: JsonlLogger.DEFAULT_SERVICE_TIER,
        },
      },
      uuid,
      timestamp: new Date().toISOString(),
      requestId: options.requestId,
    };

    this.writeEntry(entry);
    this.lastUuid = uuid;
    return uuid;
  }

  writeToolResult(
    toolUseId: string,
    content: string,
    isError: boolean = false,
    toolUseResult?: ToolUseResult,
  ): string {
    const uuid = randomUUID();
    const entry: LogEntry = {
      parentUuid: this.lastUuid,
      isSidechain: false,
      userType: this.userType,
      cwd: this.cwd,
      sessionId: this.sessionId,
      version: this.version,
      gitBranch: this.gitBranch,
      type: 'user',
      message: {
        role: 'user',
        content: [
          {
            type: 'tool_result',
            content,
            is_error: isError,
            tool_use_id: toolUseId,
          },
        ],
      },
      uuid,
      timestamp: new Date().toISOString(),
      toolUseResult,
    };

    this.writeEntry(entry);
    this.lastUuid = uuid;
    return uuid;
  }

  private writeEntry(entry: LogEntry): void {
    const jsonLine = JSON.stringify(entry) + '\n';
    this.writeStream.write(jsonLine);
  }

  setParentUuid(uuid: string | null): void {
    this.lastUuid = uuid;
  }

  getLastUuid(): string | null {
    return this.lastUuid;
  }

  getSessionId(): string {
    return this.sessionId;
  }

  updateMetadata(updates: MetadataUpdate): void {
    if (updates.cwd) this.cwd = updates.cwd;
    if (updates.gitBranch) this.gitBranch = updates.gitBranch;
    if (updates.version) this.version = updates.version;
  }

  close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.writeStream.end((error?: Error) => {
        if (error) {
          reject(new Error(`Failed to close log stream: ${error.message}`));
        } else {
          resolve();
        }
      });
    });
  }
}
