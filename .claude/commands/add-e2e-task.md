---
description: Add a new e2e task
---

Add a new e2e task, follow the following steps:

1. create folder `$1` under `e2e/fixtures/`
2. create folder `workspace` under `$1` and create `package.json` file with `"name": "$1"` under `workspace`
3. create folder `tasks` under `$1` and create `task.ts` file with `export const task: TaskModule = { cliArgs: [''], test: (opts) => { console.log(opts.result); } };` under `tasks`
