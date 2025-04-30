import fs from 'fs';
import inquirer from 'inquirer';
import path from 'pathe';
import { ApiKeys, Config, stringToMcpServerConfigs } from '../config';
import { MODEL_ALIAS, ModelType } from '../llm/model';
import { Context } from '../types';
import * as logger from '../utils/logger';

export async function runConfig(opts: { context: Context }) {
  const { context } = opts;
  const configDir = path.dirname(context.paths.configPath);
  const configExists = fs.existsSync(context.paths.configPath);

  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  let currentConfig: Partial<Config> = {};
  if (configExists) {
    try {
      const configContent = fs.readFileSync(context.paths.configPath, 'utf-8');
      currentConfig = JSON.parse(configContent);
    } catch (error: any) {
      logger.logWarn(`Unable to read existing config: ${error.message}`);
    }
  }

  logger.logInfo('Welcome to Takumi configuration wizard!');

  const config = await promptForConfig(currentConfig);

  try {
    fs.writeFileSync(
      context.paths.configPath,
      JSON.stringify(config, null, 2),
      'utf-8',
    );
    logger.logInfo(`Configuration saved to ${context.paths.configPath}`);
  } catch (error: any) {
    logger.logError({
      error: `Failed to save configuration: ${error.message}`,
    });
    throw error;
  }
}

async function promptForConfig(
  currentConfig: Partial<Config>,
): Promise<Partial<Config>> {
  const modelChoices = Object.values(MODEL_ALIAS) as string[];

  const modelAnswer = await inquirer.prompt([
    {
      type: 'list',
      name: 'model',
      message: 'Select default model:',
      default: currentConfig.model || modelChoices[0],
      choices: modelChoices,
    },
  ]);

  const { needDifferentSmallModel } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'needDifferentSmallModel',
      message: `Do you want to use a different small model for quick queries? Otherwise same as model (Default: ${currentConfig.smallModel !== undefined && currentConfig.smallModel !== modelAnswer.model ? 'Yes' : 'No'})`,
      default:
        currentConfig.smallModel !== undefined &&
        currentConfig.smallModel !== modelAnswer.model,
    },
  ]);

  let smallModel = modelAnswer.model;
  if (needDifferentSmallModel) {
    const smallModelAnswer = await inquirer.prompt([
      {
        type: 'list',
        name: 'smallModel',
        message: 'Select default small model (for quick queries):',
        default: currentConfig.smallModel || modelAnswer.model,
        choices: modelChoices,
      },
    ]);
    smallModel = smallModelAnswer.smallModel;
  }

  const { configureApiKeys } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'configureApiKeys',
      message: 'Configure API keys for selected models? (Default: Yes)',
      default: true,
    },
  ]);

  let apiKeys = currentConfig.apiKeys || {};
  if (configureApiKeys) {
    const neededProviders = getNeededProviders(modelAnswer.model, smallModel);
    apiKeys = await promptForApiKeys(
      currentConfig.apiKeys || {},
      neededProviders,
    );
  }

  const { stream } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'stream',
      message: `Enable streaming responses? (Default: ${currentConfig.stream !== undefined ? (currentConfig.stream ? 'Yes' : 'No') : 'Yes'})`,
      default: currentConfig.stream !== undefined ? currentConfig.stream : true,
    },
  ]);

  const { tasks } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'tasks',
      message: `Enable tasks feature? (Default: ${currentConfig.tasks !== undefined ? (currentConfig.tasks ? 'Yes' : 'No') : 'No'})`,
      default: currentConfig.tasks !== undefined ? currentConfig.tasks : false,
    },
  ]);

  const { language } = await inquirer.prompt([
    {
      type: 'list',
      name: 'language',
      message: 'Set default language:',
      default: currentConfig.language || 'English',
      choices: ['中文', 'English'],
    },
  ]);

  const { configureMcp } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'configureMcp',
      message: `Configure MCP (Model Control Protocol) servers? (Default: ${currentConfig.mcpConfig?.mcpServers ? 'Yes' : 'No'})`,
      default: currentConfig.mcpConfig?.mcpServers ? true : false,
    },
  ]);

  let mcpConfig = currentConfig.mcpConfig || {};
  if (configureMcp) {
    const { mcpServers } = await inquirer.prompt([
      {
        type: 'input',
        name: 'mcpServers',
        message:
          'Enter MCP servers (comma-separated, e.g. "http://localhost:3000,npx mcp-server"):',
        default: (() => {
          if (!currentConfig.mcpConfig?.mcpServers) return '';

          try {
            return Object.values(currentConfig.mcpConfig.mcpServers)
              .map((server) => {
                if (typeof server !== 'object' || server === null) return '';

                if ('url' in server && server.url) {
                  return server.url;
                }

                if ('command' in server && server.command) {
                  const cmdArgs =
                    'args' in server && Array.isArray(server.args)
                      ? server.args.join(' ')
                      : '';
                  return `${server.command} ${cmdArgs}`.trim();
                }

                return '';
              })
              .filter(Boolean)
              .join(',');
          } catch (error) {
            console.error('Error formatting MCP config:', error);
            return '';
          }
        })(),
      },
    ]);

    if (mcpServers) {
      mcpConfig = {
        mcpServers: stringToMcpServerConfigs(mcpServers),
      };
    }
  }

  return {
    ...currentConfig,
    model: modelAnswer.model as ModelType,
    smallModel: smallModel as ModelType,
    apiKeys,
    stream,
    tasks,
    language,
    mcpConfig,
  };
}

function getNeededProviders(model: string, smallModel: string): string[] {
  const providers = new Set<string>();

  if (model in MODEL_ALIAS) {
    model = MODEL_ALIAS[model as keyof typeof MODEL_ALIAS];
  }
  if (smallModel in MODEL_ALIAS) {
    smallModel = MODEL_ALIAS[smallModel as keyof typeof MODEL_ALIAS];
  }

  addProviderForModel(model, providers);
  if (model !== smallModel) {
    addProviderForModel(smallModel, providers);
  }

  return Array.from(providers);
}

function addProviderForModel(model: string, providers: Set<string>): void {
  if (model.includes('/')) {
    const [provider] = model.split('/');
    if (provider) {
      providers.add(provider.toLowerCase());
    }
  }
}

async function promptForApiKeys(
  currentApiKeys: ApiKeys,
  neededProviders: string[],
): Promise<ApiKeys> {
  const apiKeys: ApiKeys = { ...currentApiKeys };

  for (const provider of neededProviders) {
    const { apiKey } = await inquirer.prompt([
      {
        type: 'input',
        name: 'apiKey',
        message: `Enter ${provider.toUpperCase()} API key:`,
        default: currentApiKeys[provider] || '',
      },
    ]);

    if (apiKey) {
      apiKeys[provider] = apiKey;
    }
  }

  return apiKeys;
}
