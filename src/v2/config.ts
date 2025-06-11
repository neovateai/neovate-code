import defu from 'defu';
import fs from 'fs';
import { homedir } from 'os';
import path from 'path';

type McpStdioServerConfig = {
  type?: 'stdio';
  command: string;
  args: string[];
  env?: Record<string, string>;
};
type McpSSEServerConfig = {
  type: 'sse';
  url: string;
};
type McpServerConfig = McpStdioServerConfig | McpSSEServerConfig;

type ApprovalMode = 'suggest' | 'auto-edit' | 'full-auto';

export type Config = {
  model: string;
  smallModel: string;
  stream: boolean;
  language: string;
  quiet: boolean;
  approvalMode: ApprovalMode;
  plugins: string[];
  mcpServers: Record<string, McpServerConfig>;
};

const DEFAULT_CONFIG: Partial<Config> = {
  stream: true,
  language: 'English',
  quiet: false,
  approvalMode: 'suggest',
  plugins: [],
  mcpServers: {},
};
const VALID_CONFIG_KEYS = [
  ...Object.keys(DEFAULT_CONFIG),
  'model',
  'smallModel',
];
const ARRAY_CONFIG_KEYS = ['plugins'];
const OBJECT_CONFIG_KEYS = ['mcpServers'];
const BOOLEAN_CONFIG_KEYS = ['stream', 'quiet'];

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
    this.globalConfigPath = globalConfigPath;
    this.projectConfigPath = projectConfigPath;
    this.globalConfig = loadConfig(globalConfigPath);
    this.projectConfig = loadConfig(projectConfigPath);
    this.argvConfig = argvConfig;
  }

  get config() {
    const config = defu(
      this.argvConfig,
      defu(this.projectConfig, defu(this.globalConfig, DEFAULT_CONFIG)),
    ) as Config;
    config.smallModel = config.smallModel || config.model;
    return config;
  }

  removeConfig(global: boolean, key: string, values?: string[]) {
    if (!VALID_CONFIG_KEYS.includes(key)) {
      throw new Error(`Invalid config key: ${key}`);
    }
    const config = global ? this.globalConfig : this.projectConfig;
    const configPath = global ? this.globalConfigPath : this.projectConfigPath;
    if (values) {
      (config[key as keyof Config] as any) = (
        config[key as keyof Config] as string[]
      ).filter((v) => !values.includes(v));
    } else {
      delete config[key as keyof Config];
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
        ...(config[key as keyof Config] as string[]),
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

  setConfig(global: boolean, key: string, value: string) {
    if (!VALID_CONFIG_KEYS.includes(key)) {
      throw new Error(`Invalid config key: ${key}`);
    }
    const config = global ? this.globalConfig : this.projectConfig;
    const configPath = global ? this.globalConfigPath : this.projectConfigPath;
    let newValue: any = value;
    if (BOOLEAN_CONFIG_KEYS.includes(key)) {
      newValue = value === 'true';
    }
    (config[key as keyof Config] as any) = newValue;
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
  fs.writeFileSync(file, JSON.stringify(filteredConfig, null, 2), 'utf-8');
}
