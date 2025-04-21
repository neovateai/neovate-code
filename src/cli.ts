#!/usr/bin/env -S node --no-warnings=ExperimentalWarning
import { runCli } from '.';

runCli()
  .catch(console.error)
  .finally(() => {
    process.exit(0);
  });
