import { execSync } from 'child_process';
import { editQuery } from '../llms/query';
import { Context } from '../types';
import * as logger from '../utils/logger';

const MAX_TEST_ITERATIONS = 10;

export async function runLint(opts: { context: Context }) {
  const { argv } = opts.context;
  const lintCmd = argv['lint-cmd'] || 'npm run lint';
  let iterationCount = 0;
  let success = false;
  let errorOutput = '';

  while (iterationCount < MAX_TEST_ITERATIONS && !success) {
    try {
      logger.logAction({ message: `Running lint command: ${lintCmd}` });
      const output = execSync(lintCmd, { stdio: 'inherit' });
      if (iterationCount === 0) {
        logger.logResult('Lint completed successfully');
      } else {
        logger.logResult(
          `✨ Lint fixed successfully after ${iterationCount} attempt(s)! ✨`,
        );
      }
      success = true;
      return output ? output.toString() : 'Lint completed successfully';
    } catch (error: any) {
      errorOutput =
        error.stdout?.toString() || error.stderr?.toString() || error.message;
      logger.logAction({
        message: `Lint failed (attempt ${iterationCount + 1}/${MAX_TEST_ITERATIONS})`,
      });
      if (errorOutput) {
        logger.logError({ error: 'Lint failed:' });
        process.stdout.write('\n' + errorOutput + '\n\n');
      }
      if (iterationCount + 1 >= MAX_TEST_ITERATIONS) {
        break;
      }
      logger.logAction({ message: 'Attempting to fix the failing lint' });
      await editQuery({
        prompt: `
        Fix the failing lint. Here is the error output:
        ${errorOutput}
        Please analyze the error and make the necessary changes to fix the failing lint.
        `,
        context: opts.context,
      });
      iterationCount++;
    }
  }

  if (!success) {
    logger.logError({
      error: `Failed to fix lint after ${iterationCount} attempts. Last error: ${errorOutput}`,
    });
  }
}
