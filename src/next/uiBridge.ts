import { type EventHandler, MessageBus } from './messageBus';
import type { AppStore } from './ui/store';

export class UIBridge {
  appStore: AppStore;
  messageBus: MessageBus;
  constructor(opts: { appStore: AppStore }) {
    this.appStore = opts.appStore;
    this.messageBus = new MessageBus();
    new UIHandlerRegistry(this.messageBus);
  }
  request(method: string, params: any, options: { timeout?: number } = {}) {
    return this.messageBus.request(method, params, options);
  }
  emitEvent(event: string, data: any) {
    return this.messageBus.emitEvent(event, data);
  }
  onEvent(event: string, handler: EventHandler) {
    return this.messageBus.onEvent(event, handler);
  }
}

class UIHandlerRegistry {
  private messageBus: MessageBus;
  constructor(messageBus: MessageBus) {
    this.messageBus = messageBus;
    this.registerHandlers();
  }

  private registerHandlers() {
    this.messageBus.registerHandler('list_models', async () => {
      return { models: ['a', 'b'] };
    });
  }
}
