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
  text: string;
  attachments?: Array<{
    type: 'image';
    data: string;
    mimeType: string;
  }>;
};

export type SDKMessage =
  | { type: 'text'; text: string }
  | { type: 'thinking'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, any> }
  | {
      type: 'tool_result';
      id: string;
      name: string;
      result: any;
      isError: boolean;
    }
  | { type: 'done'; usage: { inputTokens: number; outputTokens: number } }
  | { type: 'error'; message: string };

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

type QueuedEvent =
  | { type: 'message'; data: any }
  | { type: 'textDelta'; data: any }
  | { type: 'chunk'; data: any }
  | { type: 'streamResult'; data: any }
  | { type: 'done'; usage: { inputTokens: number; outputTokens: number } }
  | { type: 'error'; message: string };

// ============================================================================
// Implementation
// ============================================================================

class SDKSessionImpl implements SDKSession {
  readonly sessionId: string;
  private messageBus: MessageBus;
  private nodeBridge: NodeBridge;
  private cwd: string;
  private model: string;
  private eventQueue: QueuedEvent[] = [];
  private eventResolvers: Array<(value: QueuedEvent | null) => void> = [];
  private isClosed = false;
  private isProcessing = false;
  private accumulatedText = '';
  private accumulatedThinking = '';
  private totalUsage = { inputTokens: 0, outputTokens: 0 };

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
    // Listen for message events
    this.messageBus.onEvent('message', (data) => {
      if (data.sessionId !== this.sessionId) return;
      this.enqueueEvent({ type: 'message', data: data.message });
    });

    // Listen for text delta events
    this.messageBus.onEvent('textDelta', (data) => {
      if (data.sessionId !== this.sessionId) return;
      this.enqueueEvent({ type: 'textDelta', data });
    });

    // Listen for chunk events
    this.messageBus.onEvent('chunk', (data) => {
      if (data.sessionId !== this.sessionId) return;
      this.enqueueEvent({ type: 'chunk', data });
    });

    // Listen for stream result events
    this.messageBus.onEvent('streamResult', (data) => {
      if (data.sessionId !== this.sessionId) return;
      this.enqueueEvent({ type: 'streamResult', data });
    });
  }

  private enqueueEvent(event: QueuedEvent) {
    if (this.eventResolvers.length > 0) {
      const resolver = this.eventResolvers.shift()!;
      resolver(event);
    } else {
      this.eventQueue.push(event);
    }
  }

  private async waitForEvent(): Promise<QueuedEvent | null> {
    if (this.isClosed) return null;

    if (this.eventQueue.length > 0) {
      return this.eventQueue.shift()!;
    }

    return new Promise<QueuedEvent | null>((resolve) => {
      this.eventResolvers.push(resolve);
    });
  }

  async send(message: string | SDKUserMessage): Promise<void> {
    if (this.isClosed) {
      throw new Error('Session is closed');
    }

    const text = typeof message === 'string' ? message : message.text;
    const attachments =
      typeof message === 'string' ? undefined : message.attachments;

    // Reset state for new message
    this.accumulatedText = '';
    this.accumulatedThinking = '';
    this.totalUsage = { inputTokens: 0, outputTokens: 0 };
    this.isProcessing = true;

    // Send the message through the message bus
    try {
      const result = await this.messageBus.request('session.send', {
        message: text,
        cwd: this.cwd,
        sessionId: this.sessionId,
        model: this.model,
        attachments,
      });

      // After session.send completes, emit done event
      if (result.success) {
        this.enqueueEvent({
          type: 'done',
          usage: this.totalUsage,
        });
      } else {
        this.enqueueEvent({
          type: 'error',
          message: result.error?.message || 'Unknown error occurred',
        });
      }
    } catch (error) {
      this.enqueueEvent({
        type: 'error',
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      this.isProcessing = false;
    }
  }

  async *receive(): AsyncGenerator<SDKMessage, void> {
    while (!this.isClosed) {
      const event = await this.waitForEvent();
      if (!event) break;

      const messages = this.processEvent(event);
      for (const msg of messages) {
        yield msg;
        if (msg.type === 'done' || msg.type === 'error') {
          return;
        }
      }
    }
  }

  private processEvent(event: QueuedEvent): SDKMessage[] {
    const messages: SDKMessage[] = [];

    switch (event.type) {
      case 'textDelta': {
        // Accumulate text deltas and yield them
        if (event.data.text) {
          this.accumulatedText += event.data.text;
          messages.push({ type: 'text', text: event.data.text });
        }
        break;
      }

      case 'chunk': {
        const chunk = event.data.chunk;
        if (!chunk) break;

        // Handle different chunk types
        if (chunk.type === 'text-delta' && chunk.textDelta) {
          this.accumulatedText += chunk.textDelta;
          messages.push({ type: 'text', text: chunk.textDelta });
        } else if (chunk.type === 'reasoning' && chunk.textDelta) {
          this.accumulatedThinking += chunk.textDelta;
          messages.push({ type: 'thinking', text: chunk.textDelta });
        } else if (chunk.type === 'tool-call') {
          messages.push({
            type: 'tool_use',
            id: chunk.toolCallId,
            name: chunk.toolName,
            input: chunk.args || {},
          });
        }
        break;
      }

      case 'message': {
        const msg = event.data;
        if (!msg) break;

        // Handle assistant messages with tool_use content
        if (msg.role === 'assistant' && Array.isArray(msg.content)) {
          for (const part of msg.content) {
            if (part.type === 'tool_use') {
              messages.push({
                type: 'tool_use',
                id: part.id,
                name: part.name,
                input: part.input || {},
              });
            } else if (part.type === 'reasoning' && part.text) {
              messages.push({ type: 'thinking', text: part.text });
            }
          }

          // Update usage stats
          if (msg.usage) {
            this.totalUsage.inputTokens += msg.usage.input_tokens || 0;
            this.totalUsage.outputTokens += msg.usage.output_tokens || 0;
          }
        }

        // Handle tool result messages
        if (msg.role === 'tool' && Array.isArray(msg.content)) {
          for (const part of msg.content) {
            if (part.type === 'tool-result') {
              messages.push({
                type: 'tool_result',
                id: part.toolCallId,
                name: part.toolName,
                result: part.result?.llmContent || part.result,
                isError: part.result?.isError || false,
              });
            }
          }
        }
        break;
      }

      case 'streamResult': {
        // Stream result contains model info and request/response details
        // We mainly use this for debugging, but can extract usage if needed
        break;
      }

      case 'done': {
        messages.push({
          type: 'done',
          usage: event.usage,
        });
        break;
      }

      case 'error': {
        messages.push({
          type: 'error',
          message: event.message,
        });
        break;
      }
    }

    return messages;
  }

  close(): void {
    if (this.isClosed) return;
    this.isClosed = true;

    // Resolve any pending waiters
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

/**
 * Creates a new SDK session for programmatic interaction with the AI agent.
 *
 * @example
 * ```typescript
 * const session = await createSession({ model: 'anthropic/claude-sonnet-4-20250514' });
 *
 * await session.send("List files in current directory");
 *
 * for await (const msg of session.receive()) {
 *   if (msg.type === 'text') console.log(msg.text);
 *   if (msg.type === 'done') break;
 * }
 *
 * session.close();
 * ```
 */
export async function createSession(
  options: SDKSessionOptions,
): Promise<SDKSession> {
  const cwd = options.cwd || process.cwd();
  const productName = options.productName || 'neovate';
  const sessionId = Session.createSessionId();

  // Create NodeBridge with context creation options
  const nodeBridge = new NodeBridge({
    contextCreateOpts: {
      productName,
      version: '0.0.0', // SDK sessions don't need version
      argvConfig: {
        model: options.model,
      },
      plugins: [],
    },
  });

  // Create paired DirectTransport for communication
  const [sdkTransport, nodeTransport] = DirectTransport.createPair();

  // Create message bus for the SDK side
  const messageBus = new MessageBus();
  messageBus.setTransport(sdkTransport);
  nodeBridge.messageBus.setTransport(nodeTransport);

  // Register tool approval handler that auto-approves everything
  messageBus.registerHandler('toolApproval', async () => {
    return { approved: true };
  });

  // Initialize the session
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
