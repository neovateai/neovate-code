import type { Context } from '../../context';
import type { MessageBus } from '../../messageBus';

export function registerGlobalDataHandlers(
  messageBus: MessageBus,
  getContext: (cwd: string) => Promise<Context>,
) {
  messageBus.registerHandler('globalData.recentModels.get', async (data) => {
    const { cwd } = data;
    const context = await getContext(cwd);
    const recentModels = context.globalData.getRecentModels();
    return {
      success: true,
      data: {
        recentModels,
      },
    };
  });

  messageBus.registerHandler('globalData.recentModels.add', async (data) => {
    const { cwd, model } = data;
    const context = await getContext(cwd);
    const maxStorage = (context.config.recentModels ?? 10) + 10;
    context.globalData.addRecentModel(model, maxStorage);
    return {
      success: true,
    };
  });
}
