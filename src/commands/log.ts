import assert from 'assert';
import fs from 'fs';
import open from 'open';
import path from 'path';
import { Context } from '../types';
import { log2Html } from '../utils/log2Html';
import * as logger from '../utils/logger';

export async function runLog(opts: { context: Context }) {
  const { argv, paths } = opts.context;
  let logFile = argv._[1] as string;

  if (argv.latest) {
    const logDir = path.join(paths.configDir, 'sessions');
    assert(fs.existsSync(logDir), `Log directory does not exist: ${logDir}`);

    const logFiles = fs
      .readdirSync(logDir)
      .filter((file) => file.endsWith('.json'))
      .map((file) => ({
        path: path.join(logDir, file),
        mtime: fs.statSync(path.join(logDir, file)).mtime.getTime(),
      }))
      .sort((a, b) => b.mtime - a.mtime);

    assert(logFiles.length > 0, 'No log files found in the sessions directory');
    logFile = logFiles[0].path;
    logger.logInfo(`Using latest log file: ${logFile}`);
  }

  assert(logFile, 'Please provide a log file path or use --latest flag');
  assert(fs.existsSync(logFile), `Log file does not exist: ${logFile}`);

  try {
    const logData = JSON.parse(fs.readFileSync(logFile, 'utf-8'));
    const htmlFilePath = logFile.replace('.json', '.html');

    fs.writeFileSync(htmlFilePath, log2Html(logData));
    logger.logInfo(`HTML log file generated at: ${htmlFilePath}`);

    if (argv.open) {
      await open(htmlFilePath);
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    logger.logError({ error: `Failed to process log file: ${errorMessage}` });
  }
}
