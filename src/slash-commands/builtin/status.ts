import { PluginHookType } from '../../plugin';
import { LocalCommand } from '../types';

export const statusCommand: LocalCommand = {
  type: 'local',
  name: 'status',
  description: 'Show status',
  async call(_args: string, context) {
    const status = await context.apply({
      hook: 'status',
      args: [],
      memo: {
        [`${context.productName}`]: {
          description: `v${context.version}`,
          items: [],
        },
        'Working Directory': {
          items: [context.cwd],
        },
        Model: {
          items: [context.config.model],
        },
      },
      type: PluginHookType.SeriesMerge,
    });
    const statusStr = Object.entries(status)
      .map(([key, value]: any) => {
        const description = value.description ? ` ${value.description}` : '';
        return `${key}${description}\n${value.items.map((item: any) => `  ${item}`).join('\n')}`;
      })
      .join('\n\n');
    return statusStr;
  },
};
