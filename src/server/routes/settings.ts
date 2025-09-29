// @ts-nocheck
import type { FastifyPluginAsync } from 'fastify';
import { ConfigManager } from '../../config';
import { MODEL_ALIAS } from '../../provider';
import type { CreateServerOpts } from '../types';
import type { BatchUpdateRequest, SetSettingRequest } from '../types/settings';

const settingsRoute: FastifyPluginAsync<CreateServerOpts> = async (
  app,
  opts,
) => {
  const getCwd = () => opts.cwd || process.cwd();

  // Get settings
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

  // Get effective settings
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

  // Get available models
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

  // Get available plugins
  app.get('/settings/plugins', async (request, reply) => {
    try {
      // Return mock plugin data for now
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

  // Set configuration
  app.post('/settings', async (request, reply) => {
    try {
      const { scope, key, value } = request.body as SetSettingRequest;
      if (!scope || (scope !== 'global' && scope !== 'project') || !key) {
        return reply.status(400).send({
          success: false,
          error: 'Invalid parameters',
          data: null,
        });
      }

      const validScope = scope as 'global' | 'project';
      const configManager = new ConfigManager(getCwd(), 'takumi', {});

      // Convert boolean values to string as ConfigManager.setConfig expects string parameters
      let configValue: string = '';
      if (typeof value === 'boolean') {
        configValue = value.toString();
      } else if (typeof value === 'string') {
        configValue = value;
      } else if (typeof value === 'number') {
        configValue = value.toString();
      } else if (Array.isArray(value)) {
        configValue = JSON.stringify(value);
      } else if (value !== undefined) {
        configValue = String(value);
      }

      configManager.setConfig(validScope === 'global', key, configValue);

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

  // Batch update settings
  app.post('/settings/batch', async (request, reply) => {
    try {
      const { scope, settings } = request.body as BatchUpdateRequest;
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

  // Reset settings
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

      // Clear all configurations for the specified scope
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

  // Export settings
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

  // Import settings
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

  // Delete configuration item
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
