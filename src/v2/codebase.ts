import child_process from 'child_process';
import fs from 'fs';
import path from 'pathe';
import color from 'picocolors';
import util from 'util';
import * as logger from '../utils/logger';
import { Context } from './context';

const REPOMIX_COMMAND = 'repomix';
const OUTPUT_FILENAME = 'repomix-output.txt';
const MAX_FILE_SIZE_BYTES = 800 * 1024;

export async function getCodebaseContext(opts: {
  include?: string;
  context: Context;
}): Promise<string> {
  const execPromise = util.promisify(child_process.exec);
  const { context, include = 'src,package.json,README.md' } = opts;

  const OUTPUT_FILE_PATH = path.resolve(
    context.cwd,
    `.${context.productName.toLowerCase()}`,
    OUTPUT_FILENAME,
  );

  const command = `${REPOMIX_COMMAND} --include "${include}" --output ${OUTPUT_FILE_PATH} --style xml --compress`;

  // Clean up any existing output file
  if (fs.existsSync(OUTPUT_FILE_PATH)) {
    fs.unlinkSync(OUTPUT_FILE_PATH);
  }

  logger.logDebug(`> Codebase Executing command: ${command}`);

  try {
    const dir = path.dirname(OUTPUT_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    await execPromise(command);
    logger.logInfo('> Codebase context generated successfully with repomix.');
  } catch (error: any) {
    handleRepomixExecutionError(error);
  }

  return readAndValidateOutputFile(OUTPUT_FILE_PATH);
}

function handleRepomixExecutionError(error: any): never {
  if (
    error.code === 'ENOENT' ||
    (error.message && error.message.includes('command not found'))
  ) {
    logger.logError({ error: 'The repomix has not been installed.' });
    console.log(color.gray('# Install using npm'));
    console.log(color.green('$ npm install -g repomix'));
    console.log(color.gray('# Or install using pnpm'));
    console.log(color.green('$ pnpm install -g repomix'));
    if (process.platform === 'darwin') {
      console.log(color.gray('# Alternatively using Homebrew (macOS/Linux)'));
      console.log(color.green('$ brew install repomix'));
    }
    throw new Error(
      'Repomix command not found. Please install repomix globally using npm/pnpm or Homebrew and ensure it is available in your PATH.',
    );
  }

  logger.logError({
    error: `Failed to execute repomix command: ${error.message}`,
  });
  throw new Error(`Failed to execute repomix command: ${error.message}`);
}

function readAndValidateOutputFile(filePath: string): string {
  try {
    const stats = fs.statSync(filePath);

    if (stats.size > MAX_FILE_SIZE_BYTES) {
      const errorMessage = `${OUTPUT_FILENAME} file size (${stats.size} bytes) exceeds limit (${MAX_FILE_SIZE_BYTES} bytes).`;
      logger.logError({ error: errorMessage });
      throw new Error(errorMessage);
    }

    logger.logInfo(
      `${OUTPUT_FILENAME} file check passed (size: ${stats.size} bytes).`,
    );

    const content = fs.readFileSync(filePath, 'utf-8');
    logger.logInfo(`Successfully read ${OUTPUT_FILENAME} file content.`);
    return content;
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      logger.logError({
        error: `Error: repomix output file ${OUTPUT_FILENAME} not found.`,
      });
      throw new Error(
        `Output file ${OUTPUT_FILENAME} not found after executing repomix. Please check if repomix successfully generated the file.`,
      );
    }

    logger.logError({
      error: `Error reading or checking file ${OUTPUT_FILENAME}: ${error.message}`,
    });
    throw new Error(
      `Error processing file ${OUTPUT_FILENAME}: ${error.message}`,
    );
  }
}
