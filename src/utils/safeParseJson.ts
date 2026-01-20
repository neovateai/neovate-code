import createDebug from 'debug';
import { jsonrepair } from 'jsonrepair';

const debug = createDebug('neovate:utils:safeParseJson');

export function safeParseJson(json: string) {
  try {
    return JSON.parse(json);
  } catch (_error) {
    // try to repair the json
    try {
      debug('safeParseJson failed, trying to repair', _error);
      const repairedJson = jsonrepair(json);
      return JSON.parse(repairedJson);
    } catch (_repairError) {
      debug('safeParseJson failed, repair failed', _repairError);
      return {};
    }
  }
}
