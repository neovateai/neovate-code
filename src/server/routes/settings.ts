import { FastifyPluginAsync } from 'fastify';
import { ConfigManager } from '../../config';
import { MODEL_ALIAS } from '../../provider';
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
        return reply.status(400).send({
          success: false,
          error: 'Invalid scope parameter',
          data: null,
        });
      }

      const validScope = scope as 'global' | 'project';
      const configManager = new ConfigManager(getCwd(), 'takumi', {});

      const settings =
        validScope === 'global'
          ? configManager.globalConfig
          : configManager.projectConfig;

      return {
        success: true,
        data: settings,
      };
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: null,
      });
    }
  });

  // 获取有效设置
  app.get('/settings/effective', async (request, reply) => {
    try {
      const configManager = new ConfigManager(getCwd(), 'takumi', {});
      return {
        success: true,
        data: configManager.config,
      };
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: null,
      });
    }
  });

  // 获取可用模型
  app.get('/settings/models', async (request, reply) => {
    try {
      const models = Object.entries(MODEL_ALIAS).map(([key, value]) => ({
        key,
        value,
      }));

      return {
        success: true,
        data: models,
      };
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: null,
      });
    }
  });

  // 获取可用插件
  app.get('/settings/plugins', async (request, reply) => {
    try {
      // 这里返回一些模拟的插件数据
      const plugins = ['example-plugin', 'another-plugin'];

      return {
        success: true,
        data: plugins,
      };
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: null,
      });
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
        return reply.status(400).send({
          success: false,
          error: 'Invalid parameters',
          data: null,
        });
      }

      const validScope = scope as 'global' | 'project';
      const configManager = new ConfigManager(getCwd(), 'takumi', {});

      configManager.setConfig(validScope === 'global', key, value);

      return {
        success: true,
        data: { success: true },
      };
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: null,
      });
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
        return reply.status(400).send({
          success: false,
          error: 'Invalid parameters',
          data: null,
        });
      }

      const validScope = scope as 'global' | 'project';
      const configManager = new ConfigManager(getCwd(), 'takumi', {});

      configManager.updateConfig(validScope === 'global', settings);

      return {
        success: true,
        data: { success: true },
      };
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: null,
      });
    }
  });

  // 重置设置
  app.post('/settings/reset', async (request, reply) => {
    try {
      const { scope } = request.body as { scope?: string };
      if (!scope || (scope !== 'global' && scope !== 'project')) {
        return reply.status(400).send({
          success: false,
          error: 'Invalid scope parameter',
          data: null,
        });
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

      return {
        success: true,
        data: { success: true },
      };
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: null,
      });
    }
  });

  // 导出设置
  app.get('/settings/export', async (request, reply) => {
    try {
      const { scope } = request.query as { scope?: string };
      if (!scope || (scope !== 'global' && scope !== 'project')) {
        return reply.status(400).send({
          success: false,
          error: 'Invalid scope parameter',
          data: null,
        });
      }

      const validScope = scope as 'global' | 'project';
      const configManager = new ConfigManager(getCwd(), 'takumi', {});

      const settings =
        validScope === 'global'
          ? configManager.globalConfig
          : configManager.projectConfig;

      return {
        success: true,
        data: JSON.stringify(settings, null, 2),
      };
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: null,
      });
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
        return reply.status(400).send({
          success: false,
          error: 'Invalid parameters',
          data: null,
        });
      }

      const validScope = scope as 'global' | 'project';
      const configManager = new ConfigManager(getCwd(), 'takumi', {});

      const parsedSettings =
        typeof settings === 'string' ? JSON.parse(settings) : settings;
      configManager.updateConfig(validScope === 'global', parsedSettings);

      return {
        success: true,
        data: { success: true },
      };
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: null,
      });
    }
  });

  // 删除配置项
  app.delete('/settings', async (request, reply) => {
    try {
      const { scope, key } = request.query as { scope?: string; key?: string };
      if (!scope || (scope !== 'global' && scope !== 'project') || !key) {
        return reply.status(400).send({
          success: false,
          error: 'Invalid parameters',
          data: null,
        });
      }

      const validScope = scope as 'global' | 'project';
      const configManager = new ConfigManager(getCwd(), 'takumi', {});

      configManager.removeConfig(validScope === 'global', key);

      return {
        success: true,
        data: { success: true },
      };
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: null,
      });
    }
  });
};

export default settingsRoute;
