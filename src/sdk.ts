import type {
  NormalizedMessage,
  SDKResultMessage,
  SDKSystemMessage,
  UserContent,
} from './message';
import { DirectTransport, MessageBus } from './messageBus';
import { NodeBridge } from './nodeBridge';
import type { Plugin } from './plugin';
import { Session } from './session';
import { randomUUID } from './utils/randomUUID';

// ============================================================================
// Types
// ============================================================================

export type SDKSessionOptions = {
  model: string;
  cwd?: string;
  productName?: string;
  plugins?: Plugin[];
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
    initialParentUuid?: string | null;
  }) {
    this.sessionId = opts.sessionId;
    this.messageBus = opts.messageBus;
    this.nodeBridge = opts.nodeBridge;
    this.cwd = opts.cwd;
    this.model = opts.model;
    this.currentParentUuid = opts.initialParentUuid ?? null;

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

    // Handle session completion event for real-time streaming
    this.messageBus.onEvent('session.done', (data) => {
      if (data.sessionId !== this.sessionId) return;
      this.enqueueEvent({ type: 'result', data: data.result });
      this.enqueueEvent({ type: 'done' });
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

    // Fire request without awaiting - runs in background
    this.messageBus
      .request('session.send', {
        message: content,
        cwd: this.cwd,
        sessionId: this.sessionId,
        model: this.model,
        parentUuid,
        uuid,
      })
      .catch((error) => {
        // Fallback if session.done event not received
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
        this.enqueueEvent({ type: 'done' });
      });

    // Returns immediately
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

export async function prompt(
  message: string,
  options: SDKSessionOptions,
): Promise<SDKResultMessage> {
  await using session = await createSession(options);
  await session.send(message);
  for await (const msg of session.receive()) {
    if (msg.type === 'result') {
      return msg;
    }
  }
  throw new Error('No result received');
}

/**
 * Internal helper to create the NodeBridge/MessageBus pair
 */
function createBridgePair(options: SDKSessionOptions): {
  nodeBridge: NodeBridge;
  messageBus: MessageBus;
} {
  const productName = options.productName || 'neovate';

  const nodeBridge = new NodeBridge({
    contextCreateOpts: {
      productName,
      version: '0.0.0',
      argvConfig: {
        model: options.model,
      },
      plugins: options.plugins || [],
    },
  });

  const [sdkTransport, nodeTransport] = DirectTransport.createPair();

  const messageBus = new MessageBus();
  messageBus.setTransport(sdkTransport);
  nodeBridge.messageBus.setTransport(nodeTransport);

  messageBus.registerHandler('toolApproval', async () => {
    return { approved: true };
  });

  return { nodeBridge, messageBus };
}

export async function createSession(
  options: SDKSessionOptions,
): Promise<SDKSession> {
  const cwd = options.cwd || process.cwd();
  const sessionId = Session.createSessionId();

  const { nodeBridge, messageBus } = createBridgePair(options);

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

export async function resumeSession(
  sessionId: string,
  options: SDKSessionOptions,
): Promise<SDKSession> {
  const cwd = options.cwd || process.cwd();

  const { nodeBridge, messageBus } = createBridgePair(options);

  await messageBus.request('session.initialize', {
    cwd,
    sessionId,
  });

  // Load messages to validate session exists and get last UUID
  const messagesResult = await messageBus.request('session.messages.list', {
    cwd,
    sessionId,
  });

  if (!messagesResult.success) {
    throw new Error(`Session '${sessionId}' not found`);
  }

  const messages = messagesResult.data?.messages || [];

  // If no messages found, the session doesn't exist
  // (session.initialize creates a new session if it doesn't exist)
  if (messages.length === 0) {
    throw new Error(`Session '${sessionId}' not found`);
  }

  // Extract the last message UUID for proper chaining
  const lastMessage = messages[messages.length - 1];
  const lastUuid = lastMessage?.uuid || null;

  return new SDKSessionImpl({
    sessionId,
    messageBus,
    nodeBridge,
    cwd,
    model: options.model,
    initialParentUuid: lastUuid,
  });
}
