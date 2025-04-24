import fs from 'fs';
import path from 'path';
import { Config } from '../config';
import { Plugin } from '../pluginManager/types';
import { PluginContext } from '../types';

const data: {
  session: any;
  queries: Record<string, any>;
} = {
  session: {},
  queries: {},
};
let sessionPath: string | null = null;

function write() {
  if (!sessionPath) {
    throw new Error('Session path not set');
  }
  const dir = path.dirname(sessionPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(sessionPath, JSON.stringify(data, null, 2));
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
  cliEnd: async function (this: PluginContext) {
    data.session.endTime = new Date().toISOString();
    data.session.duration =
      new Date(data.session.endTime).getTime() -
      new Date(data.session.startTime).getTime();
    write();
    console.log();
    console.log(`Session saved to ${sessionPath}`);
  },
  config: async function (this: PluginContext) {
    return {};
  },
  configResolved: async function (this: PluginContext, { resolvedConfig }) {
    data!.session.resolvedConfig = formatSessionConfig(resolvedConfig);
    write();
  },
  queryStart: async function (this: PluginContext, { prompt, id }) {
    data.queries[id] = {
      startTime: new Date().toISOString(),
      items: [],
    };
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
  query: async function (this: PluginContext, { prompt, text, id }) {},
  queryEnd: async function (this: PluginContext, { prompt, id }) {
    data.queries[id].endTime = new Date().toISOString();
  },
  toolStart: async function (this: PluginContext, { queryId }) {},
  toolEnd: async function (this: PluginContext, { queryId }) {},
};

function formatSessionConfig(config: Config) {
  let ret: any = { ...config };
  delete ret.systemPrompt;
  return ret;
}
