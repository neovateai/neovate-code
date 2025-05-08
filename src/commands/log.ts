import fs from 'fs';
import open from 'open';
import path from 'path';
import { Context } from '../types';
import { log2Html } from '../utils/log2Html';
import * as logger from '../utils/logger';

export async function runLog(opts: { context: Context }) {
  const { argv, paths } = opts.context;
  const logFile = argv.latest ? paths.sessionPath : (argv._[1] as string);
  if (!logFile) {
    logger.logError({
      error: argv.latest
        ? 'No log files found in the sessionPath'
        : 'Please provide a log file path',
    });
    process.exit(0);
  }
  if (!fs.existsSync(logFile)) {
    logger.logError({ error: `Log file does not exist: ${logFile}` });
    process.exit(0);
  }
  try {
    const logData = JSON.parse(fs.readFileSync(logFile, 'utf-8'));
    const htmlFilePath = path.join(
      path.dirname(logFile),
      `${path.basename(logFile, '.json')}.html`,
    );
    fs.writeFileSync(htmlFilePath, log2Html(logData));
    logger.logInfo(`HTML log file generated at: ${htmlFilePath}`);
    if (argv.open) {
      await open(htmlFilePath);
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred';
    logger.logError({ error: `Failed to process log file: ${errorMessage}` });
    process.exit(1);
  }
}
