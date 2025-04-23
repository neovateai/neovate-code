## 0.0.11

`2025-04-23`

- fix: check for remote before pushing in commit command by [@sorrycc](https://github.com/sorrycc)
- style: improve code formatting and import order by [@sorrycc](https://github.com/sorrycc)
- feat: add version command and update module setting by [@sorrycc](https://github.com/sorrycc)
- fix: exclude lock files from staged diff in commit command by [@sorrycc](https://github.com/sorrycc)
- feat: add commit command to generate commit messages by [@sorrycc](https://github.com/sorrycc)
- refact: enhance plugin context by adding argv and updating config hook signature by [@sorrycc](https://github.com/sorrycc)
- refact: update import statements for consistency and enhance error messaging in tools by [@sorrycc](https://github.com/sorrycc)


## 0.0.10

`2025-04-22`

- refact: reorganize imports in config, index, and query files for consistency and clarity by [@sorrycc](https://github.com/sorrycc)


## 0.0.9

`2025-04-22`


## 0.0.8

`2025-04-22`

- refact: add type checking command to package.json, update model import path, and remove obsolete plugin manager tests by [@sorrycc](https://github.com/sorrycc)
- refact: move tool-related functions to a new tools.ts file and update imports in query.ts by [@sorrycc](https://github.com/sorrycc)
- refact: restructure imports and introduce new context management files by [@sorrycc](https://github.com/sorrycc)
- refact: reorganize query imports and remove unused .gitkeep file by [@sorrycc](https://github.com/sorrycc)
- refact: consolidate query functions and remove deprecated files by [@sorrycc](https://github.com/sorrycc)
- refact: enhance plugin manager with new hook types and add tests by [@sorrycc](https://github.com/sorrycc)
- refact: streamline model handling in query functions by [@sorrycc](https://github.com/sorrycc)
- refact: lots of changes by [@sorrycc](https://github.com/sorrycc)
- refact: add plugin manager by [@sorrycc](https://github.com/sorrycc)
- feat: add BatchTool by [@sorrycc](https://github.com/sorrycc)
- feat: add WebFetchTool by [@sorrycc](https://github.com/sorrycc)
- feat(TodoTool): enhance descriptions for todo management tools to promote proactive usage by [@sorrycc](https://github.com/sorrycc)
- feat(TodoTool): implement task management tools and integrate with config by [@sorrycc](https://github.com/sorrycc)
- fix(FileEditTool): catch error by [@sorrycc](https://github.com/sorrycc)
- refactor(mcp): update tool name serialization format and remove unused deserialization function by [@sorrycc](https://github.com/sorrycc)
- feat: add jsonrepair for improved JSON parsing error handling by [@sorrycc](https://github.com/sorrycc)
- refactor(BashTool): enhance execution response structure to include success status by [@sorrycc](https://github.com/sorrycc)
- refactor: rename getAllTools to getTools and streamline tool retrieval process by [@sorrycc](https://github.com/sorrycc)
- feat: add timeout functionality to tool execution with error handling by [@sorrycc](https://github.com/sorrycc)
- fix: update requirement file formatting and enhance error handling in BashTool execution by [@sorrycc](https://github.com/sorrycc)
- feat: tool calling with structure prompt by [@sorrycc](https://github.com/sorrycc)
- feat: add new OpenRouter model 'optimus-alpha' to the model list in model.ts by [@sorrycc](https://github.com/sorrycc)
- feat: update model.ts to include new Grok models and integrate XAI SDK by [@sorrycc](https://github.com/sorrycc)
- feat: add new OpenRouter model 'quasar-alpha' to the model list in model.ts by [@sorrycc](https://github.com/sorrycc)


## 0.0.7

`2025-04-07`


## 0.0.6

`2025-04-07`

- feat: enhance context handling in getConfig and runAct to support conditional tool loading based on environment variable by [@sorrycc](https://github.com/sorrycc)
- feat: update model lists in README and model.ts to include new OpenRouter and OpenAI models by [@sorrycc](https://github.com/sorrycc)
- feat: add clean option to runPlan for removing requirements file by [@sorrycc](https://github.com/sorrycc)
- Merge pull request #1 from umijs/docs-tips by @chencheng (云谦)
- Update README.md by @chencheng (云谦)


## 0.0.5

`2025-03-28`


## 0.0.4

`2025-03-28`

- refact: enhance MCP server configuration by improving server naming and command handling logic by [@sorrycc](https://github.com/sorrycc)
- refact: update MCP client creation to use new transport types and improve server handling by [@sorrycc](https://github.com/sorrycc)
- fix: rename default server naming convention to server-{index} in MCP server config by [@sorrycc](https://github.com/sorrycc)
- feat: add act command as an alias by [@sorrycc](https://github.com/sorrycc)
- feat: support --mcp to specify the mcp server by [@sorrycc](https://github.com/sorrycc)
- fix: remove existing requirements file before updating with new prompt in plan command by [@sorrycc](https://github.com/sorrycc)
- refact: update file handling in plan command and adjust .gitignore for new file names by [@sorrycc](https://github.com/sorrycc)
- feat: implement requirements management in plan command with file read/write functionality by [@sorrycc](https://github.com/sorrycc)
- fix: update getCodebaseContext call in CLI to use an empty object for improved context handling by [@sorrycc](https://github.com/sorrycc)
- feat: enhance CLI usage with new options for small model and codebase context by [@sorrycc](https://github.com/sorrycc)
- feat: add getCodebaseContext function and temporary CLI command for testing by [@sorrycc](https://github.com/sorrycc)
- fix: update context assignment in plan command to use config.context by [@sorrycc](https://github.com/sorrycc)
- feat: add Inference models and enhance logging in query and act commands by [@sorrycc](https://github.com/sorrycc)
- refact: act init and plan commands by [@sorrycc](https://github.com/sorrycc)
- feat: new plan mode by [@sorrycc](https://github.com/sorrycc)
- feat: basic plan mode by [@sorrycc](https://github.com/sorrycc)
- feat: enhance logging in CLI and query handling, adding support for new model and improved debug messages by [@sorrycc](https://github.com/sorrycc)
- feat: add new models to the list and update CLI stream handling by [@sorrycc](https://github.com/sorrycc)
- refactor: rename tool name serialization functions and enhance deserialization for improved logging by [@sorrycc](https://github.com/sorrycc)
- feat: enhance logging and CLI prompt display by [@sorrycc](https://github.com/sorrycc)


## 0.0.3

`2025-03-20`

- feat: improve logs by [@sorrycc](https://github.com/sorrycc)
- fix: remove unnecessary source map flag from CLI shebang for cleaner execution by [@sorrycc](https://github.com/sorrycc)


## 0.0.2

`2025-03-19`


## 0.0.1

`2025-03-19`


## 0.0.0

`2025-03-19`

- feat: add context by [@sorrycc](https://github.com/sorrycc)
- feat: add GrokMirror API key and model support; update test function to accept arguments for enhanced testing by [@sorrycc](https://github.com/sorrycc)
- fix: update README to replace hardcoded API key with placeholder for user configuration by [@sorrycc](https://github.com/sorrycc)
- feat: add support for MCP servers in README to highlight new feature by [@sorrycc](https://github.com/sorrycc)
- feat: add .env.example file for API key configuration; update CONTRIBUTING and README for usage instructions and examples by [@sorrycc](https://github.com/sorrycc)
- feat: implement tool name normalization in getClientsTools function to ensure consistent naming conventions by [@sorrycc](https://github.com/sorrycc)
- feat: add support for custom MCP configuration file in CLI; enhance error handling and improve code readability by [@sorrycc](https://github.com/sorrycc)
- feat: add MCP client management for enhanced tool integration; update CLI to utilize new clients and improve error handling by [@sorrycc](https://github.com/sorrycc)
- refact: clean code by [@sorrycc](https://github.com/sorrycc)
- feat: enhance CLI functionality with new test command; update model configurations and query handling for streaming responses by [@sorrycc](https://github.com/sorrycc)
- feat: update general rules and CLI configurations; add build/test commands, code style guidelines, and error handling practices by [@sorrycc](https://github.com/sorrycc)
- feat: implement initialization command with custom prompt and add product details by [@sorrycc](https://github.com/sorrycc)
- feat: introduce ArchitectTool for analyzing technical requirements and generating actionable implementation plans by [@sorrycc](https://github.com/sorrycc)
- feat: add ThinkTool for logging thoughts and brainstorming; update tool integration in getAllTools and CLI by [@sorrycc](https://github.com/sorrycc)
- feat: implement AgentTool, BashTool, FileReadTool, FileWriteTool, GlobTool, GrepTool, and LsTool for enhanced file and command management capabilities by [@sorrycc](https://github.com/sorrycc)
- feat: add GlobTool for file pattern matching and integrate it into the query function; update dependencies in package.json and pnpm-lock.yaml by [@sorrycc](https://github.com/sorrycc)
- feat: add GrepTool for pattern searching in files and directories, and include lodash-es as a dependency by [@sorrycc](https://github.com/sorrycc)
- feat: introduce FileWriteTool for writing files to the local filesystem and integrate it into the query function by [@sorrycc](https://github.com/sorrycc)
- feat: add LsTool for directory listing and update model configurations in CLI and model files by [@sorrycc](https://github.com/sorrycc)
- feat: add support for Ollama AI provider and update model selection in CLI by [@sorrycc](https://github.com/sorrycc)
- feat: implement interactive CLI with tool execution and message management by [@sorrycc](https://github.com/sorrycc)
- feat: add BashTool and integrate bash command execution by [@sorrycc](https://github.com/sorrycc)
- feat: expand model support with multiple providers and model aliases by [@sorrycc](https://github.com/sorrycc)
- feat: enhance model validation with explicit error handling by [@sorrycc](https://github.com/sorrycc)
- refactor: modularize model selection and improve logging by [@sorrycc](https://github.com/sorrycc)
- feat: add CLI tool with AI query functionality and supporting tools by [@sorrycc](https://github.com/sorrycc)
- Initial commit by [@sorrycc](https://github.com/sorrycc)


