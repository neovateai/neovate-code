import fs from 'fs';
import path from 'path';
import { Config } from '../config';
import { Plugin } from '../pluginManager/types';
import { PluginContext } from '../types';

const data: {
  session: any;
  queries: Record<string, any>;
  fileChanges: any[];
} = {
  session: {},
  queries: {},
  fileChanges: [],
};
let sessionPath: string | null = null;

function write() {
  if (!sessionPath) {
    throw new Error('Session path not set');
  }
  const dir = path.dirname(sessionPath);
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(sessionPath, JSON.stringify(data, null, 2));
  } catch (e) {
    throw new Error(`Failed to write session file: ${e}`);
  }
}

export const sessionPlugin: Plugin = {
  name: 'session',
  cliStart: async function (this: PluginContext) {
    const { sessionId, paths } = this;
    data.session = {
      startTime: new Date().toISOString(),
      id: sessionId,
    };
    sessionPath = paths.sessionPath;
    write();
  },
  cliEnd: async function (this: PluginContext, { error }) {
    data.session.endTime = new Date().toISOString();
    data.session.duration =
      new Date(data.session.endTime).getTime() -
      new Date(data.session.startTime).getTime();
    if (error) {
      data.session.error = {
        type: 'error',
        data: error.toString(),
      };
    }
    write();
  },
  config: async function (this: PluginContext) {
    return {};
  },
  configResolved: async function (this: PluginContext, { resolvedConfig }) {
    data!.session.resolvedConfig = formatSessionConfig(resolvedConfig);
    write();
  },
  queryStart: async function (this: PluginContext, { prompt, id, tools }) {
    data.queries[id] = {
      startTime: new Date().toISOString(),
      items: [],
      generations: [],
    };
    data.queries[id].tools = Object.keys(tools);
    write();
  },
  editFile: async function (
    this: PluginContext,
    { filePath, oldContent, newContent },
  ) {
    data.fileChanges.push({
      type: 'editFile',
      data: {
        filePath,
        oldContent,
        newContent,
        startTime: new Date().toISOString(),
      },
    });
    write();
  },
  createFile: async function (this: PluginContext, { filePath, content }) {
    data.fileChanges.push({
      type: 'createFile',
      data: { filePath, content, startTime: new Date().toISOString() },
    });
    write();
  },
  message: async function (this: PluginContext, { messages, queryId }) {
    data.queries[queryId].items.push(
      ...messages.map((message) => {
        return {
          type: 'message',
          data: message,
        };
      }),
    );
    write();
  },
  query: async function (
    this: PluginContext,
    { id, generationId, tokenUsage },
  ) {
    data.queries[id].generations.push([
      generationId,
      {
        promptTokens: tokenUsage.promptTokens,
        completionTokens: tokenUsage.completionTokens,
        totalTokens: tokenUsage.totalTokens,
      },
    ]);
  },
  queryEnd: async function (
    this: PluginContext,
    { systemPrompt, prompt, text, id, tools },
  ) {
    data.queries[id].endTime = new Date().toISOString();
    data.queries[id].duration =
      new Date(data.queries[id].endTime).getTime() -
      new Date(data.queries[id].startTime).getTime();
    data.queries[id].items.push({
      type: 'finalResponse',
      data: text,
    });
    if (process.env.DEBUG) {
      data.queries[id].systemPrompt = systemPrompt;
    }
    write();
  },
  toolStart: async function (this: PluginContext, { queryId }) {},
  toolEnd: async function (this: PluginContext, { queryId }) {},
};

function formatSessionConfig(config: Config) {
  let ret: any = { ...config };
  if (!process.env.DEBUG) {
    delete ret.systemPrompt;
  }
  return ret;
}
