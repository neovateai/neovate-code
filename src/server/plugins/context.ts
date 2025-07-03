import createDebug from 'debug';
import { Plugin } from '../../plugin';
import { getFileContext } from '../context/context-files';
import { ContextType } from '../types/completions';

const debug = createDebug('takumi:server:plugins:context');

let files: string[] = [];

export const contextPlugin: Plugin = {
  name: 'browser-context-plugin',
  serverRouteCompletions({ attachedContexts = [] }) {
    debug('serverRouteCompletions', attachedContexts);
    if (attachedContexts.length > 0) {
      files = attachedContexts
        .filter((c) => c.type === ContextType.FILE)
        .map((c) => c.context.path);
    }
  },

  async context() {
    if (files.length === 0) {
      return;
    }
    const browserFiles = await getFileContext(files);

    return {
      files: browserFiles,
    };
  },
};
