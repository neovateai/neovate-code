## 0.7.0

`2025-08-06`

- fix: remove redundant gh pr checkout command in review slash command by [@sorrycc](https://github.com/sorrycc)
- feat: add SSE support to MCPManager [AI] by [@阿平](https://github.com/阿平) in [#154](https://github.com/umijs/takumi/pull/154)
- feat: add line limit and offset support for file reading tool [AI] by [@阿平](https://github.com/阿平) in [#153](https://github.com/umijs/takumi/pull/153)
- style: standardize font family quotes and clean up html whitespace by [@sorrycc](https://github.com/sorrycc)
- feat: add log viewer and live activity pages with real-time WebSocket support [AI] by [@sorrycc](https://github.com/sorrycc)
- feat: add history loading from JSONL files and parseJsonl utility by [@sorrycc](https://github.com/sorrycc)
- feat: add path formatting utility and update trace file location by [@sorrycc](https://github.com/sorrycc)
- feat: update init command to generate comprehensive rule files with detailed development guidelines by [@sorrycc](https://github.com/sorrycc)
- refactor: move stagewise agent to plugin system and update status command by [@sorrycc](https://github.com/sorrycc)
- refactor: simplify output truncation to use line count instead of length [AI] by [@阿平](https://github.com/阿平) in [#152](https://github.com/umijs/takumi/pull/152)
- refactor: exclude multiple lock files from git diff in review command by [@sorrycc](https://github.com/sorrycc)
- feat: add review command for pull request and staged changes analysis [AI] by [@sorrycc](https://github.com/sorrycc)
- fix: handle tool result errors and stringify non-string messages in jsonl plugin by [@sorrycc](https://github.com/sorrycc)
- feat: implement jsonl logging plugin and update git status handling [AI] by [@sorrycc](https://github.com/sorrycc)
- feat: add nested commit.language config support and improve config get/set [AI] by [@sorrycc](https://github.com/sorrycc)
- feat: add env flag to toggle ide contributor by [@阿平](https://github.com/阿平) in [#151](https://github.com/umijs/takumi/pull/151)
- fix: correct typo in bash command result property and truncate messages by [@阿平](https://github.com/阿平) in [#150](https://github.com/umijs/takumi/pull/150)
- feat: add support for openrouter/horizon-beta model with 256k context limit by [@sorrycc](https://github.com/sorrycc)
- feat: add k2-turbo model support by [@sorrycc](https://github.com/sorrycc)
- feat: add shell execution utilities with encoding detection by [@阿平](https://github.com/阿平) in [#147](https://github.com/umijs/takumi/pull/147)
- feat: add timeout configuration for MCP tool calls by [@阿平](https://github.com/阿平) in [#146](https://github.com/umijs/takumi/pull/146)
- feat: add approval memory to context and sync with app state by [@阿平](https://github.com/阿平) in [#145](https://github.com/umijs/takumi/pull/145)


## 0.6.0

`2025-07-31`

- fix: remove unnecessary newline in CLI output by [@sorrycc](https://github.com/sorrycc)
- fix: pipe and jq don't work by [@sorrycc](https://github.com/sorrycc)
- refactor: update model aliases and info with new providers and limits by [@sorrycc](https://github.com/sorrycc)
- feat: add iFlow AI model provider by [@sorrycc](https://github.com/sorrycc)
- feat: add file path detection to slash command parser by [@阿平](https://github.com/阿平) in [#144](https://github.com/umijs/takumi/pull/144)
- feat: add frontmatter support for command descriptions by [@阿平](https://github.com/阿平) in [#143](https://github.com/umijs/takumi/pull/143)
- fix: handling the case for unclosed tool arguments parsing by [@阿平](https://github.com/阿平) in [#142](https://github.com/umijs/takumi/pull/142)
- refactor: move todo directory to global config dir by [@sorrycc](https://github.com/sorrycc)
- fix: exit process after commit by [@sorrycc](https://github.com/sorrycc)
- feat: add --no-mcp flag to disable MCP servers by [@sorrycc](https://github.com/sorrycc)
- feat: Add env var to control console patching by [@sorrycc](https://github.com/sorrycc)
- feat: add stagewise command and improve agent description by [@阿平](https://github.com/阿平) in [#141](https://github.com/umijs/takumi/pull/141)
- feat: add result param to toolResult plugin interface by [@阿平](https://github.com/阿平) in [#139](https://github.com/umijs/takumi/pull/139)
- perf: optimize resize debounce with width threshold check by [@阿平](https://github.com/阿平) in [#140](https://github.com/umijs/takumi/pull/140)
- fix: only patch console when not in quiet mode by [@阿平](https://github.com/阿平) in [#138](https://github.com/umijs/takumi/pull/138)
- refactor: update toolResult plugin interface params by [@阿平](https://github.com/阿平) in [#137](https://github.com/umijs/takumi/pull/137)
- feat: add toolResultFormat hook for custom tool output formatting by [@阿平](https://github.com/阿平) in [#136](https://github.com/umijs/takumi/pull/136)
- fix: patch marked-terminal to handle nested list items correctly by [@阿平](https://github.com/阿平) in [#135](https://github.com/umijs/takumi/pull/135)
- feat: add OpenRouter Qwen models and update Gemini Flash Lite model by [@sorrycc](https://github.com/sorrycc)
- feat: add Stagewise agent integration with enhanced logging [AI] by [@sorrycc](https://github.com/sorrycc)
- fix: add websocket connection check before sending message by [@阿平](https://github.com/阿平) in [#134](https://github.com/umijs/takumi/pull/134)
- feat: add support for new OpenRouter model qwen/qwen3-235b-a22b-07-25 by [@@_@](https://github.com/@_@) in [#133](https://github.com/umijs/takumi/pull/133)
- fix: improve json parsing for tool use arguments by [@阿平](https://github.com/阿平) in [#128](https://github.com/umijs/takumi/pull/128)
- feat: add token usage display when ctrl+c is pressed by [@阿平](https://github.com/阿平) in [#127](https://github.com/umijs/takumi/pull/127)


## 0.5.1

`2025-07-21`

- fix: limit tool use to one and improve diff param handling by [@sorrycc](https://github.com/sorrycc)
- feat: add Groq API model support by [@sorrycc](https://github.com/sorrycc)
- feat: add appendSystemPrompt option to argv configuration by [@阿平](https://github.com/阿平) in [#123](https://github.com/umijs/takumi/pull/123)
- feat: update code agent prompts and simplify todo tool descriptions by [@阿平](https://github.com/阿平) in [#122](https://github.com/umijs/takumi/pull/122)
- feat: add automatic conversation compression based on token limits by [@阿平](https://github.com/阿平) in [#124](https://github.com/umijs/takumi/pull/124)


## 0.5.0

`2025-07-16`

- feat: add todo tool for task management by [@阿平](https://github.com/阿平) in [#118](https://github.com/umijs/takumi/pull/118)
- feat(broswer): Allow drag pictures to context by [@Z-Bokle](https://github.com/Z-Bokle) in [#116](https://github.com/umijs/takumi/pull/116)
- fix(browser): duplicate write while editing by [@thy](https://github.com/thy) in [#120](https://github.com/umijs/takumi/pull/120)
- feat(browser): optimize cancel request [AI] by [@ZhangBo](https://github.com/ZhangBo) in [#111](https://github.com/umijs/takumi/pull/111)
- feat: add review staged docs and handle partial XML in streams [AI] by [@sorrycc](https://github.com/sorrycc)
- feat: enhance file path resolution logic to recognize 'at' symbol for plugins by [@sorrycc](https://github.com/sorrycc)
- feat: add image file support to read and mcp tool support image by [@阿平](https://github.com/阿平) in [#115](https://github.com/umijs/takumi/pull/115)
- fix: resolve race conditions in text input cursor handling by [@阿平](https://github.com/阿平) in [#96](https://github.com/umijs/takumi/pull/96)
- feat: add Moonshot model integration support by [@sorrycc](https://github.com/sorrycc)


## 0.4.0

`2025-07-14`

- feat: add VS Code extension workspace and build scripts by [@sorrycc](https://github.com/sorrycc)
- feat: enhance context contributors with prompt parameter and file content integration [AI] by [@sorrycc](https://github.com/sorrycc)
- feat: enable IDE workspace context with WebSocket connection handling by [@sorrycc](https://github.com/sorrycc)
- feat: add openrouter/k2 model alias and update approved list by [@sorrycc](https://github.com/sorrycc)
- feat: Add IDE extension installation and detection workflow [AI] by [@sorrycc](https://github.com/sorrycc)
- feat(browser): upgrade context popup by [@Z-Bokle](https://github.com/Z-Bokle) in [#99](https://github.com/umijs/takumi/pull/99)
- feat: add environment variables to context by [@sorrycc](https://github.com/sorrycc)
- refactor: Simplify IDE initialization and add connection status tracking [AI] by [@sorrycc](https://github.com/sorrycc)
- refactor: extract tool names to constants for centralized management by [@sorrycc](https://github.com/sorrycc)
- fix: validate params type in tool message component by [@阿平](https://github.com/阿平) in [#114](https://github.com/umijs/takumi/pull/114)
- feat: allow all bash commands and enable external host access by [@阿平](https://github.com/阿平) in [#113](https://github.com/umijs/takumi/pull/113)
- refactor: improve tool use formatting with detailed descriptions and error handling by [@阿平](https://github.com/阿平) in [#110](https://github.com/umijs/takumi/pull/110)
- feat: update IDE methods and add new functionality to diff handling by [@sorrycc](https://github.com/sorrycc)
- feat: add jsonrepair for handling malformed json in message parsing by [@阿平](https://github.com/阿平) in [#109](https://github.com/umijs/takumi/pull/109)
- feat: update terminal title without star prefix by [@sorrycc](https://github.com/sorrycc)
- feat: implement double ctrl+c exit warning with timeout handler [AI] by [@sorrycc](https://github.com/sorrycc)
- refactor: improve bash tool with safer command execution and validation [AI] by [@阿平](https://github.com/阿平) in [#106](https://github.com/umijs/takumi/pull/106)
- refactor: improve tool use formatting and documentation clarity by [@阿平](https://github.com/阿平) in [#105](https://github.com/umijs/takumi/pull/105)
- feat: enhance directory structure contributor with formatted output by [@阿平](https://github.com/阿平) in [#107](https://github.com/umijs/takumi/pull/107)
- refactor: improve diff viewer component layout and stats rendering by [@阿平](https://github.com/阿平) in [#103](https://github.com/umijs/takumi/pull/103)


## 0.3.0

`2025-07-08`

- feat: add custom system prompt support for code agent [AI] by [@sorrycc](https://github.com/sorrycc)
- fix: handle undefined file paths and improve error messaging with context by [@sorrycc](https://github.com/sorrycc)
- feat: support product-specific ignore files [AI] by [@sorrycc](https://github.com/sorrycc)
- feat: add interactive mode switching [AI] by [@sorrycc](https://github.com/sorrycc)
- refactor: remove TAKUMI_FC flag and streamline model provider access by [@sorrycc](https://github.com/sorrycc)
- refactor(browser): context UI upgrade and image url to base64 [AI] by [@Z-Bokle](https://github.com/Z-Bokle) in [#94](https://github.com/umijs/takumi/pull/94)
- refactor: simplify compact agent instructions and xml structure by [@阿平](https://github.com/阿平) in [#102](https://github.com/umijs/takumi/pull/102)
- feat: add compact command to summarize conversation history by [@阿平](https://github.com/阿平) in [#101](https://github.com/umijs/takumi/pull/101)
- feat: add external editor support for file modifications [AI] by [@阿平](https://github.com/阿平) in [#97](https://github.com/umijs/takumi/pull/97)
- feat: add model-specific tool prompt formatting by [@阿平](https://github.com/阿平) in [#100](https://github.com/umijs/takumi/pull/100)
- refactor: make auto suggestion item description optional by [@sorrycc](https://github.com/sorrycc)
- fix: refine suggestion acceptance for file and slash commands [AI] by [@sorrycc](https://github.com/sorrycc)
- feat(browser): markdown render & tool call loading by [@thy](https://github.com/thy) in [#93](https://github.com/umijs/takumi/pull/93)
- feat: add file auto-suggestion with gitignore support [AI] by [@sorrycc](https://github.com/sorrycc)
- feat: add init command and improve chat input UI text by [@阿平](https://github.com/阿平) in [#92](https://github.com/umijs/takumi/pull/92)
- fix(browser): fixed problem about Sender won't clear content when submit by [@Z-Bokle](https://github.com/Z-Bokle) in [#91](https://github.com/umijs/takumi/pull/91)


## 0.2.0

`2025-07-04`


## 0.1.10

`2025-07-04`

- feat: add multiline text input support with arrow key navigation by [@阿平](https://github.com/阿平) in [#88](https://github.com/umijs/takumi/pull/88)
- feat: add debounced resize handler for terminal window [AI] by [@阿平](https://github.com/阿平) in [#90](https://github.com/umijs/takumi/pull/90)
- feat: set terminal title for default command [AI] by [@sorrycc](https://github.com/sorrycc)
- refactor: stream shell command output directly [AI] by [@sorrycc](https://github.com/sorrycc)
- feat(cli): implement terminal resize handling to force component re-render by [@YK菌](https://github.com/YK菌) in [#87](https://github.com/umijs/takumi/pull/87)
- refactor: use proper enum type for plugin hook type in command registry by [@阿平](https://github.com/阿平) in [#89](https://github.com/umijs/takumi/pull/89)
- feat(browser): edit & write tool render by [@thy](https://github.com/thy) in [#78](https://github.com/umijs/takumi/pull/78)
- feat(browser): optimize chat sender by [@Z-Bokle](https://github.com/Z-Bokle) in [#86](https://github.com/umijs/takumi/pull/86)
- feat: implement query cancellation via escape key [AI] by [@sorrycc](https://github.com/sorrycc)
- feat: add exit slash command by [@sorrycc](https://github.com/sorrycc)
- feat: add approval memory persistence to context [AI] by [@阿平](https://github.com/阿平) in [#84](https://github.com/umijs/takumi/pull/84)
- refactor: convert clear command to JSX and clear chat state by [@sorrycc](https://github.com/sorrycc)
- fix: stop query on denied tool execution [AI] by [@sorrycc](https://github.com/sorrycc)
- feat: display relative paths in tool descriptions by [@sorrycc](https://github.com/sorrycc)
- refactor: unify tool result format and simplify UI formatting [AI] by [@sorrycc](https://github.com/sorrycc)
- fix: simplify push rejection check by [@sorrycc](https://github.com/sorrycc)
- fix: show git command output by [@sorrycc](https://github.com/sorrycc)
- feat(browser): implement tool approval system with UI components and backend service [AI] by [@阿平](https://github.com/阿平) in [#83](https://github.com/umijs/takumi/pull/83)
- feat: add openrouter cypher model and inline gemini pro constant by [@sorrycc](https://github.com/sorrycc)
- fix: force executeQuery to code stage after plan approval [AI] by [@sorrycc](https://github.com/sorrycc)
- feat: enhance chat input auto-suggestion control by [@sorrycc](https://github.com/sorrycc)
- feat: move cursor to end on chat history navigation [AI] by [@sorrycc](https://github.com/sorrycc)
- feat: add slash command auto-suggestion with enhanced command matching [AI] by [@sorrycc](https://github.com/sorrycc)
- feat: add loading spinner to chat input by [@sorrycc](https://github.com/sorrycc)
- build: specify pnpm version via packageManager field by [@sorrycc](https://github.com/sorrycc)
- refactor: extract UI state to React Context and enhance quiet mode [AI] by [@sorrycc](https://github.com/sorrycc)
- feat: add comprehensive slash command system and documentation [AI] by [@sorrycc](https://github.com/sorrycc)
- fix: add simplified tool use format with environment toggle by [@阿平](https://github.com/阿平) in [#82](https://github.com/umijs/takumi/pull/82)
- fix(browser): handle default values for attachedContexts in multiple files #81 by [@阿平](https://github.com/阿平)
- feat: add spinner to processing state [AI] by [@sorrycc](https://github.com/sorrycc)
- feat: only include directory structure for projects [AI] by [@sorrycc](https://github.com/sorrycc)


## 0.1.9

`2025-07-01`

- fix: create tracing output directory if missing by [@sorrycc](https://github.com/sorrycc)


## 0.1.8

`2025-07-01`

- feat: add branch generation and checkout functionality [AI] by [@sorrycc](https://github.com/sorrycc)
- feat: add --ai option to append [AI] suffix to commit [AI] by [@sorrycc](https://github.com/sorrycc)
- refactor: improve Git command error handling and robustness by [@sorrycc](https://github.com/sorrycc)
- refactor: show generated commit message earlier by [@sorrycc](https://github.com/sorrycc)
- fix: simplify result assignment in service class by [@阿平](https://github.com/阿平) in [#80](https://github.com/umijs/takumi/pull/80)
- feat: introduce granular tool approval with UI and modes [AI] by [@sorrycc](https://github.com/sorrycc)
- feat: enhance user message handling and context management in chat UI by [@阿平](https://github.com/阿平) in [#79](https://github.com/umijs/takumi/pull/79)
- feat: add enable and disable commands for MCP servers by [@sorrycc](https://github.com/sorrycc)
- feat: add and display tool messages for grep and glob by [@sorrycc](https://github.com/sorrycc)


## 0.1.7

`2025-06-30`

- refactor: history items to structured message format; update Gemini Pro model by [@sorrycc](https://github.com/sorrycc)
- feat(browser): takumi settings page by [@YK菌](https://github.com/YK菌) in [#75](https://github.com/umijs/takumi/pull/75)
- feat(browser): add plan mode to enhance task management functionality by [@阿平](https://github.com/阿平) in [#77](https://github.com/umijs/takumi/pull/77)


## 0.1.6

`2025-06-30`

- feat: add tracing to commit and run commands by [@sorrycc](https://github.com/sorrycc)


## 0.1.5

`2025-06-27`

- refactor: replace ConfigManager with Context for configuration management by [@sorrycc](https://github.com/sorrycc)


## 0.1.4

`2025-06-27`

- build: consolidate browser output and refine build steps by [@sorrycc](https://github.com/sorrycc)
- refactor: rename runBrowser to runServer and update model handling by [@sorrycc](https://github.com/sorrycc)


## 0.1.3

`2025-06-27`

- refactor: rename CreateContextOptions to CreateContextOpts by [@sorrycc](https://github.com/sorrycc)


## 0.1.2

`2025-06-27`


## 0.1.1

`2025-06-27`

- feat: allow async plugin hooks and store argv config by [@sorrycc](https://github.com/sorrycc)


## 0.1.0

`2025-06-27`

- feat: add minor and major release scripts by [@sorrycc](https://github.com/sorrycc)


## 0.0.35

`2025-06-27`

- feat: allow reading prompt from stdin when non-interactive by [@sorrycc](https://github.com/sorrycc)
- feat: introduce global rules and rename code style contributor by [@sorrycc](https://github.com/sorrycc)
- refactor: revamp plugin system API and docs by [@sorrycc](https://github.com/sorrycc)
- refactor: improve context handling in browser UI by [@xierenyuan](https://github.com/xierenyuan) in [#76](https://github.com/umijs/takumi/pull/76)
- refactor(McpDropdown): remove window focus event listener and clean up useEffect by [@yk2012](https://github.com/yk2012) in [#74](https://github.com/umijs/takumi/pull/74)
- refactor: define Gemini model constants and update provider lists by [@sorrycc](https://github.com/sorrycc)
- refactor(browser): refactoring the browser bottom navigation bar by [@xierenyuan](https://github.com/xierenyuan) in [#73](https://github.com/umijs/takumi/pull/73)
- feat: ban more dangerous commands in bash tool by [@sorrycc](https://github.com/sorrycc)
- feat: add chat input history navigation by [@sorrycc](https://github.com/sorrycc)
- feat(browser): add mcp management by [@yk2012](https://github.com/yk2012) in [#71](https://github.com/umijs/takumi/pull/71)
- feat: add picocolors and merge consecutive system messages functionality [AI] by [@xierenyuan](https://github.com/xierenyuan) in [#72](https://github.com/umijs/takumi/pull/72)
- refactor: simplify ChatInput rendering logic by [@sorrycc](https://github.com/sorrycc)
- refactor: use React context for store management [AI] by [@sorrycc](https://github.com/sorrycc)
- fix: handle and display query errors in UI by [@sorrycc](https://github.com/sorrycc)
- feat(browser): mode switch bar by [@biu9](https://github.com/biu9) in [#70](https://github.com/umijs/takumi/pull/70)
- refactor: extract delay utility to shared module by [@sorrycc](https://github.com/sorrycc)
- refactor: improve browser dist path resolution and update descriptions by [@sorrycc](https://github.com/sorrycc)
- build: include dist-browser files in package by [@sorrycc](https://github.com/sorrycc)
- refactor: use context object for app info and remove trace file by [@sorrycc](https://github.com/sorrycc)
- feat: display general information in UI by [@sorrycc](https://github.com/sorrycc)
- refactor: move initial query delay and remove streaming delay by [@sorrycc](https://github.com/sorrycc)
- refactor: cast imported plugins to Plugin type by [@sorrycc](https://github.com/sorrycc)
- feat: support commonjs and esm plugin formats with jiti by [@sorrycc](https://github.com/sorrycc)
- fix: Improve caching, tool message display, and UI state handling by [@sorrycc](https://github.com/sorrycc)
- fix: move default model setting to config by [@sorrycc](https://github.com/sorrycc)
- feat: improve tool message display with error handling by [@sorrycc](https://github.com/sorrycc)
- feat: add tracing functionality and enhance UI with general info display by [@xierenyuan](https://github.com/xierenyuan) in [#67](https://github.com/umijs/takumi/pull/67)
- feat: expose ai-sdk utility by [@sorrycc](https://github.com/sorrycc)
- feat: enhance i18n support with provider and language switcher by [@xierenyuan](https://github.com/xierenyuan) in [#68](https://github.com/umijs/takumi/pull/68)
- feat: enhance AssistantThinkingMessage with improved UI and functionality by [@xierenyuan](https://github.com/xierenyuan) in [#66](https://github.com/umijs/takumi/pull/66)
- feat(browser): basic tool render by [@biu9](https://github.com/biu9) in [#60](https://github.com/umijs/takumi/pull/60)
- fix: add null checks for annotations in UserMessage components by [@Z-Bokle](https://github.com/Z-Bokle)
- feature: update browser sender and context by [@Z-Bokle](https://github.com/Z-Bokle) in [#61](https://github.com/umijs/takumi/pull/61)
- feat: enhance mergeMessages to handle reasoning messages accumulation by [@xierenyuan](https://github.com/xierenyuan) in [#64](https://github.com/umijs/takumi/pull/64)
- refactor: replace hardcoded product name with constant by [@sorrycc](https://github.com/sorrycc)
- refactor: update completions route to use service in server setup by [@xierenyuan](https://github.com/xierenyuan) in [#63](https://github.com/umijs/takumi/pull/63)
- refactor: integrate tracing in server command and completions service by [@xierenyuan](https://github.com/xierenyuan) in [#62](https://github.com/umijs/takumi/pull/62)
- refactor: enhance server command with debugging and exit handling by [@xierenyuan](https://github.com/xierenyuan) in [#58](https://github.com/umijs/takumi/pull/58)
- feat: implement app data API and state management in browser by [@xierenyuan](https://github.com/xierenyuan) in [#56](https://github.com/umijs/takumi/pull/56)
- feat: add support for plugins in context and CLI options by [@xierenyuan](https://github.com/xierenyuan) in [#57](https://github.com/umijs/takumi/pull/57)
- feat: add aihubmix provider and models by [@sorrycc](https://github.com/sorrycc)
- fix: add signal handlers for graceful shutdown by [@sorrycc](https://github.com/sorrycc)
- refactor: simplify completions service by removing BrowserService class by [@xierenyuan](https://github.com/xierenyuan) in [#55](https://github.com/umijs/takumi/pull/55)
- refactor: refactor service instantiation and tool management by [@sorrycc](https://github.com/sorrycc)
- refactor: use first plugin hook for model resolution by [@sorrycc](https://github.com/sorrycc)
- refactor: centralize model provider and add model plugin hook by [@sorrycc](https://github.com/sorrycc)
- refactor: modularize system prompt building with contributors by [@sorrycc](https://github.com/sorrycc)
- feat: add AssistantAvatar component and enhance chat loading state handling by [@xierenyuan](https://github.com/xierenyuan) in [#54](https://github.com/umijs/takumi/pull/54)
- refactor: change createContext to Context.create and refactor MCPManager by [@sorrycc](https://github.com/sorrycc)
- refactor: streamline service initialization and tracing by [@sorrycc](https://github.com/sorrycc)
- feat: add cliEnd hook for execution time tracking by [@sorrycc](https://github.com/sorrycc)
- refactor: centralize MCPManager lifecycle to context by [@sorrycc](https://github.com/sorrycc)
- refactor: move context init logic to createContext factory by [@sorrycc](https://github.com/sorrycc)
- feat: refactor message components and improve message handling logic by [@xierenyuan](https://github.com/xierenyuan) in [#53](https://github.com/umijs/takumi/pull/53)
- feat: display results for edit, write, ls, and fetch tools by [@sorrycc](https://github.com/sorrycc)
- feat: display bash tool output by [@sorrycc](https://github.com/sorrycc)
- feat: display human-readable output for read tool by [@sorrycc](https://github.com/sorrycc)
- refactor: consolidate default command and standardize cwd handling by [@sorrycc](https://github.com/sorrycc)
- feat: display planning status in UI by [@sorrycc](https://github.com/sorrycc)
- feat: define structured output for plan agent by [@sorrycc](https://github.com/sorrycc)
- refactor: improve context & store init, skip normal tests by [@sorrycc](https://github.com/sorrycc)
- feat: support browser by [@xierenyuan](https://github.com/xierenyuan) in [#48](https://github.com/umijs/takumi/pull/48)
- refactor: update gemini-2.5-pro to latest preview version by [@sorrycc](https://github.com/sorrycc)
- feat: add analytics tracking hooks to plugin system by [@xierenyuan](https://github.com/xierenyuan) in [#50](https://github.com/umijs/takumi/pull/50)
- feat: update Gemini 2.5 model names and add flash-lite by [@sorrycc](https://github.com/sorrycc)
- fix: conditionally apply Anthropic cache control for Sonnet models by [@sorrycc](https://github.com/sorrycc)
- refact: with @openai/agent and ai by @chencheng (云谦) in [#45](https://github.com/umijs/takumi/pull/45)
- feat: update Google Gemini Pro model to 06-05 preview by [@sorrycc](https://github.com/sorrycc)
- feat: add language parameter to system prompts for localized responses by [@xierenyuan](https://github.com/xierenyuan) in [#44](https://github.com/umijs/takumi/pull/44)
- fix: increase buffer size for git diff to handle large staged changes by [@xierenyuan](https://github.com/xierenyuan) in [#43](https://github.com/umijs/takumi/pull/43)
- feat: add Vercel AI model support by [@sorrycc](https://github.com/sorrycc)
- feat: add claude sonnet 4 by [@sorrycc](https://github.com/sorrycc)
- feat: add ripgrep integration and update grep tool by [@sorrycc](https://github.com/sorrycc)


## 0.0.34

`2025-05-22`


## 0.0.33

`2025-05-22`

- refactor: extract query context logic into separate function by [@sorrycc](https://github.com/sorrycc)


## 0.0.32

`2025-05-21`

- fix: enhance log HTML date and text display by [@sorrycc](https://github.com/sorrycc)
- feat: add log command to view JSON logs as HTML by [@Wu-kung](https://github.com/Wu-kung) in [#22](https://github.com/umijs/takumi/pull/22)
- feat: add whole-file edit mode by [@Holden Hu](https://github.com/Holden Hu) in [#40](https://github.com/umijs/takumi/pull/40)
- fix: improve markdown render by [@Roc](https://github.com/Roc) in [#35](https://github.com/umijs/takumi/pull/35)
- refactor: integrate mcp server into main cli and remove separate mcp-cli (but don't enable for now since its not ready) by [@sorrycc](https://github.com/sorrycc)
- feat: update Gemini Flash model to preview-05-20 by [@sorrycc](https://github.com/sorrycc)
- feat: add MCP server integration and CLI tools by [@Wu-kung](https://github.com/Wu-kung) in [#38](https://github.com/umijs/takumi/pull/38)
- fix: handle newline-separated thoughts in commit message by [@xierenyuan](https://github.com/xierenyuan) in [#41](https://github.com/umijs/takumi/pull/41)
- feat: add XML format validation guide prompt by [@xierenyuan](https://github.com/xierenyuan) in [#37](https://github.com/umijs/takumi/pull/37)
- feat: add askQuery and editQuery types to PluginContext by [@xierenyuan](https://github.com/xierenyuan) in [#39](https://github.com/umijs/takumi/pull/39)
- feat: update Gemini Pro to preview-05-06 by [@sorrycc](https://github.com/sorrycc)
- fix: spelling error with approvalMode by [@Roc](https://github.com/Roc) in [#34](https://github.com/umijs/takumi/pull/34)


## 0.0.31

`2025-05-14`

- fix: update approvalModel to approvalMode in tool implementations by [@sorrycc](https://github.com/sorrycc)


## 0.0.30

`2025-05-14`

- fix: update MCP server check to handle empty objects by [@sorrycc](https://github.com/sorrycc)
- feat: add resolve dependency for plugin path resolution by [@sorrycc](https://github.com/sorrycc)
- refactor: update config handling and quiet mode logic by [@sorrycc](https://github.com/sorrycc)
- feat: support hierarchical configuration from global and project level files by [@jalever](https://github.com/jalever) in [#28](https://github.com/umijs/takumi/pull/28)


## 0.0.29

`2025-05-13`

- feat: add --print-token-usage option to display token usage by [@sorrycc](https://github.com/sorrycc)
- refactor: move auto model selection to plugin by [@sorrycc](https://github.com/sorrycc)
- refactor: rename keyword-context.ts to keywordContext.ts by [@sorrycc](https://github.com/sorrycc)


## 0.0.28

`2025-05-13`

- feat: support approval-mode option by [@moonlit](https://github.com/moonlit) in [#29](https://github.com/umijs/takumi/pull/29)
- feat: add token calculator by [@Holden Hu](https://github.com/Holden Hu) in [#31](https://github.com/umijs/takumi/pull/31)
- fix: add error handling for update check in CLI by [@sorrycc](https://github.com/sorrycc)


## 0.0.27

`2025-05-12`


## 0.0.26

`2025-05-12`

- refactor: Move update check after package.json load by [@sorrycc](https://github.com/sorrycc)


## 0.0.25

`2025-05-12`

- style: Colorize update notification messages by [@sorrycc](https://github.com/sorrycc)


## 0.0.24

`2025-05-12`

- feat: display CLI version by [@sorrycc](https://github.com/sorrycc)


## 0.0.23

`2025-05-12`

- style: Remove ellipsis from thinking spinner message by [@sorrycc](https://github.com/sorrycc)
- refactor: Use fs.readFileSync to load package.json by [@sorrycc](https://github.com/sorrycc)


## 0.0.22

`2025-05-12`

- feat: add upgear configuration by [@sorrycc](https://github.com/sorrycc)


## 0.0.21

`2025-05-12`

- feat: add automatic update check by [@sorrycc](https://github.com/sorrycc)
- feat: add interactive mode to commit command by [@xierenyuan](https://github.com/xierenyuan) in [#27](https://github.com/umijs/takumi/pull/27)
- refactor: update plugin command structure for clarity by [@sorrycc](https://github.com/sorrycc)
- refactor: log intro earlier and update model selection warning by [@sorrycc](https://github.com/sorrycc)
- feat: add language option for commit messages by [@sorrycc](https://github.com/sorrycc)
- refactor: rename llm directory to llms and update imports by [@sorrycc](https://github.com/sorrycc)
- fix: remove unnecessary closing bracket in config by [@sorrycc](https://github.com/sorrycc)
- feat: enhance model selection logic and update environment configuration by [@Holden Hu](https://github.com/Holden Hu) in [#21](https://github.com/umijs/takumi/pull/21)
- feat: add startTime to file changes in session plugin by [@sorrycc](https://github.com/sorrycc)
- feat: enable plugins to react to file edits and creations by [@sorrycc](https://github.com/sorrycc)
- feat: add execution confirmation before running shell commands by [@xierenyuan](https://github.com/xierenyuan) in [#24](https://github.com/umijs/takumi/pull/24)


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
- feat: add run command to execute shell commands via AI by [@xierenyuan](https://github.com/xierenyuan) in [#20](https://github.com/umijs/takumi/pull/20)
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
- feat: add file context management for prompt references by [@xierenyuan](https://github.com/xierenyuan) in [#13](https://github.com/umijs/takumi/pull/13)


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
- feat: add keyword context plugin for automatic codebase analysis by [@xierenyuan](https://github.com/xierenyuan) in [#7](https://github.com/umijs/takumi/pull/7)
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


