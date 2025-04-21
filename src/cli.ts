#!/usr/bin/env -S node --no-warnings=ExperimentalWarning
import { runCli } from '.';

runCli({
  plugins: [],
  productName: 'TAKUMI',
})
  .catch(console.error)
  .finally(() => {
    process.exit(0);
  });
