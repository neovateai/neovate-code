#!/usr/bin/env bun
import { $ } from 'bun';
import { execSync } from 'child_process';

async function main() {
  const args = process.argv.slice(2);
  const shouldRunE2E = args.includes('--e2e');

  console.log('🚀 Starting ready check...\n');

  // Step 1: Run full build process
  console.log('📦 Building project...');
  try {
    await $`rm -rf dist dist-dts && npm run build:cli && npm run build:index && npm run build:dts && npm run build:mcps && npm run build:post`.quiet();
    console.log('✅ Build completed successfully\n');
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }

  // Step 2: Run tests
  console.log('🧪 Running tests...');
  try {
    await $`npm run test`.quiet();
    console.log('✅ Tests passed\n');
  } catch (error) {
    console.error('❌ Tests failed:', error);
    process.exit(1);
  }

  // Step 3: Run e2e tests (only if --e2e flag is provided)
  if (shouldRunE2E) {
    console.log('🎭 Running e2e tests...');
    try {
      await $`npm run test:e2e`.quiet();
      console.log('✅ E2E tests passed\n');
    } catch (error) {
      console.error('❌ E2E tests failed:', error);
      process.exit(1);
    }
  }

  // Step 4: Run format and check for git changes
  console.log('🎨 Running formatter...');
  try {
    await $`npm run format -- --write`.quiet();

    // Check if there are any unstaged changes (modified but not staged)
    const gitStatus = execSync('git diff --name-only', { encoding: 'utf-8' });
    if (gitStatus.trim()) {
      console.error(
        '❌ Format check failed: There are unstaged changes after formatting',
      );
      console.error('Changed files:');
      console.error(gitStatus);
      process.exit(1);
    }
    console.log('✅ Format check passed\n');
  } catch (error) {
    console.error('❌ Format check failed:', error);
    process.exit(1);
  }

  // Step 5: Test CLI with JSON output
  console.log('🔍 Testing CLI...');
  try {
    const result = execSync(
      'node ./dist/cli.mjs -m iflow/qwen3-coder-plus -q --output-format json "hello"',
      {
        encoding: 'utf-8',
      },
    );

    console.log('CLI Output:');
    console.log(result);

    // Validate JSON
    try {
      JSON.parse(result);
      console.log('✅ CLI test passed - valid JSON output\n');
    } catch (jsonError) {
      console.error('❌ CLI test failed: Invalid JSON output');
      console.error('Output was:', result);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ CLI test failed:', error);
    process.exit(1);
  }

  console.log('🎉 All checks passed! Project is ready.');
}

main().catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
