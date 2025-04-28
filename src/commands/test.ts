import { execSync } from 'child_process';
import pc from 'picocolors';
import { editQuery } from '../llm/query';
import { Context } from '../types';
import * as logger from '../utils/logger';

const MAX_TEST_ITERATIONS = 10;

export async function runTest(opts: { context: Context }) {
  const { argv } = opts.context;
  const testCmd = argv['test-cmd'] || 'npm run test';
  let iterationCount = 0;
  let success = false;
  let errorOutput = '';

  while (iterationCount < MAX_TEST_ITERATIONS && !success) {
    try {
      logger.logAction({ message: `Running test command: ${testCmd}` });
      const output = execSync(testCmd, { stdio: 'inherit' });
      if (iterationCount === 0) {
        logger.logResult('Tests completed successfully');
      } else {
        logger.logResult(
          `✨ Tests fixed successfully after ${iterationCount} attempt(s)! ✨`,
        );
      }
      success = true;
      return output ? output.toString() : 'Tests completed successfully';
    } catch (error: any) {
      errorOutput =
        error.stdout?.toString() || error.stderr?.toString() || error.message;
      logger.logAction({
        message: `Test failed (attempt ${iterationCount + 1}/${MAX_TEST_ITERATIONS})`,
      });
      if (errorOutput) {
        logger.logError({ error: 'Test failed:' });
        process.stdout.write('\n' + errorOutput + '\n\n');
      }
      if (iterationCount + 1 >= MAX_TEST_ITERATIONS) {
        break;
      }
      logger.logAction({ message: 'Attempting to fix the failing tests' });
      await editQuery({
        prompt: `
        Fix the failing tests. Here is the error output:
        ${errorOutput}
        Please analyze the error and make the necessary changes to fix the failing tests.
        `,
        context: opts.context,
      });
      iterationCount++;
    }
  }

  if (!success) {
    throw new Error(
      `Failed to fix tests after ${iterationCount} attempts. Last error: ${errorOutput}`,
    );
  }
}
