import fs from 'fs/promises';
import path from 'pathe';
import { Plugin } from '../pluginManager/types';
import { PluginContext } from '../types';
import { logDebug, logError } from '../utils/logger';

// TODO: Need to support @src
const FILE_PATTERN = /@([^\s"]+(?:\.[a-zA-Z0-9]+|\/[^\s"]+))(?:\s|"|$)/g;

const IGNORE_KEYWORDS = ['@codebase', '@bigfish'];

export const fileContextPlugin: Plugin = {
  name: 'file-context',
  async contextStart(this: PluginContext, { prompt }) {
    if (!prompt) {
      return;
    }

    if (
      prompt.includes('@') &&
      !IGNORE_KEYWORDS.some((keyword) => prompt.includes(keyword))
    ) {
      const files = prompt.match(FILE_PATTERN);
      if (files) {
        const promptsFiles = (
          await Promise.all(
            files.map(async (file) => {
              if (!file || !file.startsWith('@')) {
                return null;
              }
              const cleanPath = file.replace('@', '').trim();
              const filePath = path.resolve(this.cwd, cleanPath);
              try {
                const stat = await fs.stat(filePath);
                return stat.isFile() || stat.isDirectory() ? filePath : null;
              } catch (error: any) {
                logError(
                  `[file-context] File path does not exist: ${filePath}, error: ${error.message}`,
                );
                return null;
              }
            }),
          )
        ).filter((item) => item !== null);

        if (promptsFiles.length > 0) {
          logDebug(
            `[file-context] Detected file references: ${promptsFiles.join(', ')}`,
          );
          this.config.files = promptsFiles;
        } else {
          logDebug(`[file-context] No file references detected`);
        }
      }
    }
  },
};
