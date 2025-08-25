import { execSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import process from 'process';
import { type SourceOptions } from '../dataSource';

export interface SystemData {
  platform: string;
  arch: string;
  nodeVersion: string;
  npmVersion?: string;
  homeDir: string;
  username: string;
  hostname: string;
  cpus: number;
  memory: {
    total: number;
    free: number;
    used: number;
    usedPercent: number;
  };
  uptime: number;
  shell: string;
  env: Record<string, string | undefined>;
  cwd: string;
  isCI: boolean;
  isDocker: boolean;
  isWSL: boolean;
}

export function createSystemSource(): SourceOptions<SystemData> {
  return {
    fetcher: async () => {
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;

      // Detect NPM version
      let npmVersion: string | undefined;
      try {
        npmVersion = execSync('npm --version', { encoding: 'utf-8' }).trim();
      } catch {
        // npm not available
      }

      // Detect if running in CI
      const isCI = !!(
        process.env.CI ||
        process.env.CONTINUOUS_INTEGRATION ||
        process.env.GITHUB_ACTIONS ||
        process.env.GITLAB_CI ||
        process.env.CIRCLECI ||
        process.env.TRAVIS ||
        process.env.JENKINS_URL
      );

      // Detect if running in Docker
      const isDocker = !!(
        process.env.DOCKER_CONTAINER || fs.existsSync('/.dockerenv')
      );

      // Detect if running in WSL
      const isWSL = !!(process.env.WSL_DISTRO_NAME || process.env.WSL_INTEROP);

      return {
        platform: os.platform(),
        arch: os.arch(),
        nodeVersion: process.version,
        npmVersion,
        homeDir: os.homedir(),
        username: os.userInfo().username,
        hostname: os.hostname(),
        cpus: os.cpus().length,
        memory: {
          total: totalMem,
          free: freeMem,
          used: usedMem,
          usedPercent: (usedMem / totalMem) * 100,
        },
        uptime: os.uptime(),
        shell: process.env.SHELL || 'unknown',
        env: { ...process.env },
        cwd: process.cwd(),
        isCI,
        isDocker,
        isWSL,
      };
    },
    ttl: 60000, // 1 minute cache for system info
  };
}
