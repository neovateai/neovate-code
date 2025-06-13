import EventEmitter from 'node:events';

interface PluginStreamData {
  sessionId: string;
  content: string;
  metadata?: Record<string, any>;
  type?: 'text' | 'tool_call' | 'error';
}

export class EventManager extends EventEmitter {
  private static instance: EventManager;
  private sessionId: string;

  constructor(opts: { sessionId: string }) {
    super();
    this.sessionId = opts.sessionId;
  }

  static getInstance(sessionId: string): EventManager {
    if (!EventManager.instance) {
      EventManager.instance = new EventManager({
        sessionId,
      });
    }
    return EventManager.instance;
  }

  sendToStream(data: PluginStreamData) {
    this.emit(`stream:${this.sessionId}`, data);
  }

  onStreamData(callback: (data: PluginStreamData) => void) {
    this.on(`stream:${this.sessionId}`, callback);
  }

  removeStreamListener() {
    this.removeAllListeners(`stream:${this.sessionId}`);
  }
}
