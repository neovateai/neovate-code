import type {
  AssistantMessage,
  NormalizedMessage,
  SDKResultMessage,
  SDKSystemMessage,
  UserContent,
} from './message';
import { DirectTransport, MessageBus } from './messageBus';
import { NodeBridge } from './nodeBridge';
import { Session } from './session';
import { randomUUID } from './utils/randomUUID';

// ============================================================================
// Types
// ============================================================================

export type SDKSessionOptions = {
  model: string;
  cwd?: string;
  productName?: string;
};

export type SDKUserMessage = {
  type: 'user';
  message: UserContent;
  parentUuid: string | null;
  uuid: string;
  sessionId: string;
};

export type SDKMessage =
  | NormalizedMessage
  | SDKSystemMessage
  | SDKResultMessage;

export interface SDKSession {
  readonly sessionId: string;
  send(message: string | SDKUserMessage): Promise<void>;
  receive(): AsyncGenerator<SDKMessage, void>;
  close(): void;
  [Symbol.asyncDispose](): Promise<void>;
}

// ============================================================================
// Internal Types
// ============================================================================

type InternalEvent =
  | { type: 'message'; data: NormalizedMessage }
  | { type: 'result'; data: SDKResultMessage }
  | { type: 'done' };

// ============================================================================
// Implementation
// ============================================================================

class SDKSessionImpl implements SDKSession {
  readonly sessionId: string;
  private messageBus: MessageBus;
  private nodeBridge: NodeBridge;
  private cwd: string;
  private model: string;
  private eventQueue: InternalEvent[] = [];
  private eventResolvers: Array<(value: InternalEvent | null) => void> = [];
  private isClosed = false;
  private currentParentUuid: string | null = null;

  constructor(opts: {
    sessionId: string;
    messageBus: MessageBus;
    nodeBridge: NodeBridge;
    cwd: string;
    model: string;
  }) {
    this.sessionId = opts.sessionId;
    this.messageBus = opts.messageBus;
    this.nodeBridge = opts.nodeBridge;
    this.cwd = opts.cwd;
    this.model = opts.model;

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.messageBus.onEvent('message', (data) => {
      if (data.sessionId !== this.sessionId) return;
      const msg = data.message as NormalizedMessage;
      if (msg.type === 'message') {
        this.enqueueEvent({ type: 'message', data: msg });
        if (msg.uuid) {
          this.currentParentUuid = msg.uuid;
        }
      }
    });
  }

  private enqueueEvent(event: InternalEvent) {
    if (this.eventResolvers.length > 0) {
      const resolver = this.eventResolvers.shift()!;
      resolver(event);
    } else {
      this.eventQueue.push(event);
    }
  }

  private async waitForEvent(): Promise<InternalEvent | null> {
    if (this.isClosed) return null;

    if (this.eventQueue.length > 0) {
      return this.eventQueue.shift()!;
    }

    return new Promise<InternalEvent | null>((resolve) => {
      this.eventResolvers.push(resolve);
    });
  }

  async send(message: string | SDKUserMessage): Promise<void> {
    if (this.isClosed) {
      throw new Error('Session is closed');
    }

    let content: UserContent;
    let parentUuid: string | null;
    let uuid: string;

    if (typeof message === 'string') {
      content = message;
      parentUuid = this.currentParentUuid;
      uuid = randomUUID();
    } else {
      content = message.message;
      parentUuid = message.parentUuid;
      uuid = message.uuid;
    }

    this.currentParentUuid = uuid;

    try {
      const result = await this.messageBus.request('session.send', {
        message: content,
        cwd: this.cwd,
        sessionId: this.sessionId,
        model: this.model,
        parentUuid,
        uuid,
      });

      if (result.success) {
        this.enqueueEvent({
          type: 'result',
          data: {
            type: 'result',
            subtype: 'success',
            isError: false,
            content: '',
            sessionId: this.sessionId,
            usage: result.usage,
          },
        });
      } else {
        this.enqueueEvent({
          type: 'result',
          data: {
            type: 'result',
            subtype: 'error',
            isError: true,
            content: result.error?.message || 'Unknown error occurred',
            sessionId: this.sessionId,
          },
        });
      }
    } catch (error) {
      this.enqueueEvent({
        type: 'result',
        data: {
          type: 'result',
          subtype: 'error',
          isError: true,
          content: error instanceof Error ? error.message : String(error),
          sessionId: this.sessionId,
        },
      });
    }

    this.enqueueEvent({ type: 'done' });
  }

  async *receive(): AsyncGenerator<SDKMessage, void> {
    const systemMessage: SDKSystemMessage = {
      type: 'system',
      subtype: 'init',
      sessionId: this.sessionId,
      model: this.model,
      cwd: this.cwd,
      tools: [],
    };
    yield systemMessage;

    while (!this.isClosed) {
      const event = await this.waitForEvent();
      if (!event) break;

      if (event.type === 'message') {
        yield event.data;
      } else if (event.type === 'result') {
        yield event.data;
      } else if (event.type === 'done') {
        return;
      }
    }
  }

  close(): void {
    if (this.isClosed) return;
    this.isClosed = true;

    for (const resolver of this.eventResolvers) {
      resolver(null);
    }
    this.eventResolvers = [];
    this.eventQueue = [];
  }

  async [Symbol.asyncDispose](): Promise<void> {
    this.close();
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export async function createSession(
  options: SDKSessionOptions,
): Promise<SDKSession> {
  const cwd = options.cwd || process.cwd();
  const productName = options.productName || 'neovate';
  const sessionId = Session.createSessionId();

  const nodeBridge = new NodeBridge({
    contextCreateOpts: {
      productName,
      version: '0.0.0',
      argvConfig: {
        model: options.model,
      },
      plugins: [],
    },
  });

  const [sdkTransport, nodeTransport] = DirectTransport.createPair();

  const messageBus = new MessageBus();
  messageBus.setTransport(sdkTransport);
  nodeBridge.messageBus.setTransport(nodeTransport);

  messageBus.registerHandler('toolApproval', async () => {
    return { approved: true };
  });

  await messageBus.request('session.initialize', {
    cwd,
    sessionId,
  });

  return new SDKSessionImpl({
    sessionId,
    messageBus,
    nodeBridge,
    cwd,
    model: options.model,
  });
}
