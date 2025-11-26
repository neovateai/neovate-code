import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import { Type } from '@sinclair/typebox';
import createDebug from 'debug';
import type { FastifyPluginAsync } from 'fastify';
import path from 'pathe';
import type { ContextCreateOpts } from '../../../context';
import { Paths } from '../../../paths';
import { getGitStatus } from '../../../utils/git';

const debug = createDebug('neovate:server:project');

interface SessionInfo {
  sessionId: string;
  modified: Date;
  created: Date;
  messageCount: number;
  summary: string;
}

interface ProjectInfo {
  name: string;
  path: string;
  gitBranch?: string;
  gitStatus?: 'clean' | 'modified' | 'staged' | 'conflicted';
  sessions: SessionInfo[];
}

type GitStatusType = ProjectInfo['gitStatus'];

function parseGitStatus(gitStatusOutput: string): GitStatusType {
  if (!gitStatusOutput || gitStatusOutput.trim() === '') {
    return 'clean';
  }

  const lines = gitStatusOutput.split('\n').filter((line) => line.trim());

  let hasModified = false;
  let hasStaged = false;
  let hasConflicted = false;

  for (const line of lines) {
    const statusCode = line.substring(0, 2);

    // Check for conflicts (both sides modified)
    if (statusCode.includes('U') || line.includes('<<<<<<< HEAD')) {
      hasConflicted = true;
      break;
    }

    // Check for staged changes (first character)
    if (statusCode[0] !== ' ' && statusCode[0] !== '?') {
      hasStaged = true;
    }

    // Check for modified changes (second character)
    if (statusCode[1] !== ' ' && statusCode[1] !== '?') {
      hasModified = true;
    }
  }

  if (hasConflicted) return 'conflicted';
  if (hasStaged) return 'staged';
  if (hasModified) return 'modified';

  return 'clean';
}

interface ProjectRequest {
  folder?: string;
}

interface OpenEditorRequest {
  projectPath: string;
}

const EDITORS = {
  vscode: {
    command: 'code',
    args: ['.'],
    name: 'Visual Studio Code',
  },
  webstorm: {
    command: 'webstorm',
    args: ['.'],
    name: 'WebStorm',
  },
  idea: {
    command: 'idea',
    args: ['.'],
    name: 'IntelliJ IDEA',
  },
  sublime: {
    command: 'subl',
    args: ['.'],
    name: 'Sublime Text',
  },
  atom: {
    command: 'atom',
    args: ['.'],
    name: 'Atom',
  },
  vim: {
    command: 'vim',
    args: ['.'],
    name: 'Vim',
  },
  emacs: {
    command: 'emacs',
    args: ['.'],
    name: 'Emacs',
  },
};

function commandExists(command: string): Promise<boolean> {
  return new Promise((resolve) => {
    const platform = os.platform();
    const cmd = platform === 'win32' ? 'where' : 'which';

    const child = spawn(cmd, [command], {
      stdio: 'ignore',
      shell: true,
    });

    child.on('close', (code) => {
      resolve(code === 0);
    });

    child.on('error', () => {
      resolve(false);
    });
  });
}

async function findAvailableEditor(): Promise<
  (typeof EDITORS)[keyof typeof EDITORS] | null
> {
  for (const editor of Object.values(EDITORS)) {
    if (await commandExists(editor.command)) {
      return editor;
    }
  }
  return null;
}

async function openProjectInEditor(projectPath: string): Promise<void> {
  if (!fs.existsSync(projectPath)) {
    throw new Error(`Project path does not exist: ${projectPath}`);
  }

  const stat = fs.statSync(projectPath);
  if (!stat.isDirectory()) {
    throw new Error(`Path is not a directory: ${projectPath}`);
  }

  const editor = await findAvailableEditor();
  if (!editor) {
    throw new Error(
      'No supported editor found. Please install VS Code, WebStorm, Sublime Text, or another supported editor.',
    );
  }

  return new Promise((resolve, reject) => {
    const child = spawn(editor.command, editor.args, {
      cwd: projectPath,
      detached: true,
      stdio: 'ignore',
    });

    child.unref();

    child.on('error', (error) => {
      reject(new Error(`Failed to open ${editor.name}: ${error.message}`));
    });

    // 给编辑器一点时间启动
    setTimeout(() => {
      resolve();
    }, 1000);
  });
}

const projectRoute: FastifyPluginAsync<ContextCreateOpts> = async (
  app,
  opts,
) => {
  app.get<{ Querystring: ProjectRequest }>(
    '/project/info',
    {
      schema: {
        querystring: Type.Object({
          folder: Type.Optional(Type.String()),
        }),
      },
    },
    async (request, reply) => {
      try {
        const { folder } = request.query;
        const cwd = folder || opts.cwd;
        const projectPath = path.resolve(cwd);
        const projectName = path.basename(projectPath);
        const paths = new Paths({
          productName: opts.productName,
          cwd,
        });
        const sessions = paths.getAllSessions();

        const gitStatus = await getGitStatus({ cwd });

        const projectInfo: ProjectInfo = {
          name: projectName,
          path: projectPath,
          gitBranch: gitStatus?.branch || undefined,
          gitStatus: gitStatus ? parseGitStatus(gitStatus.status) : undefined,
          sessions,
        };

        return reply.send({
          success: true,
          data: projectInfo,
        });
      } catch (error) {
        debug('Project info API error:', error);
        return reply.code(500).send({
          success: false,
          message:
            error instanceof Error
              ? error.message
              : 'Unknown error occurred while getting project info.',
        });
      }
    },
  );

  app.post<{ Body: OpenEditorRequest }>(
    '/project/open-in-editor',
    {
      schema: {
        body: Type.Object({
          projectPath: Type.String(),
        }),
      },
    },
    async (request, reply) => {
      try {
        const { projectPath } = request.body;

        debug('Opening project in editor:', projectPath);

        await openProjectInEditor(projectPath);

        return reply.send({
          success: true,
          message: 'Project opened in editor successfully',
        });
      } catch (error) {
        debug('Open in editor API error:', error);
        return reply.code(500).send({
          success: false,
          message:
            error instanceof Error
              ? error.message
              : 'Unknown error occurred while opening project in editor.',
        });
      }
    },
  );
};

export default projectRoute;
