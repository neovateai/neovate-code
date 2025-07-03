import { PromptCommand } from '../types';

export const readFileCommand: PromptCommand = {
  type: 'prompt',
  name: 'read-file',
  description: 'Read and print the contents of a file',
  progressMessage: 'Reading file...',
  async getPromptForCommand(args: string) {
    if (!args.trim()) {
      return [
        {
          role: 'user',
          content: 'print the file usage: /read-file <file_path>',
        },
      ];
    }

    return [
      {
        role: 'user',
        content: `print the file ${args}`,
      },
    ];
  },
};
