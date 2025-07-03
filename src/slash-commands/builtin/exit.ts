import { LocalCommand } from '../types';

export const exitCommand: LocalCommand = {
  type: 'local',
  name: 'exit',
  description: 'Exit the application',
  async call(args: string, context) {
    await context.destroy();
    setTimeout(() => {
      process.exit(0);
    }, 100);
    return 'Exiting...';
  },
};
