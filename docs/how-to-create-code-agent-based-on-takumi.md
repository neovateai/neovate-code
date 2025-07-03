# Build Your Own **Code Agent** with Takumi

Takumi already ships with a powerful **Code Agent** (`takumi run`).  
But you can also embed that power in **your own CLI tool**—pointing it at the models you want, adding private context, telemetry, etc.  
All you have to write is **one file** using Takumi's high-level **`runCli` + Plugin API**.

This guide shows the minimal steps.

---
## 1  Install

```bash
pnpm add takumi
```

> Takumi is ESM-only. Make sure you run Node 18+ and launch your script with `node --no-warnings=ExperimentalWarning` (see the examples below).

---
## 2  Create a CLI Entrypoint

Create a file, e.g. `my-code-agent.mjs` (or `.ts` if you use ts-node / esbuild):

```ts
#!/usr/bin/env -S node --no-warnings=ExperimentalWarning
import path from 'path';
// 👇 High-level API + underscore exports
import {
  runCli,
  type Plugin,
} from 'takumi';

/* -------------------------------------------------------------------------- */
/* 1. Define your plugin                                                      */
/* -------------------------------------------------------------------------- */
const myPlugin: Plugin = {
  name: 'my-custom-code-agent',

  /**
   * 2. Provide default configuration
   *    (which LLMs Takumi should use for code-related tasks).
   */
  config() {
    return {
      model: 'my-code-model',          // "big" model used by the Code Agent
      smallModel: 'my-fast-model',     // e.g. for short queries / ranking
      planModel: 'my-code-model',      // used when Takumi plans multi-step tasks
    };
  },

  /**
   * 3. Tell Takumi how to instantiate those model names.
   *    You can call ANY OpenAI-compatible endpoint. All helpers with a leading
   *    underscore (_createOpenAI / _createDeepSeek / _aisdk …) are re-exported
   *    by Takumi for convenience.
   */
  model({ modelName, aisdk, createOpenAI, createDeepSeek }) {
    if (modelName === 'my-code-model') {
      return aisdk(
        createOpenAI({
          apiKey: process.env.MY_CODE_AGENT_API_KEY!,
          baseURL: 'https://api.example.com/v1/',
        })(modelName),
      );
    }
    if (modelName === 'my-fast-model') {
      return aisdk(
        createDeepSeek({
          apiKey: process.env.MY_CODE_AGENT_API_KEY!,
          baseURL: 'https://api.deepseek.example.com/v1/',
        })(modelName),
      );
    }
    // Return nothing → Takumi falls back to its default provider list.
  },

  /**
   * 4. Show extra info when the CLI starts (totally optional).
   */
  generalInfo() {
    return {
      'Project Type': 'Internal Dev Tools',
      'Documentation': 'https://docs.example.com/code-agent',
    };
  },
};

/* -------------------------------------------------------------------------- */
/* 2. Start Takumi                                                            */
/* -------------------------------------------------------------------------- */
await runCli({
  plugins: [myPlugin],
  productName: 'MyCodeAgent',   // shown in the banner & analytics
  version: '0.1.0',             // shown in the banner & analytics
  cwd: process.cwd(),           // optional, defaults to process.cwd()
});
```

Make it executable:

```bash
chmod +x my-code-agent.mjs
```

Now you can run **all** Takumi commands through your own CLI:

```bash
./my-code-agent.mjs "create a react component called Button"
```

---
## 3  What Else Can a Plugin Do?

The example above only used three hooks. Takumi plugins expose many more:

| Hook            | When it runs | Typical use-case |
| --------------- | ----------- | ---------------- |
| `cliStart`      | Right after the banner         |  Telemetry/analytics |
| `contextStart`  | Each time Takumi builds an AI prompt | Inject repo-specific context |
| `toolUse` / `toolUseResult` | Before & after every tool call | Logging, security approval |
| …               | *See full list in* `src/plugin.ts` |

Because plugins are just plain objects, you can bundle several hooks together, publish them to npm, or load them dynamically.

---
## 4  Takeaways

1. **`runCli`** + **Plugin API** = everything you need—no manual agent or context wiring.
2. Use the helpers (`aisdk`, `createOpenAI`, `createDeepSeek`, …) passed into the `model` hook to build custom model providers quickly.
3. Extend further by implementing more hooks or composing multiple plugins.

Happy coding! 🎉
