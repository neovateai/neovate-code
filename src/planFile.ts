import fs from 'fs';
import path from 'pathe';
import type { Context } from './context';
import { SessionConfigManager } from './session';
import {
  createPlanSlugGenerator,
  type PlanSlugGenerator,
} from './utils/planSlug';

export interface PlanFileManager {
  getPlansDir(): string;
  getPlanFilePath(sessionId?: string, agentId?: string): string;
  readPlan(sessionId?: string, agentId?: string): string | null;
  planExists(sessionId?: string, agentId?: string): boolean;
  getSlugGenerator(): PlanSlugGenerator;
}

export interface PlanFileManagerOptions {
  context: Context;
  sessionId: string;
}

export function createPlanFileManager(
  opts: PlanFileManagerOptions,
): PlanFileManager {
  const { context, sessionId } = opts;
  const { paths } = context;

  // Plans directory: ~/.neovate/plans/
  const plansDir = path.join(paths.globalConfigDir, 'plans');

  // Create SessionConfigManager for current session
  const sessionConfigManager = new SessionConfigManager({
    logPath: paths.getSessionLogPath(sessionId),
  });

  // Create slug generator
  const slugGenerator = createPlanSlugGenerator({ plansDir });

  // Restore slug from SessionConfigManager to in-memory cache
  // Always prefer config over global cache to ensure persistence across sessions
  if (sessionConfigManager.config.planSlug) {
    slugGenerator.set(sessionId, sessionConfigManager.config.planSlug);
  }

  // Helper function to get plan file path
  const getPlanFilePathImpl = (sid?: string, agentId?: string): string => {
    const targetSessionId = sid || sessionId;
    const slug = slugGenerator.getOrCreate(targetSessionId);

    // Persist slug for current session if not already in config
    if (
      targetSessionId === sessionId &&
      sessionConfigManager.config.planSlug !== slug
    ) {
      sessionConfigManager.config.planSlug = slug;
      sessionConfigManager.write();
    }

    if (agentId) {
      // Sub-Agent: {slug}-agent-{agentId}.md
      return path.join(plansDir, `${slug}-agent-${agentId}.md`);
    } else {
      // Main Agent: {slug}.md
      return path.join(plansDir, `${slug}.md`);
    }
  };

  // Return implementation object
  return {
    getPlansDir: () => plansDir,

    getPlanFilePath: getPlanFilePathImpl,

    readPlan: (sid?: string, agentId?: string) => {
      const filePath = getPlanFilePathImpl(sid, agentId);

      if (!fs.existsSync(filePath)) {
        return null;
      }

      try {
        return fs.readFileSync(filePath, 'utf-8');
      } catch (error) {
        console.error('Failed to read plan file:', error);
        return null;
      }
    },

    planExists: (sid?: string, agentId?: string) => {
      const filePath = getPlanFilePathImpl(sid, agentId);
      return fs.existsSync(filePath);
    },

    getSlugGenerator: () => slugGenerator,
  };
}
