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
  mcpConfig: {
    mcpServers: Record<string, McpServerConfig>;
  };
};

const DEFAULT_CONFIG: Partial<Config> = {
  stream: true,
  language: 'English',
  quiet: false,
  approvalMode: 'suggest',
  plugins: [],
  mcpConfig: {
    mcpServers: {},
  },
};

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

  saveGlobalConfig(config: Partial<Config>) {
    this.globalConfig = defu(config, this.globalConfig);
    saveConfig(this.globalConfigPath, this.globalConfig, DEFAULT_CONFIG);
  }

  saveProjectConfig(config: Partial<Config>) {
    this.projectConfig = defu(config, this.projectConfig);
    saveConfig(this.projectConfigPath, this.projectConfig, DEFAULT_CONFIG);
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
