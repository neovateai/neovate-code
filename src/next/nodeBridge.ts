import { MessageBus } from './messageBus';
import { Project } from './project';

export class NodeBridge {
  messageBus: MessageBus;
  constructor() {
    this.messageBus = new MessageBus();
    new NodeHandlerRegistry(this.messageBus);
  }
}

class NodeHandlerRegistry {
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
