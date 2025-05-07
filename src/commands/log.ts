import fs from 'fs';
import open from 'open';
import path from 'path';
import { Context } from '../types';
import * as logger from '../utils/logger';

export async function runLog(opts: { context: Context }) {
  const { argv } = opts.context;
  const logFile = argv._[1] as string;
  if (!logFile) {
    logger.logError({ error: 'Please provide a log file path' });
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
    fs.writeFileSync(htmlFilePath, generateHtml(logData));
    logger.logInfo(`HTML log file generated at: ${htmlFilePath}`);
    if (argv.open) {
      await open(htmlFilePath);
    }
  } catch (error: any) {
    logger.logError({ error: `Failed to process log file: ${error.message}` });
  }
}

function generateHtml(logData: any): string {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Log Viewer</title><style>body{line-height:1.6;padding:20px;max-width:1200px;margin:0 auto;background:#f5f5f5;}pre{background:white;padding:15px;border-radius:5px;box-shadow:0 2px 4px rgba(0,0,0,0.1);overflow-x:auto;}</style></head><body><pre>${JSON.stringify(logData, null, 2)}</pre></body></html>`;
}
