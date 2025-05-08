## 0.0.20

`2025-05-08`

- build: Configure API Extractor for d.ts bundling by [@sorrycc](https://github.com/sorrycc)
- build: Update dependencies and set moduleResolution to bundler by [@sorrycc](https://github.com/sorrycc)
- refactor: Log raw text from LLM responses by [@sorrycc](https://github.com/sorrycc)
- fix: Use plugin manager result to update queryContext by [@sorrycc](https://github.com/sorrycc)
- feat: add 'tak' alias for takumi CLI by [@sorrycc](https://github.com/sorrycc)
- feat: increase commit message length limit, fix retry logging by [@sorrycc](https://github.com/sorrycc)
- fix: correct BatchTool creation in tools.ts by [@sorrycc](https://github.com/sorrycc)
- feat: support dynamic package name and version in CLI by [@sorrycc](https://github.com/sorrycc)
- feat: add run command to execute shell commands via AI by [@阿平](https://github.com/阿平) in [#20](https://github.com/umijs/takumi/pull/20)
- fix: remove <thought> tags and enhance retry log by [@sorrycc](https://github.com/sorrycc)
- fix: improve commit message generation retry log by [@sorrycc](https://github.com/sorrycc)
- fix: add retry logic to commit message generation by [@sorrycc](https://github.com/sorrycc)
- feat: support markdown format output by [@coderPerseus](https://github.com/coderPerseus) in [#17](https://github.com/umijs/takumi/pull/17)
- feat: add --plugin option to load plugins by [@sorrycc](https://github.com/sorrycc)
- feat: add commands plugin hook by [@sorrycc](https://github.com/sorrycc)
- feat: add config command by [@jalever](https://github.com/jalever) in [#16](https://github.com/umijs/takumi/pull/16)


## 0.0.19

`2025-04-29`

- fix: use resolvedConfig for mcpServers in buildContext by [@sorrycc](https://github.com/sorrycc)
- feat: track tools used in query session by [@sorrycc](https://github.com/sorrycc)
- feat: pass tool information to query plugin hooks by [@sorrycc](https://github.com/sorrycc)
- refactor: remove model alias file by [@sorrycc](https://github.com/sorrycc)


## 0.0.18

`2025-04-29`

- feat: add help command and --help flag by [@sorrycc](https://github.com/sorrycc)
- refactor: handle optional modelId in buildContext by [@sorrycc](https://github.com/sorrycc)
- refactor: replace home dir with ~ in workspace path by [@sorrycc](https://github.com/sorrycc)


## 0.0.17

`2025-04-29`

- feat: add lint command and implement linting functionality by [@NanLan](https://github.com/NanLan) in [#15](https://github.com/umijs/takumi/pull/15)
- feat: support test command and test-cmd param by [@NanLan](https://github.com/NanLan) in [#12](https://github.com/umijs/takumi/pull/12)
- refactor: disable file context inclusion in main context by [@sorrycc](https://github.com/sorrycc)
- feat: add generalInfo plugin hook by [@sorrycc](https://github.com/sorrycc)
- feat: handle model object in context building by [@sorrycc](https://github.com/sorrycc)
- feat: add file context management for prompt references by [@阿平](https://github.com/阿平) in [#13](https://github.com/umijs/takumi/pull/13)


## 0.0.16

`2025-04-28`

- refactor: ensure user input logging for act and ask commands by [@sorrycc](https://github.com/sorrycc)
- feat: add interactive mode to act and ask commands by [@sorrycc](https://github.com/sorrycc)
- refactor: simplify prompt handling in act command by [@sorrycc](https://github.com/sorrycc)
- refactor: extract plan logic in act command by [@sorrycc](https://github.com/sorrycc)
- refactor: consolidate logger utility by [@sorrycc](https://github.com/sorrycc)
- refactor: enhance CLI interaction using clack-prompts by [@sorrycc](https://github.com/sorrycc)
- feat: enhance CLI output using clack-prompts by [@sorrycc](https://github.com/sorrycc)
- feat: add --follow-style flag to analyze repo commit history by [@NanLan](https://github.com/NanLan) in [#8](https://github.com/umijs/takumi/pull/8)
- feat: add keyword context plugin for automatic codebase analysis by [@阿平](https://github.com/阿平) in [#7](https://github.com/umijs/takumi/pull/7)
- feat: add ask command to cli by [@NanLan](https://github.com/NanLan) in [#5](https://github.com/umijs/takumi/pull/5)
- refactor: remove redundant sessionPath assignment by [@sorrycc](https://github.com/sorrycc)
- feat(config): support --api-key argument by [@coderPerseus](https://github.com/coderPerseus) in [#6](https://github.com/umijs/takumi/pull/6)


## 0.0.15

`2025-04-27`

- refactor: remove debug log from runCli function by [@sorrycc](https://github.com/sorrycc)


## 0.0.14

`2025-04-27`

- feat: add debug log and close MCP clients in runCli by [@sorrycc](https://github.com/sorrycc)


## 0.0.13

`2025-04-27`

- fix: handle potentially undefined mcpConfig when creating clients by [@sorrycc](https://github.com/sorrycc)
- fix: add iteration limit to plan modification by [@sorrycc](https://github.com/sorrycc)
- fix: validate prompt inputs are not empty by [@sorrycc](https://github.com/sorrycc)
- feat: allow interactive plan modification before execution by [@sorrycc](https://github.com/sorrycc)
- feat: add --plan option to generate and confirm execution plan by [@sorrycc](https://github.com/sorrycc)
- feat: cli run cwd use config.root by [@聪小陈](https://github.com/聪小陈) in [#4](https://github.com/umijs/takumi/pull/4)
- fix: correct line number indexing in watch test cases by [@sorrycc](https://github.com/sorrycc)
- fix: remove build:type from build script and make it fail-safe by [@sorrycc](https://github.com/sorrycc)
- feat: add build types by [@聪小陈](https://github.com/聪小陈) in [#3](https://github.com/umijs/takumi/pull/3)


## 0.0.12

`2025-04-25`

- feat: add error logging to session by [@sorrycc](https://github.com/sorrycc)
- feat: add final response and duration to session log by [@sorrycc](https://github.com/sorrycc)
- feat: add session logging plugin by [@sorrycc](https://github.com/sorrycc)
- feat: add query lifecycle plugin hooks by [@sorrycc](https://github.com/sorrycc)
- refactor: rename plugin directory to pluginManager by [@sorrycc](https://github.com/sorrycc)
- feat: add cli and tool lifecycle plugin hooks by [@sorrycc](https://github.com/sorrycc)
- perf: dynamically import commands for faster startup by [@sorrycc](https://github.com/sorrycc)
- fix: ensure written files end with a newline by [@sorrycc](https://github.com/sorrycc)
- feat: add language configuration option by [@sorrycc](https://github.com/sorrycc)
- fix: prevent --plan in act and set OS dynamically in prompt by [@sorrycc](https://github.com/sorrycc)
- fix: improve error handling and skip large files in watch command by [@sorrycc](https://github.com/sorrycc)
- fix: remove marker and update prompt for AI comments in watch by [@sorrycc](https://github.com/sorrycc)
- fix: enhance commit command with config checks and validation by [@sorrycc](https://github.com/sorrycc)
- fix: check git exists and improve large diff handling in commit by [@sorrycc](https://github.com/sorrycc)
- feat: add --no-verify option to commit command by [@sorrycc](https://github.com/sorrycc)
- feat: add watch command by [@sorrycc](https://github.com/sorrycc)
- feat: add support for model aliases by [@sorrycc](https://github.com/sorrycc)


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


