import defu from 'defu';
import fs from 'fs';
import { homedir } from 'os';
import path from 'pathe';
import { mergeBrowserMcpServers } from './browser';
import type { Provider } from './model';

export type McpStdioServerConfig = {
  type: 'stdio';
  command: string;
  args: string[];
  env?: Record<string, string>;
  disable?: boolean;
};
export type McpSSEServerConfig = {
  type: 'sse';
  url: string;
  disable?: boolean;
  headers?: Record<string, string>;
};
export type McpHttpServerConfig = {
  type: 'http';
  url: string;
  disable?: boolean;
  headers?: Record<string, string>;
};
export type McpServerConfig =
  | McpStdioServerConfig
  | McpSSEServerConfig
  | McpHttpServerConfig;

export type ApprovalMode = 'default' | 'autoEdit' | 'yolo';

export type CommitConfig = {
  language: string;
  systemPrompt?: string;
  model?: string;
};

export type ProviderConfig = Partial<Omit<Provider, 'createModel'>>;

export type Config = {
  model: string;
  planModel: string;
  smallModel?: string;
  visionModel?: string;
  language: string;
  quiet: boolean;
  approvalMode: ApprovalMode;
  plugins: string[];
  mcpServers: Record<string, McpServerConfig>;
  provider?: Record<string, ProviderConfig>;
  systemPrompt?: string;
  todo?: boolean;
  /**
   * Controls whether automatic conversation compression is enabled.
   * When set to false, conversation history will accumulate and context limit will be exceeded.
   *
   * @default true
   */
  autoCompact?: boolean;
  commit?: CommitConfig;
  outputStyle?: string;
  outputFormat?: 'text' | 'stream-json' | 'json';
  autoUpdate?: boolean;
  browser?: boolean;
  temperature?: number;
  httpProxy?: string;
  /**
   * Extensions configuration for third-party custom agents.
   * Allows arbitrary nested configuration without validation.
   */
  extensions?: Record<string, any>;
};

const DEFAULT_CONFIG: Partial<Config> = {
  language: 'English',
  quiet: false,
  approvalMode: 'default',
  plugins: [],
  mcpServers: {},
  provider: {},
  todo: true,
  autoCompact: true,
  outputFormat: 'text',
  autoUpdate: true,
  browser: false,
  extensions: {},
};
const VALID_CONFIG_KEYS = [
  ...Object.keys(DEFAULT_CONFIG),
  'model',
  'planModel',
  'smallModel',
  'visionModel',
  'systemPrompt',
  'todo',
  'autoCompact',
  'commit',
  'outputStyle',
  'autoUpdate',
  'provider',
  'browser',
  'temperature',
  'httpProxy',
  'extensions',
];
const ARRAY_CONFIG_KEYS = ['plugins'];
const OBJECT_CONFIG_KEYS = ['mcpServers', 'commit', 'provider', 'extensions'];
const BOOLEAN_CONFIG_KEYS = [
  'quiet',
  'todo',
  'autoCompact',
  'autoUpdate',
  'browser',
];

export class ConfigManager {
  globalConfig: Partial<Config>;
  projectConfig: Partial<Config>;
  argvConfig: Partial<Config>;
  globalConfigPath: string;
  projectConfigPath: string;

  constructor(cwd: string, productName: string, argvConfig: Partial<Config>) {
    const lowerProductName = productName.toLowerCase();
    const globalConfigPath = path.join(
      homedir(),
      `.${lowerProductName}`,
      'config.json',
    );
    const projectConfigPath = path.join(
      cwd,
      `.${lowerProductName}`,
      'config.json',
    );
    const projectLocalConfigPath = path.join(
      cwd,
      `.${lowerProductName}`,
      'config.local.json',
    );
    this.globalConfigPath = globalConfigPath;
    this.projectConfigPath = projectConfigPath;
    this.globalConfig = loadConfig(globalConfigPath);
    this.projectConfig = defu(
      loadConfig(projectConfigPath),
      loadConfig(projectLocalConfigPath),
    );
    this.argvConfig = argvConfig;
  }

  get config() {
    const config = defu(
      this.argvConfig,
      defu(this.projectConfig, defu(this.globalConfig, DEFAULT_CONFIG)),
    ) as Config;
    config.planModel = config.planModel || config.model;
    config.smallModel = config.smallModel || config.model;
    config.visionModel = config.visionModel || config.model;
    if (config.browser) {
      config.mcpServers = mergeBrowserMcpServers(
        config.mcpServers,
        config.browser,
      );
    }
    return config;
  }

  removeConfig(global: boolean, key: string, values?: string[]) {
    const config = global ? this.globalConfig : this.projectConfig;
    const configPath = global ? this.globalConfigPath : this.projectConfigPath;

    if (key.includes('.')) {
      // Handle dot notation for nested keys
      const keys = key.split('.');
      const rootKey = keys[0];

      if (!VALID_CONFIG_KEYS.includes(rootKey)) {
        throw new Error(`Invalid config key: ${rootKey}`);
      }

      if (!OBJECT_CONFIG_KEYS.includes(rootKey)) {
        throw new Error(
          `Config key '${rootKey}' does not support nested properties`,
        );
      }

      // Navigate to the nested property
      let current: any = config[rootKey as keyof Config];
      if (!current) {
        return; // Nothing to remove
      }

      // Navigate to the parent of the target property
      for (let i = 1; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          return; // Path doesn't exist, nothing to remove
        }
        current = current[keys[i]];
      }

      const lastKey = keys[keys.length - 1];

      if (values) {
        // Remove specific values from array
        if (Array.isArray(current[lastKey])) {
          current[lastKey] = current[lastKey].filter(
            (v: string) => !values.includes(v),
          );
        }
      } else {
        // Delete the property
        delete current[lastKey];
      }
    } else {
      // Handle flat keys
      if (!VALID_CONFIG_KEYS.includes(key)) {
        throw new Error(`Invalid config key: ${key}`);
      }

      if (values) {
        (config[key as keyof Config] as any) = (
          config[key as keyof Config] as string[]
        ).filter((v) => !values.includes(v));
      } else {
        delete config[key as keyof Config];
      }
    }

    saveConfig(configPath, config, DEFAULT_CONFIG);
  }

  addConfig(global: boolean, key: string, values: string[]) {
    if (!VALID_CONFIG_KEYS.includes(key)) {
      throw new Error(`Invalid config key: ${key}`);
    }
    const config = global ? this.globalConfig : this.projectConfig;
    const configPath = global ? this.globalConfigPath : this.projectConfigPath;
    if (ARRAY_CONFIG_KEYS.includes(key)) {
      (config[key as keyof Config] as any) = [
        ...((config[key as keyof Config] as string[]) || []),
        ...values,
      ];
    } else if (OBJECT_CONFIG_KEYS.includes(key)) {
      (config[key as keyof Config] as any) = {
        ...(config[key as keyof Config] as Record<string, McpServerConfig>),
        ...values,
      };
    }
    saveConfig(configPath, config, DEFAULT_CONFIG);
  }

  getConfig(global: boolean, key: string): any {
    const config = global ? this.globalConfig : this.projectConfig;

    if (!key.includes('.')) {
      return config[key as keyof Config];
    }

    const keys = key.split('.');
    const rootKey = keys[0];

    if (!VALID_CONFIG_KEYS.includes(rootKey)) {
      throw new Error(`Invalid config key: ${rootKey}`);
    }

    let current: any = config[rootKey as keyof Config];
    for (let i = 1; i < keys.length; i++) {
      if (current === undefined || current === null) {
        return undefined;
      }
      current = current[keys[i]];
    }

    return current;
  }

  setConfig(global: boolean, key: string, value: string) {
    const config = global ? this.globalConfig : this.projectConfig;
    const configPath = global ? this.globalConfigPath : this.projectConfigPath;

    if (key.includes('.')) {
      // Handle dot notation for nested keys
      const keys = key.split('.');
      const rootKey = keys[0];

      if (!VALID_CONFIG_KEYS.includes(rootKey)) {
        throw new Error(`Invalid config key: ${rootKey}`);
      }

      if (!OBJECT_CONFIG_KEYS.includes(rootKey)) {
        throw new Error(
          `Config key '${rootKey}' does not support nested properties`,
        );
      }

      // Initialize the root object if it doesn't exist
      if (!config[rootKey as keyof Config]) {
        (config[rootKey as keyof Config] as any) = {};
      }

      // Navigate to the nested property and set the value
      let current: any = config[rootKey as keyof Config];
      for (let i = 1; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = {};
        }
        current = current[keys[i]];
      }

      const lastKey = keys[keys.length - 1];
      current[lastKey] = value;
    } else {
      // Handle flat keys
      if (!VALID_CONFIG_KEYS.includes(key)) {
        throw new Error(`Invalid config key: ${key}`);
      }

      let newValue: any = value;
      if (BOOLEAN_CONFIG_KEYS.includes(key)) {
        if (typeof value === 'boolean') {
          newValue = value;
        } else {
          newValue = value === 'true';
        }
      }
      if (ARRAY_CONFIG_KEYS.includes(key)) {
        newValue = JSON.parse(value);
      }
      if (OBJECT_CONFIG_KEYS.includes(key)) {
        newValue = JSON.parse(value);
      }
      (config[key as keyof Config] as any) = newValue;
    }

    saveConfig(configPath, config, DEFAULT_CONFIG);
  }

  updateConfig(global: boolean, newConfig: Partial<Config>) {
    Object.keys(newConfig).forEach((key) => {
      if (!VALID_CONFIG_KEYS.includes(key)) {
        throw new Error(`Invalid config key: ${key}`);
      }
    });
    let config = global ? this.globalConfig : this.projectConfig;
    const configPath = global ? this.globalConfigPath : this.projectConfigPath;
    config = defu(newConfig, config);
    if (global) {
      this.globalConfig = config;
    } else {
      this.projectConfig = config;
    }
    saveConfig(configPath, config, DEFAULT_CONFIG);
  }
}

function loadConfig(file: string) {
  if (!fs.existsSync(file)) {
    return {};
  }
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch (error) {
    throw new Error(`Unable to read config file ${file}: ${error}`);
  }
}

function saveConfig(
  file: string,
  config: Partial<Config>,
  defaultConfig: Partial<Config>,
) {
  const filteredConfig = Object.fromEntries(
    Object.entries(config).filter(
      ([key, value]) =>
        JSON.stringify(value) !==
        JSON.stringify(defaultConfig[key as keyof Config]),
    ),
  );
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(file, JSON.stringify(filteredConfig, null, 2), 'utf-8');
}
