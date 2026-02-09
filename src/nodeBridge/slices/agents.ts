import type { Context } from '../../context';
import type { MessageBus } from '../../messageBus';

export function registerAgentsHandlers(
  messageBus: MessageBus,
  getContext: (cwd: string) => Promise<Context>,
) {
  messageBus.registerHandler('agents.list', async (data) => {
    const { cwd } = data;
    try {
      const context = await getContext(cwd);
      const agents = context.agentManager?.getAllAgents() ?? [];
      return {
        success: true,
        data: {
          agents: agents.map((agent) => ({
            agentType: agent.agentType,
            description: agent.whenToUse.split('\n')[0],
            color: agent.color,
          })),
        },
      };
    } catch (error: any) {
      return {
        success: false,
        data: {
          agents: [],
        },
        error: error.message || 'Failed to list agents',
      };
    }
  });
}
