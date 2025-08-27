import { MessageBus } from './messageBus';

export class UIBridge {
  messageBus: MessageBus;
  constructor() {
    this.messageBus = new MessageBus();
    new UIHandlerRegistry(this.messageBus);
  }
  request(method: string, params: any) {
    return this.messageBus.request(method, params);
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
