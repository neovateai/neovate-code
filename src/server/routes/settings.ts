import { FastifyPluginAsync } from 'fastify';
import { ConfigManager } from '../../config';
import { CreateServerOpts } from '../types';
import { ApiResponse } from '../types';

const settingsRoute: FastifyPluginAsync<CreateServerOpts> = async (
  app,
  opts,
) => {
  const getCwd = () => opts.cwd || process.cwd();

  // 获取设置
  app.get('/settings', async (request, reply) => {
    try {
      const { scope } = request.query as { scope?: string };
      if (!scope || (scope !== 'global' && scope !== 'project')) {
        const res: ApiResponse<null> = {
          success: false,
          error: 'Invalid scope parameter',
          data: null,
        };
        reply.status(400).send(res);
        return;
      }

      const validScope = scope as 'global' | 'project';
      const configManager = new ConfigManager(getCwd(), 'takumi', {});

      const settings =
        validScope === 'global'
          ? configManager.globalConfig
          : configManager.projectConfig;

      const res: ApiResponse<any> = {
        success: true,
        data: settings,
      };
      reply.send(res);
    } catch (error) {
      const res: ApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: null,
      };
      reply.status(500).send(res);
    }
  });

  // 获取有效设置
  app.get('/settings/effective', async (request, reply) => {
    try {
      const configManager = new ConfigManager(getCwd(), 'takumi', {});
      const res: ApiResponse<any> = {
        success: true,
        data: configManager.config,
      };
      reply.send(res);
    } catch (error) {
      const res: ApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: null,
      };
      reply.status(500).send(res);
    }
  });

  // 获取可用模型
  app.get('/settings/models', async (request, reply) => {
    try {
      // 这里返回一些模拟的模型数据，实际项目中可以从配置或外部API获取
      const models = [
        {
          value: 'gpt-4o',
          label: 'GPT-4o',
          provider: 'OpenAI',
          description: 'Latest GPT-4 model',
        },
        {
          value: 'gpt-3.5-turbo',
          label: 'GPT-3.5 Turbo',
          provider: 'OpenAI',
          description: 'Fast and cost-effective',
        },
        {
          value: 'claude-3.5-sonnet',
          label: 'Claude 3.5 Sonnet',
          provider: 'Anthropic',
          description: 'Latest Claude model',
        },
        {
          value: 'deepseek-chat',
          label: 'DeepSeek Chat',
          provider: 'DeepSeek',
          description: 'Chinese AI model',
        },
      ];

      const res: ApiResponse<any> = {
        success: true,
        data: models,
      };
      reply.send(res);
    } catch (error) {
      const res: ApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: null,
      };
      reply.status(500).send(res);
    }
  });

  // 获取可用插件
  app.get('/settings/plugins', async (request, reply) => {
    try {
      // 这里返回一些模拟的插件数据
      const plugins = ['example-plugin', 'another-plugin'];

      const res: ApiResponse<string[]> = {
        success: true,
        data: plugins,
      };
      reply.send(res);
    } catch (error) {
      const res: ApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: null,
      };
      reply.status(500).send(res);
    }
  });

  // 设置配置
  app.post('/settings', async (request, reply) => {
    try {
      const { scope, key, value } = request.body as {
        scope?: string;
        key?: string;
        value?: any;
      };
      if (!scope || (scope !== 'global' && scope !== 'project') || !key) {
        const res: ApiResponse<null> = {
          success: false,
          error: 'Invalid parameters',
          data: null,
        };
        reply.status(400).send(res);
        return;
      }

      const validScope = scope as 'global' | 'project';
      const configManager = new ConfigManager(getCwd(), 'takumi', {});

      configManager.setConfig(validScope === 'global', key, value);

      const res: ApiResponse<{ success: boolean }> = {
        success: true,
        data: { success: true },
      };
      reply.send(res);
    } catch (error) {
      const res: ApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: null,
      };
      reply.status(500).send(res);
    }
  });

  // 批量更新设置
  app.post('/settings/batch', async (request, reply) => {
    try {
      const { scope, settings } = request.body as {
        scope?: string;
        settings?: any;
      };
      if (!scope || (scope !== 'global' && scope !== 'project') || !settings) {
        const res: ApiResponse<null> = {
          success: false,
          error: 'Invalid parameters',
          data: null,
        };
        reply.status(400).send(res);
        return;
      }

      const validScope = scope as 'global' | 'project';
      const configManager = new ConfigManager(getCwd(), 'takumi', {});

      configManager.updateConfig(validScope === 'global', settings);

      const res: ApiResponse<{ success: boolean }> = {
        success: true,
        data: { success: true },
      };
      reply.send(res);
    } catch (error) {
      const res: ApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: null,
      };
      reply.status(500).send(res);
    }
  });

  // 重置设置
  app.post('/settings/reset', async (request, reply) => {
    try {
      const { scope } = request.body as { scope?: string };
      if (!scope || (scope !== 'global' && scope !== 'project')) {
        const res: ApiResponse<null> = {
          success: false,
          error: 'Invalid scope parameter',
          data: null,
        };
        reply.status(400).send(res);
        return;
      }

      const validScope = scope as 'global' | 'project';
      const configManager = new ConfigManager(getCwd(), 'takumi', {});

      // 清空对应作用域的所有配置
      const config =
        validScope === 'global'
          ? configManager.globalConfig
          : configManager.projectConfig;
      Object.keys(config).forEach((key) => {
        configManager.removeConfig(validScope === 'global', key);
      });

      const res: ApiResponse<{ success: boolean }> = {
        success: true,
        data: { success: true },
      };
      reply.send(res);
    } catch (error) {
      const res: ApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: null,
      };
      reply.status(500).send(res);
    }
  });

  // 导出设置
  app.get('/settings/export', async (request, reply) => {
    try {
      const { scope } = request.query as { scope?: string };
      if (!scope || (scope !== 'global' && scope !== 'project')) {
        const res: ApiResponse<null> = {
          success: false,
          error: 'Invalid scope parameter',
          data: null,
        };
        reply.status(400).send(res);
        return;
      }

      const validScope = scope as 'global' | 'project';
      const configManager = new ConfigManager(getCwd(), 'takumi', {});

      const settings =
        validScope === 'global'
          ? configManager.globalConfig
          : configManager.projectConfig;

      const res: ApiResponse<string> = {
        success: true,
        data: JSON.stringify(settings, null, 2),
      };
      reply.send(res);
    } catch (error) {
      const res: ApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: null,
      };
      reply.status(500).send(res);
    }
  });

  // 导入设置
  app.post('/settings/import', async (request, reply) => {
    try {
      const { scope, settings } = request.body as {
        scope?: string;
        settings?: string;
      };
      if (!scope || (scope !== 'global' && scope !== 'project') || !settings) {
        const res: ApiResponse<null> = {
          success: false,
          error: 'Invalid parameters',
          data: null,
        };
        reply.status(400).send(res);
        return;
      }

      const validScope = scope as 'global' | 'project';
      const configManager = new ConfigManager(getCwd(), 'takumi', {});

      const parsedSettings =
        typeof settings === 'string' ? JSON.parse(settings) : settings;
      configManager.updateConfig(validScope === 'global', parsedSettings);

      const res: ApiResponse<{ success: boolean }> = {
        success: true,
        data: { success: true },
      };
      reply.send(res);
    } catch (error) {
      const res: ApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: null,
      };
      reply.status(500).send(res);
    }
  });

  // 删除配置项
  app.delete('/settings', async (request, reply) => {
    try {
      const { scope, key } = request.query as { scope?: string; key?: string };
      if (!scope || (scope !== 'global' && scope !== 'project') || !key) {
        const res: ApiResponse<null> = {
          success: false,
          error: 'Invalid parameters',
          data: null,
        };
        reply.status(400).send(res);
        return;
      }

      const validScope = scope as 'global' | 'project';
      const configManager = new ConfigManager(getCwd(), 'takumi', {});

      configManager.removeConfig(validScope === 'global', key);

      const res: ApiResponse<{ success: boolean }> = {
        success: true,
        data: { success: true },
      };
      reply.send(res);
    } catch (error) {
      const res: ApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: null,
      };
      reply.status(500).send(res);
    }
  });
};

export default settingsRoute;
