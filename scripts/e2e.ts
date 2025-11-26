import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import type { TaskModule } from '../e2e/types';

// Color constants for beautiful logging
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
};

// Icons for visual clarity
const icons = {
  success: '✅',
  failure: '❌',
  running: '🚀',
  info: 'ℹ️',
  warning: '⚠️',
  time: '⏱️',
  report: '📊',
};

type TaskResult = {
  taskName: string;
  fixtureName: string;
  success: boolean;
  duration: number;
  error?: string;
};

type FilterOptions = {
  fixtureName?: string;
  taskName?: string;
};

// Parse command line arguments
function parseArguments(): FilterOptions | null {
  const args = process.argv.slice(2);
  const onlyIndex = args.findIndex((arg) => arg === '--only');

  if (onlyIndex === -1 || onlyIndex === args.length - 1) {
    return null;
  }

  const onlyValue = args[onlyIndex + 1];

  if (onlyValue.includes('/')) {
    // Format: fixture/task
    const [fixtureName, taskName] = onlyValue.split('/', 2);
    return { fixtureName, taskName };
  } else {
    // Format: fixture only
    return { fixtureName: onlyValue };
  }
}

// Check if a task should be included based on filter
function shouldIncludeTask(
  fixtureName: string,
  taskName: string,
  filter: FilterOptions | null,
): boolean {
  if (!filter) {
    return true; // No filter, include all
  }

  if (filter.fixtureName && filter.fixtureName !== fixtureName) {
    return false;
  }

  if (filter.taskName && filter.taskName !== taskName) {
    return false;
  }

  return true;
}

// Get model from environment variables
function getModelFromEnv(): string {
  const model = process.env.E2E_MODEL;

  if (!model) {
    logError('❌ E2E_MODEL environment variable is not set!');
    logInfo('Please set the E2E_MODEL environment variable in your .env file.');
    logInfo('Example: E2E_MODEL=iflow/qwen3-coder');
    logInfo(
      'Available models: iflow/qwen3-coder, anthropic/claude-3-5-sonnet, openai/gpt-4, etc.',
    );
    process.exit(1);
  }

  logInfo(`🤖 Using model: ${colors.bright}${model}${colors.reset}`);
  return model;
}

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const cliPath = path.join(__dirname, '../src/cli.ts');

type Task = {
  taskFilePath: string;
  workspacePath: string;
  taskName: string;
  fixtureName: string;
};

// Logger utility functions
function logInfo(message: string) {
  console.log(`${colors.blue}${icons.info} ${message}${colors.reset}`);
}

function logSuccess(message: string) {
  console.log(`${colors.green}${icons.success} ${message}${colors.reset}`);
}

function logError(message: string) {
  console.log(`${colors.red}${icons.failure} ${message}${colors.reset}`);
}

function logRunning(message: string) {
  console.log(`${colors.yellow}${icons.running} ${message}${colors.reset}`);
}

function logTiming(message: string) {
  console.log(`${colors.gray}${icons.time} ${message}${colors.reset}`);
}

function logSection(message: string) {
  console.log(
    `\n${colors.bright}${colors.cyan}=== ${message} ===${colors.reset}`,
  );
}

function logSubsection(message: string) {
  console.log(`\n${colors.bright}--- ${message} ---${colors.reset}`);
}

function executeCli(
  cwd: string,
  model: string,
  args: string[],
): Promise<string> {
  return new Promise((resolve, reject) => {
    const cliArgs = [
      cliPath,
      '--cwd',
      cwd,
      '-m',
      model,
      '-q',
      '--output-format',
      'stream-json',
      ...args,
    ];

    const child = spawn('bun', cliArgs, {
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (data) => {
      process.stdout.write(data.toString());
      stdout += data.toString();
    });
    child.stderr.on('data', (data) => {
      process.stderr.write(data.toString());
      stderr += data.toString();
    });
    child.on('close', (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`CLI process exited with code ${code}:\n${stderr}`));
      }
    });
    child.on('error', (err) => {
      reject(err);
    });
  });
}

async function runTask(task: Task, model: string): Promise<TaskResult> {
  const startTime = Date.now();

  logRunning(
    `Running task: ${colors.bright}${task.fixtureName}/${task.taskName}${colors.reset}`,
  );

  try {
    const { task: taskModule } = (await import(task.taskFilePath)) as {
      task: TaskModule;
    };

    if (taskModule.model) {
      model = taskModule.model;
    }

    const tmpPath = path.join(
      os.tmpdir(),
      `neovate-e2e-${normalizeTaskFilePath(task.taskFilePath)}`,
    );

    logInfo(`Setting up workspace: ${colors.dim}${tmpPath}${colors.reset}`);

    // copy workspace to tmpPath
    fs.cpSync(task.workspacePath, tmpPath, { recursive: true });

    logInfo(
      `Executing CLI with model ${colors.yellow}${model}${colors.reset} and args: ${colors.dim}${taskModule.cliArgs.join(' ')}${colors.reset}`,
    );

    const result = await executeCli(tmpPath, model, taskModule.cliArgs);

    const data = result
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        return JSON.parse(line);
      });

    const resultItem = data.find((item) => item.type === 'result');
    const assistantMessages = data.filter((item) => item.role === 'assistant');

    logInfo('Running test assertions...');

    taskModule.test({
      jsonl: data,
      assistantMessages,
      result: resultItem?.content,
      isError: resultItem?.isError,
      cwd: tmpPath,
    });

    const duration = Date.now() - startTime;
    logSuccess(`Task completed: ${task.fixtureName}/${task.taskName}`);
    logTiming(`Duration: ${duration}ms`);

    return {
      taskName: task.taskName,
      fixtureName: task.fixtureName,
      success: true,
      duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    logError(`Task failed: ${task.fixtureName}/${task.taskName}`);
    logError(`Error: ${errorMessage}`);
    logTiming(`Duration: ${duration}ms`);

    return {
      taskName: task.taskName,
      fixtureName: task.fixtureName,
      success: false,
      duration,
      error: errorMessage,
    };
  }
}

async function runAllTasks(
  fixturesDir: string,
  model: string,
  filter: FilterOptions | null = null,
): Promise<TaskResult[]> {
  const allResults: TaskResult[] = [];
  const fixtures = fs
    .readdirSync(fixturesDir)
    .filter((fixture) => !fixture.startsWith('.'));

  // Filter fixtures if needed
  const filteredFixtures = filter?.fixtureName
    ? fixtures.filter((fixture) => fixture === filter.fixtureName)
    : fixtures;

  if (filteredFixtures.length === 0) {
    if (filter?.fixtureName) {
      logError(`Fixture '${filter.fixtureName}' not found in ${fixturesDir}`);
      logInfo(`Available fixtures: ${fixtures.join(', ')}`);
      return [];
    }
  }

  const totalFixtures = filteredFixtures.length;

  if (filter) {
    if (filter.taskName) {
      logSection(
        `Starting E2E Test Suite - Running specific task: ${filter.fixtureName}/${filter.taskName}`,
      );
    } else {
      logSection(
        `Starting E2E Test Suite - Running fixture: ${filter.fixtureName} (${totalFixtures} fixture${totalFixtures !== 1 ? 's' : ''})`,
      );
    }
  } else {
    logSection(`Starting E2E Test Suite - ${totalFixtures} fixtures found`);
  }

  for (
    let fixtureIndex = 0;
    fixtureIndex < filteredFixtures.length;
    fixtureIndex++
  ) {
    const fixture = filteredFixtures[fixtureIndex];
    const fixturePath = path.join(fixturesDir, fixture);
    const tasksDir = path.join(fixturePath, 'tasks');

    if (!fs.existsSync(tasksDir)) {
      logError(`Tasks directory not found: ${tasksDir}`);
      continue;
    }

    const tasks = fs
      .readdirSync(tasksDir)
      .filter((file) => file.endsWith('.ts'));

    // Filter tasks if needed
    const filteredTasks = filter?.taskName
      ? tasks.filter((task) => task.replace('.ts', '') === filter.taskName)
      : tasks;

    if (filteredTasks.length === 0) {
      if (filter?.taskName) {
        logError(`Task '${filter.taskName}' not found in fixture '${fixture}'`);
        const availableTasks = tasks.map((t) => t.replace('.ts', ''));
        logInfo(
          `Available tasks in '${fixture}': ${availableTasks.join(', ')}`,
        );
        continue;
      }
    }

    const totalTasks = filteredTasks.length;

    if (totalTasks > 0) {
      logSubsection(
        `Fixture [${fixtureIndex + 1}/${totalFixtures}]: ${fixture} (${totalTasks} task${totalTasks !== 1 ? 's' : ''})`,
      );
    }

    for (let taskIndex = 0; taskIndex < filteredTasks.length; taskIndex++) {
      const task = filteredTasks[taskIndex];
      const taskName = task.replace('.ts', '');

      // Double-check with shouldIncludeTask for consistency
      if (!shouldIncludeTask(fixture, taskName, filter)) {
        continue;
      }

      logInfo(`Task [${taskIndex + 1}/${totalTasks}]: ${taskName}`);

      const result = await runTask(
        {
          taskFilePath: path.join(tasksDir, task),
          workspacePath: path.join(fixturePath, 'workspace'),
          taskName,
          fixtureName: fixture,
        },
        model,
      );

      allResults.push(result);
    }
  }

  return allResults;
}

function generateReport(results: TaskResult[]) {
  const successResults = results.filter((r) => r.success);
  const failResults = results.filter((r) => !r.success);
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  const avgDuration =
    results.length > 0 ? Math.round(totalDuration / results.length) : 0;

  logSection('E2E Test Results Report');

  console.log(`${colors.bright}${icons.report} Test Summary:${colors.reset}`);
  console.log(
    `  Total Tests: ${colors.bright}${results.length}${colors.reset}`,
  );
  console.log(
    `  ${colors.green}${icons.success} Passed: ${successResults.length}${colors.reset}`,
  );
  console.log(
    `  ${colors.red}${icons.failure} Failed: ${failResults.length}${colors.reset}`,
  );
  console.log(
    `  ${colors.blue}${icons.time} Total Duration: ${totalDuration}ms${colors.reset}`,
  );
  console.log(
    `  ${colors.blue}${icons.time} Average Duration: ${avgDuration}ms${colors.reset}`,
  );
  console.log(
    `  Success Rate: ${colors.bright}${results.length > 0 ? Math.round((successResults.length / results.length) * 100) : 0}%${colors.reset}`,
  );

  if (successResults.length > 0) {
    console.log(
      `\n${colors.green}${colors.bright}✓ Successful Tests:${colors.reset}`,
    );
    successResults.forEach((result) => {
      console.log(
        `  ${colors.green}${icons.success} ${result.fixtureName}/${result.taskName}${colors.reset} ${colors.gray}(${result.duration}ms)${colors.reset}`,
      );
    });
  }

  if (failResults.length > 0) {
    console.log(
      `\n${colors.red}${colors.bright}✗ Failed Tests:${colors.reset}`,
    );
    failResults.forEach((result) => {
      console.log(
        `  ${colors.red}${icons.failure} ${result.fixtureName}/${result.taskName}${colors.reset} ${colors.gray}(${result.duration}ms)${colors.reset}`,
      );
      if (result.error) {
        console.log(`    ${colors.red}Error: ${result.error}${colors.reset}`);
      }
    });
  }

  // Final status
  console.log();
  if (failResults.length === 0) {
    logSuccess('All tests passed! 🎉');
  } else {
    logError(`${failResults.length} test(s) failed`);
  }

  return failResults.length === 0;
}

function normalizeTaskFilePath(taskFilePath: string) {
  return taskFilePath.replace(/^\/+|\/+$/g, '').replace(/[^a-zA-Z0-9]/g, '-');
}

(async () => {
  const startTime = Date.now();
  const fixturePath = path.join(__dirname, '../e2e/fixtures');
  const filter = parseArguments();
  const model = getModelFromEnv();

  if (filter) {
    if (filter.taskName) {
      logInfo(
        `🎯 Running filtered test: ${filter.fixtureName}/${filter.taskName}`,
      );
    } else {
      logInfo(`🎯 Running filtered fixture: ${filter.fixtureName}`);
    }
  }

  try {
    const results = await runAllTasks(fixturePath, model, filter);

    if (results.length === 0) {
      logError(
        'No tests were executed. Please check your --only filter or fixture directory.',
      );
      process.exit(1);
    }

    const success = generateReport(results);

    const totalTime = Date.now() - startTime;
    logTiming(`Total execution time: ${totalTime}ms`);

    // Exit with appropriate code
    process.exit(success ? 0 : 1);
  } catch (error) {
    logError('Fatal error during test execution:');
    logError(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
})();
