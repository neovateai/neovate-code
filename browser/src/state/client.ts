import { proxy } from 'valtio';
import { MessageBus, WebSocketTransport } from '@/client';

export type ApprovalResult =
  | 'approve_once'
  | 'approve_always_edit'
  | 'approve_always_tool'
  | 'deny';

export type ToolUse = {
  name: string;
  params: Record<string, any>;
  callId: string;
};

export type ApprovalCategory = 'read' | 'write' | 'command' | 'network';

export interface ClientState {
  state: 'disconnected' | 'connecting' | 'connected' | 'error' | 'closed';
  transport: WebSocketTransport | null;
  messageBus: MessageBus | null;
  approvalModal: {
    toolUse: ToolUse;
    category: ApprovalCategory;
    resolve: (result: ApprovalResult) => Promise<void>;
  } | null;
}

export const state = proxy<ClientState>({
  state: 'disconnected',
  transport: null,
  messageBus: null,
  approvalModal: null,
});

export const actions = {
  async connect() {
    if (state.transport?.isConnected()) {
      return;
    }

    try {
      state.state = 'connecting';
      const transport = new WebSocketTransport({
        url: `ws://${window.location.hostname}:${window.location.port}/ws`,
        reconnectInterval: 1000,
        maxReconnectInterval: 30000,
        shouldReconnect: true,
      });

      transport.onError(() => {
        state.state = 'error';
      });

      transport.onClose(() => {
        state.state = 'disconnected';
      });

      const messageBus = new MessageBus();
      messageBus.setTransport(transport);

      state.transport = transport;
      state.messageBus = messageBus;

      await transport.connect();

      state.state = 'connected';
    } catch (error) {
      state.state = 'error';
      throw error;
    }
  },

  toolApproval(
    handler: (
      toolUse: ToolUse,
      category: ApprovalCategory,
    ) => Promise<{
      approved: boolean;
    }>,
  ) {
    if (!state.messageBus) {
      throw new Error('Message bus not available');
    }
    state.messageBus.registerHandler(
      'toolApproval',
      async ({
        toolUse,
        category,
      }: {
        toolUse: ToolUse;
        category: ApprovalCategory;
      }) => {
        const result = await handler(toolUse, category);
        return { approved: result.approved };
      },
    );
  },

  async disconnect() {
    if (state.transport?.isConnected()) {
      await state.transport.close();
    }
    if (state.messageBus) {
      state.messageBus.cancelPendingRequests();
    }
    state.state = 'disconnected';
    state.transport = null;
    state.messageBus = null;
  },

  async request<T = unknown, R = unknown>(
    method: string,
    params: T,
  ): Promise<R> {
    if (!state.messageBus) {
      throw new Error('Message bus not available');
    }
    return state.messageBus.request<T, R>(method, params);
  },

  onEvent<T = unknown>(event: string, handler: (data: T) => void) {
    if (!state.messageBus) {
      throw new Error('Message bus not available');
    }
    state.messageBus.onEvent(event, handler);
  },

  removeEventHandler<T = unknown>(event: string, handler: (data: T) => void) {
    if (!state.messageBus) {
      throw new Error('Message bus not available');
    }
    state.messageBus.removeEventHandler(event, handler);
  },

  unmount() {
    if (state.transport) {
      state.transport.close();
    }
    if (state.messageBus) {
      state.messageBus.cancelPendingRequests();
    }
    state.state = 'disconnected';
    state.transport = null;
    state.messageBus = null;
  },
};
