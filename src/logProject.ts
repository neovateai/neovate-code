// @ts-nocheck
import { Type } from '@sinclair/typebox';
import chokidar, { type FSWatcher } from 'chokidar';
import createDebug from 'debug';
import type { FastifyPluginAsync } from 'fastify';
import * as fs from 'fs/promises';
import { join } from 'pathe';
import { WebSocketServer } from 'ws';
import type { LogEntry } from './jsonl';

const debug = createDebug('neovate:project');

// TypeScript interfaces matching Rust structs
export interface ProjectSummary {
  name: string;
  path: string;
  sessionCount: number;
  latestActivity?: Date;
}

export interface SessionSummary {
  id: string;
  summary: string;
  timestamp: Date;
  messageCount: number;
  projectName: string;
}

export interface WatchEvent {
  type: 'log_entry' | 'project_created' | 'session_created';
  project: string;
  session?: string;
  entry?: LogEntry;
  timestamp: Date;
}

// Schema definitions for API validation
const ProjectSummarySchema = Type.Object({
  name: Type.String(),
  path: Type.String(),
  sessionCount: Type.Number(),
  latestActivity: Type.Optional(Type.String({ format: 'date-time' })),
});

const SessionSummarySchema = Type.Object({
  id: Type.String(),
  summary: Type.String(),
  timestamp: Type.String({ format: 'date-time' }),
  messageCount: Type.Number(),
  projectName: Type.String(),
});

// Core service for managing projects and sessions
export class ProjectService {
  private projectsDir: string;
  private projectsCache: Map<string, ProjectSummary> = new Map();
  private sessionsCache: Map<string, Map<string, SessionSummary>> = new Map();

  constructor(projectsDir: string) {
    this.projectsDir = projectsDir;
    debug('ProjectService initialized with directory:', this.projectsDir);
  }

  async ensureProjectsDirectory(): Promise<void> {
    try {
      await fs.access(this.projectsDir);
    } catch {
      throw new Error(`Projects directory does not exist: ${this.projectsDir}`);
    }
  }

  async getProjects(): Promise<ProjectSummary[]> {
    await this.ensureProjectsDirectory();

    try {
      const entries = await fs.readdir(this.projectsDir, {
        withFileTypes: true,
      });
      const projects: ProjectSummary[] = [];

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const projectPath = join(this.projectsDir, entry.name);
          const project = await this.analyzeProject(entry.name, projectPath);
          if (project) {
            projects.push(project);
            this.projectsCache.set(entry.name, project);
          }
        }
      }

      // Sort by latest activity, most recent first
      projects.sort((a, b) => {
        if (!a.latestActivity && !b.latestActivity) return 0;
        if (!a.latestActivity) return 1;
        if (!b.latestActivity) return -1;
        return b.latestActivity.getTime() - a.latestActivity.getTime();
      });

      return projects;
    } catch (error) {
      debug('Error reading projects directory:', error);
      throw new Error(`Failed to read projects directory: ${error}`);
    }
  }

  async getSessions(projectName: string): Promise<SessionSummary[]> {
    const projectPath = join(this.projectsDir, projectName);

    try {
      await fs.access(projectPath);
    } catch {
      throw new Error(`Project not found: ${projectName}`);
    }

    try {
      const entries = await fs.readdir(projectPath, { withFileTypes: true });
      const sessions: SessionSummary[] = [];

      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith('.jsonl')) {
          const sessionId = entry.name.replace('.jsonl', '');
          const sessionPath = join(projectPath, entry.name);
          const session = await this.analyzeSession(
            sessionId,
            sessionPath,
            projectName,
          );
          if (session) {
            sessions.push(session);
          }
        }
      }

      // Sort by timestamp, most recent first
      sessions.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      // Cache sessions for this project
      const sessionsMap = new Map(sessions.map((s) => [s.id, s]));
      this.sessionsCache.set(projectName, sessionsMap);

      return sessions;
    } catch (error) {
      debug('Error reading sessions for project:', projectName, error);
      throw new Error(
        `Failed to read sessions for project ${projectName}: ${error}`,
      );
    }
  }

  async getSessionLogs(
    projectName: string,
    sessionId: string,
  ): Promise<LogEntry[]> {
    const sessionPath = join(
      this.projectsDir,
      projectName,
      `${sessionId}.jsonl`,
    );

    try {
      await fs.access(sessionPath);
    } catch {
      throw new Error(`Session not found: ${projectName}/${sessionId}`);
    }

    return this.parseJsonlFile(sessionPath);
  }

  private async analyzeProject(
    name: string,
    path: string,
  ): Promise<ProjectSummary | null> {
    try {
      const entries = await fs.readdir(path, { withFileTypes: true });
      const jsonlFiles = entries.filter(
        (entry) => entry.isFile() && entry.name.endsWith('.jsonl'),
      );

      if (jsonlFiles.length === 0) {
        return null; // Skip projects with no sessions
      }

      let latestActivity: Date | undefined;

      // Check first few entries of each session to find latest activity
      for (const file of jsonlFiles.slice(0, 10)) {
        // Limit to prevent performance issues
        const filePath = join(path, file.name);
        try {
          const entries = await this.parseJsonlFile(filePath, 5); // Only read first 5 entries
          for (const entry of entries) {
            if (entry.timestamp) {
              const entryDate = new Date(entry.timestamp);
              if (!latestActivity || entryDate > latestActivity) {
                latestActivity = entryDate;
              }
            }
          }
        } catch (error) {
          debug('Error reading session file:', filePath, error);
          // Continue with other files
        }
      }

      return {
        name,
        path,
        sessionCount: jsonlFiles.length,
        latestActivity,
      };
    } catch (error) {
      debug('Error analyzing project:', path, error);
      return null;
    }
  }

  private async analyzeSession(
    id: string,
    path: string,
    projectName: string,
  ): Promise<SessionSummary | null> {
    try {
      const entries = await this.parseJsonlFile(path, 10); // Read first 10 entries to get summary

      if (entries.length === 0) {
        return null;
      }

      let summary = 'Untitled Session';
      let timestamp = new Date();

      // Look for summary in log entries or use first user message
      for (const entry of entries) {
        if (entry.timestamp) {
          timestamp = new Date(entry.timestamp);
          break; // Use timestamp from first entry
        }
      }

      // Try to extract summary from first user message
      const firstUserEntry = entries.find(
        (entry) =>
          entry.type === 'user' &&
          entry.message &&
          typeof entry.message === 'object' &&
          'content' in entry.message,
      );

      if (
        firstUserEntry &&
        firstUserEntry.message &&
        typeof firstUserEntry.message === 'object' &&
        'content' in firstUserEntry.message
      ) {
        const content = firstUserEntry.message.content;
        if (typeof content === 'string') {
          // Use first 100 characters as summary
          summary = content.slice(0, 100).replace(/\n/g, ' ').trim();
          if (content.length > 100) summary += '...';
        }
      }

      // Count total entries by reading the whole file
      const allEntries = await this.parseJsonlFile(path);

      return {
        id,
        summary,
        timestamp,
        messageCount: allEntries.length,
        projectName,
      };
    } catch (error) {
      debug('Error analyzing session:', path, error);
      return null;
    }
  }

  private async parseJsonlFile(
    filePath: string,
    limit?: number,
  ): Promise<LogEntry[]> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content
        .trim()
        .split('\n')
        .filter((line) => line.trim());
      const entries: LogEntry[] = [];

      const linesToProcess = limit ? lines.slice(0, limit) : lines;

      for (const line of linesToProcess) {
        try {
          const entry = JSON.parse(line) as LogEntry;
          entries.push(entry);
        } catch (parseError) {
          debug('Error parsing JSONL line:', parseError);
          // Skip malformed lines
        }
      }

      return entries;
    } catch (error) {
      debug('Error reading JSONL file:', filePath, error);
      throw error;
    }
  }
}

// File watcher for real-time updates
export class FileWatchManager {
  private watcher: FSWatcher | null = null;
  private projectsDir: string;
  private eventCallbacks: ((event: WatchEvent) => void)[] = [];
  private activeSessions: Map<
    string,
    { position: number; lastModified: number }
  > = new Map();

  constructor(projectsDir: string) {
    this.projectsDir = projectsDir;
  }

  async start(): Promise<void> {
    if (this.watcher) {
      return; // Already started
    }

    debug('Starting file watcher for:', this.projectsDir);

    this.watcher = chokidar.watch('.', {
      cwd: this.projectsDir,
      ignored: /\.log$/,
      persistent: true,
      ignoreInitial: true,
    });

    this.watcher
      .on('add', (filePath: string) =>
        this.handleFileEvent('add', join(this.projectsDir, filePath)),
      )
      .on('change', (filePath: string) =>
        this.handleFileEvent('change', join(this.projectsDir, filePath)),
      )
      .on('error', (error: unknown) => debug('Watcher error:', error));
  }

  async stop(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
      debug('File watcher stopped');
    }
  }

  onEvent(callback: (event: WatchEvent) => void): void {
    this.eventCallbacks.push(callback);
  }

  private async handleFileEvent(
    eventType: 'add' | 'change',
    filePath: string,
  ): Promise<void> {
    try {
      const relativePath = filePath
        .replace(this.projectsDir, '')
        .replace(/^[/\\]/, '');
      const pathParts = relativePath.split(/[/\\]/);

      if (pathParts.length !== 2 || !pathParts[1].endsWith('.jsonl')) {
        return; // Invalid path structure
      }

      const projectName = pathParts[0];
      const sessionId = pathParts[1].replace('.jsonl', '');
      const sessionKey = `${projectName}:${sessionId}`;

      debug(`File ${eventType}:`, projectName, sessionId);

      if (eventType === 'add') {
        // New session created
        this.emitEvent({
          type: 'session_created',
          project: projectName,
          session: sessionId,
          timestamp: new Date(),
        });
      } else if (eventType === 'change') {
        // Session updated, read new entries
        const newEntries = await this.readNewEntries(filePath, sessionKey);
        for (const entry of newEntries) {
          this.emitEvent({
            type: 'log_entry',
            project: projectName,
            session: sessionId,
            entry,
            timestamp: new Date(),
          });
        }
      }
    } catch (error) {
      debug('Error handling file event:', error);
    }
  }

  private async readNewEntries(
    filePath: string,
    sessionKey: string,
  ): Promise<LogEntry[]> {
    try {
      const stats = await fs.stat(filePath);
      const sessionState = this.activeSessions.get(sessionKey) || {
        position: 0,
        lastModified: 0,
      };

      // Check if file was modified since last read
      if (stats.mtimeMs <= sessionState.lastModified) {
        return []; // No new content
      }

      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.trim().split('\n');

      // Read only new lines since last position
      const newLines = lines.slice(sessionState.position);
      const newEntries: LogEntry[] = [];

      for (const line of newLines) {
        if (line.trim()) {
          try {
            const entry = JSON.parse(line) as LogEntry;
            newEntries.push(entry);
          } catch (parseError) {
            debug('Error parsing new JSONL line:', parseError);
          }
        }
      }

      // Update session state
      this.activeSessions.set(sessionKey, {
        position: lines.length,
        lastModified: stats.mtimeMs,
      });

      return newEntries.slice(0, 10); // Limit to prevent spam
    } catch (error) {
      debug('Error reading new entries:', error);
      return [];
    }
  }

  private emitEvent(event: WatchEvent): void {
    for (const callback of this.eventCallbacks) {
      try {
        callback(event);
      } catch (error) {
        debug('Error in event callback:', error);
      }
    }
  }
}

// WebSocket manager for real-time communication
export class WebSocketManager {
  private wss: WebSocketServer | null = null;
  private fileWatcher: FileWatchManager;

  constructor(fileWatcher: FileWatchManager) {
    this.fileWatcher = fileWatcher;
  }

  initialize(server: any): void {
    this.wss = new WebSocketServer({
      server,
      path: '/ws/watch',
    });

    this.wss.on('connection', (ws) => {
      debug('WebSocket client connected');

      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message.toString());
          debug('WebSocket message received:', data);
          // Handle client messages for subscription management if needed
        } catch (error) {
          debug('Error parsing WebSocket message:', error);
        }
      });

      ws.on('close', () => {
        debug('WebSocket client disconnected');
      });

      ws.on('error', (error) => {
        debug('WebSocket error:', error);
      });
    });

    // Listen to file watcher events and broadcast to all clients
    this.fileWatcher.onEvent((event) => {
      this.broadcast(event);
    });

    debug('WebSocket server initialized');
  }

  private broadcast(event: WatchEvent): void {
    if (!this.wss) return;

    const message = JSON.stringify(event);

    this.wss.clients.forEach((ws) => {
      if (ws.readyState === ws.OPEN) {
        try {
          ws.send(message);
        } catch (error) {
          debug('Error sending WebSocket message:', error);
        }
      }
    });
  }

  async close(): Promise<void> {
    if (this.wss) {
      this.wss.close();
      this.wss = null;
      debug('WebSocket server closed');
    }
  }
}

// Main route plugin
const projectRoute: FastifyPluginAsync = async (app, _opts) => {
  if (!process.env.TAKUMI_PROJECTS_DIR) {
    throw new Error('TAKUMI_PROJECTS_DIR is not set');
  }
  const projectsDir = process.env.TAKUMI_PROJECTS_DIR;
  const projectService = new ProjectService(projectsDir);
  const fileWatcher = new FileWatchManager(projectsDir);
  const wsManager = new WebSocketManager(fileWatcher);

  // Initialize file watcher
  await fileWatcher.start();

  // Initialize WebSocket server
  wsManager.initialize(app.server);

  // Cleanup on server close
  app.addHook('onClose', async () => {
    await fileWatcher.stop();
    await wsManager.close();
  });

  // GET /api/projects - List all projects
  app.get(
    '/projects',
    {
      schema: {
        response: {
          200: Type.Array(ProjectSummarySchema),
        },
      },
    },
    async (_request, reply) => {
      try {
        const projects = await projectService.getProjects();
        return projects;
      } catch (error) {
        debug('Error getting projects:', error);
        reply.statusCode = 500;
        return {
          error: 'Failed to get projects',
          message: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
  );

  // GET /api/projects/:projectId/sessions - List sessions for a project
  app.get<{ Params: { projectId: string } }>(
    '/projects/:projectId/sessions',
    {
      schema: {
        params: Type.Object({
          projectId: Type.String(),
        }),
        response: {
          200: Type.Array(SessionSummarySchema),
        },
      },
    },
    async (request, reply) => {
      try {
        const { projectId } = request.params;
        const sessions = await projectService.getSessions(projectId);
        return sessions;
      } catch (error) {
        debug('Error getting sessions:', error);
        if (error instanceof Error && error.message.includes('not found')) {
          reply.status(404);
          return { error: 'Project not found' };
        }
        reply.status(500);
        return {
          error: 'Failed to get sessions',
          message: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
  );

  // GET /api/projects/:projectId/sessions/:sessionId - Get logs for a session
  app.get<{ Params: { projectId: string; sessionId: string } }>(
    '/projects/:projectId/sessions/:sessionId',
    {
      schema: {
        params: Type.Object({
          projectId: Type.String(),
          sessionId: Type.String(),
        }),
      },
    },
    async (request, reply) => {
      try {
        const { projectId, sessionId } = request.params;
        const logs = await projectService.getSessionLogs(projectId, sessionId);
        return logs;
      } catch (error) {
        debug('Error getting session logs:', error);
        if (error instanceof Error && error.message.includes('not found')) {
          reply.status(404);
          return { error: 'Session not found' };
        }
        reply.status(500);
        return {
          error: 'Failed to get session logs',
          message: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
  );
};

export default projectRoute;
