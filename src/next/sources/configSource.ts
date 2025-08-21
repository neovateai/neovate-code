import fs from 'fs';
import path from 'path';
import { type Config, ConfigManager } from '../../config';
import { type SourceOptions } from '../dataSource';

export interface ConfigData {
  globalConfig: Partial<Config>;
  projectConfig: Partial<Config>;
  mergedConfig: Config;
  globalConfigPath: string;
  projectConfigPath: string;
}

export function createConfigSource(
  cwd: string,
  productName: string,
  argvConfig: Partial<Config> = {},
): SourceOptions<ConfigData> {
  let configManager: ConfigManager;
  let watchers: fs.FSWatcher[] = [];

  return {
    fetcher: async () => {
      configManager = new ConfigManager(cwd, productName, argvConfig);

      return {
        globalConfig: configManager.globalConfig,
        projectConfig: configManager.projectConfig,
        mergedConfig: configManager.config,
        globalConfigPath: configManager.globalConfigPath,
        projectConfigPath: configManager.projectConfigPath,
      };
    },
    ttl: 60000, // 1 minute cache
    onInvalidate: () => {
      // Clean up file watchers
      watchers.forEach((watcher) => watcher.close());
      watchers = [];
    },
    transform: (data) => {
      // Set up file watchers for hot-reload
      watchers.forEach((watcher) => watcher.close());
      watchers = [];

      const watchFile = (filePath: string) => {
        if (fs.existsSync(filePath)) {
          const watcher = fs.watch(filePath, (eventType) => {
            if (eventType === 'change') {
              // Trigger re-fetch on next access by marking cache as expired
              // This would need to be handled by the DataProvider
              console.log(`Config file changed: ${filePath}`);
            }
          });
          watchers.push(watcher);
        }
      };

      watchFile(data.globalConfigPath);
      watchFile(data.projectConfigPath);

      return data;
    },
  };
}
