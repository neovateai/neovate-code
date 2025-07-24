import pc from 'picocolors';
import { LocalCommand } from '../types';

export const stagewiseCommand: LocalCommand = {
  type: 'local',
  name: 'stagewise',
  description: 'Show stagewise status',
  async call(args: string, context) {
    if (!context.stagewisePort) {
      return 'Stagewise is not running.';
    }

    return `Stagewise is running 🚀\nPort: ${pc.green(
      context.stagewisePort.toString(),
    )}\nStatus: ${pc.cyan('Connected')}\n\nYou can interact through the Stagewise plugin by connecting to this port.`;
  },
};
