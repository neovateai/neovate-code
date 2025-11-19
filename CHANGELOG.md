## 0.17.3

`2025-11-19`

- feat: add openai compatible provider and gemini 3 pro preview model support by [@sorrycc](https://github.com/sorrycc)
- refactor(browser): optimize tool message processing using map lookup by [@阿平](https://github.com/阿平) in [#432](https://github.com/umijs/takumi/pull/432)
- feat: pass attachments from context state to send message action by [@Z-Bokle](https://github.com/Z-Bokle) in [#359](https://github.com/umijs/takumi/pull/359)
- feat(browser): extract a standalone slash command menu by [@Z-Bokle](https://github.com/Z-Bokle) in [#358](https://github.com/umijs/takumi/pull/358)
- feat(browser): message loading & fix side bar scroll flashing by [@thy](https://github.com/thy) in [#357](https://github.com/umijs/takumi/pull/357)
- feat(browser): add toolResultPart2ToToolResultPart converter by [@阿平](https://github.com/阿平) in [#430](https://github.com/umijs/takumi/pull/430)
- feat: add workspace nodebridge handlers and test ui with react conversion by [@sorrycc](https://github.com/sorrycc)
- feat: add project info handlers and test command for browser UI by [@sorrycc](https://github.com/sorrycc)
- fix: trim and clean commit message output by [@sorrycc](https://github.com/sorrycc)
- feat: add support for anthropic models with openrouter provider by [@sorrycc](https://github.com/sorrycc)


## 0.17.2

`2025-11-17`

- feat: add tool description length limit with environment variable configuration by [@sorrycc](https://github.com/sorrycc)
- feat: add custom headers to OpenRouter provider configuration by [@sorrycc](https://github.com/sorrycc)
- feat: add sherlock dash alpha and sherlock think alpha models with openrouter provider support by [@sorrycc](https://github.com/sorrycc)


## 0.17.1

`2025-11-14`

- fix: remove duplicate and incorrect model entries by [@sorrycc](https://github.com/sorrycc)
- feat: add minimax provider by [@unknown_](https://github.com/unknown_) in [#424](https://github.com/umijs/takumi/pull/424)
- fix: remove ':free' suffix from minimax model name by [@sorrycc](https://github.com/sorrycc)
- feat: add support for GPT-5.1 models by [@sorrycc](https://github.com/sorrycc)
- feat: remove polaris-alpha model and provider mapping by [@sorrycc](https://github.com/sorrycc)
- fix: force UI re-render on fork by adding forkCounter to component keys by [@sorrycc](https://github.com/sorrycc)
- feat: add active message highlighting and UUID badges to log viewer by [@sorrycc](https://github.com/sorrycc)
- feat: make user messages clickable in log viewer with minimal details panel by [@sorrycc](https://github.com/sorrycc)
- fix: remove messages length from Static component key to prevent re-renders by [@sorrycc](https://github.com/sorrycc)
- refactor: remove redundant forkParentUuid null assignment comment by [@sorrycc](https://github.com/sorrycc)
- fix: chain messages correctly when adding multiple messages in sequence by [@阿平](https://github.com/阿平) in [#423](https://github.com/umijs/takumi/pull/423)
- feat: implement fork modal message filtering and loading state by [@sorrycc](https://github.com/sorrycc)
- fix: update gitignore and messages component key prop by [@sorrycc](https://github.com/sorrycc)
- feat: implement api key round-robin rotation with utility function by [@sorrycc](https://github.com/sorrycc)


## 0.17.0

`2025-11-12`

- feat: add log command to view session logs in HTML by [@sorrycc](https://github.com/sorrycc)
- feat: add spec:save-design slash command to save brainstorming sessions as design documents by [@sorrycc](https://github.com/sorrycc)
- feat: enhance log command with tool details and optimized request loading by [@sorrycc](https://github.com/sorrycc)
- Merge branch 'workspace/log-command' by [@sorrycc](https://github.com/sorrycc)
- feat: add log command to view session logs in HTML format by [@sorrycc](https://github.com/sorrycc)
- feat: add anthropic prompt caching for sonnet and opus models by @chencheng (云谦) in [#421](https://github.com/umijs/takumi/pull/421)
- fix: remove plan model display in status line by [@sorrycc](https://github.com/sorrycc)
- feat: show plan model in status line when configured by [@sorrycc](https://github.com/sorrycc)
- feat: change queued messages edit shortcut from up to option+up by [@sorrycc](https://github.com/sorrycc)
- feat: add temperature configuration to app by @chencheng (云谦) in [#419](https://github.com/umijs/takumi/pull/419)
- feat: add periodic background check with interval-based monitoring by [@阿平](https://github.com/阿平) in [#413](https://github.com/umijs/takumi/pull/413)
- refactor: improve image paste handling and code quality in useTextInput by [@阿平](https://github.com/阿平) in [#412](https://github.com/umijs/takumi/pull/412)


## 0.16.0

`2025-11-07`

- fix: use expanded message content in user message display by [@阿平](https://github.com/阿平) in [#415](https://github.com/umijs/takumi/pull/415)
- fix(browser): width exceeds and horizontal scrollbar appears by [@Cloudyan](https://github.com/Cloudyan) in [#414](https://github.com/umijs/takumi/pull/414)
- feat: add polaris-alpha model with 256k context and multimodal support by [@sorrycc](https://github.com/sorrycc)
- feat: add kimi-k2-thinking and kimi-k2-thinking-turbo models by [@sorrycc](https://github.com/sorrycc)
- refactor: rename biome:format script to format by @chencheng (云谦) in [#409](https://github.com/umijs/takumi/pull/409)
- feat: add safe JSON parsing for tool call inputs by [@阿平](https://github.com/阿平) in [#408](https://github.com/umijs/takumi/pull/408)
- feat: add language switching support to review command by @chencheng (云谦) in [#407](https://github.com/umijs/takumi/pull/407)
- style: clean up console error message formatting in workspace complete command by [@sorrycc](https://github.com/sorrycc)
- feat: allow workspace complete command to run from root directory by @chencheng (云谦) in [#406](https://github.com/umijs/takumi/pull/406)
- feat: add language switching support to spec commands by @chencheng (云谦) in [#405](https://github.com/umijs/takumi/pull/405)
- feat: add session ID display to status line by [@阿平](https://github.com/阿平) in [#403](https://github.com/umijs/takumi/pull/403)
- fix: add background prompt cleanup when bash commands complete by [@阿平](https://github.com/阿平) in [#402](https://github.com/umijs/takumi/pull/402)
- feat: add message normalization for compacting chat history by [@阿平](https://github.com/阿平) in [#393](https://github.com/umijs/takumi/pull/393)
- refactor: use configManager.projectConfig instead of context.config by [@YK菌](https://github.com/YK菌) in [#399](https://github.com/umijs/takumi/pull/399)
- feat: add brainstorm mode by @chencheng (云谦) in [#398](https://github.com/umijs/takumi/pull/398)
- feat: add error handling for model initialization and display in UI by @chencheng (云谦) in [#397](https://github.com/umijs/takumi/pull/397)
- feat: add golden border for high thinking effort with priority over mode colors by @chencheng (云谦) in [#396](https://github.com/umijs/takumi/pull/396)
- fix: remove spaces from MCP tool names by [@阿平](https://github.com/阿平) in [#392](https://github.com/umijs/takumi/pull/392)
- refactor: update model handling and thinking config integration by [@sorrycc](https://github.com/sorrycc)
- feat(commit): add staged file list to commit message prompt by [@sorrycc](https://github.com/sorrycc)
- feat: add interactive bash background execution prompt with ctrl+b shortcut by [@阿平](https://github.com/阿平) in [#367](https://github.com/umijs/takumi/pull/367)
- feat: add /bug command for GitHub issue reporting by [@Din](https://github.com/Din) in [#390](https://github.com/umijs/takumi/pull/390)
- feat: add incomplete tool use detection and handling on session cancel by [@阿平](https://github.com/阿平) in [#374](https://github.com/umijs/takumi/pull/374)


## 0.15.0

`2025-11-02`

- feat: add thinking status UI with Ctrl+. toggle and model-based initialization by @chencheng (云谦) in [#388](https://github.com/umijs/takumi/pull/388)
- feat: add smallModel config and quickQuery utility for fast operations by @chencheng (云谦) in [#372](https://github.com/umijs/takumi/pull/372)
- feat: update metadata path with product name in workspace by [@阿平](https://github.com/阿平) in [#371](https://github.com/umijs/takumi/pull/371)
- fix: handle tool_result type in history parsing and improve error messages by [@sorrycc](https://github.com/sorrycc)
- fix: add validation for empty summary response in compact function by [@阿平](https://github.com/阿平) in [#368](https://github.com/umijs/takumi/pull/368)
- feat: workspace command by @chencheng (云谦) in [#366](https://github.com/umijs/takumi/pull/366)
- feat: add toolChoice option to doStream call by [@sorrycc](https://github.com/sorrycc)
- fix: handle empty responses and improve error data fallback by [@sorrycc](https://github.com/sorrycc)
- style: update exit hint UI with dimmed separator and bold text by [@sorrycc](https://github.com/sorrycc)
- feat: outputStyle glob supports symbolic links by [@Cloudyan](https://github.com/Cloudyan) in [#360](https://github.com/umijs/takumi/pull/360)
- feat: add retry with exponential backoff for API errors by @chencheng (云谦) in [#361](https://github.com/umijs/takumi/pull/361)
- fix: add error handling to request logging and stream results by [@sorrycc](https://github.com/sorrycc)
- fix: move variable initialization and API call inside try block by [@sorrycc](https://github.com/sorrycc)
- feat: log raw LLM API requests and responses by [@sorrycc](https://github.com/sorrycc)
- refactor: remove openai agents dependencies and update tool handling by [@sorrycc](https://github.com/sorrycc)
- feat: display actual username instead of hardcoded 'user' and improve ui by [@sorrycc](https://github.com/sorrycc)
- feat: add bash command execution with ! prefix by [@阿平](https://github.com/阿平) in [#349](https://github.com/umijs/takumi/pull/349)
- feat: improve markdown renderer by @chencheng (云谦) in [#356](https://github.com/umijs/takumi/pull/356)
- feat: add background task management for long-running bash commands by [@阿平](https://github.com/阿平) in [#355](https://github.com/umijs/takumi/pull/355)
- feat: add minimax-m2 model by [@sorrycc](https://github.com/sorrycc)
- fix: image reading and processing by [@sorrycc](https://github.com/sorrycc)
- fix: token counting logic by [@sorrycc](https://github.com/sorrycc)
- feat(browser): add loading state and fix env display issues in MCP manager[AI] by [@YK菌](https://github.com/YK菌) in [#354](https://github.com/umijs/takumi/pull/354)
- feat: update terminal title only for early conversation messages by [@阿平](https://github.com/阿平) in [#345](https://github.com/umijs/takumi/pull/345)
- feat: native function call by @chencheng (云谦) in [#352](https://github.com/umijs/takumi/pull/352)
- refactor(browser): update mcp dropdown and manager components by [@阿平](https://github.com/阿平) in [#346](https://github.com/umijs/takumi/pull/346)
- fix: prevent slash commands from starting with /* comment syntax by [@sorrycc](https://github.com/sorrycc)
- feat: add limit parameter to grep tool for controlling result count by [@阿平](https://github.com/阿平) in [#344](https://github.com/umijs/takumi/pull/344)
- fix: update property names for event handling and token usage by [@阿平](https://github.com/阿平) in [#343](https://github.com/umijs/takumi/pull/343)
- feat: handle gemini model image data without url validation by [@阿平](https://github.com/阿平) in [#341](https://github.com/umijs/takumi/pull/341)
- feat: add commit.systemPrompt config by @chencheng (云谦) in [#342](https://github.com/umijs/takumi/pull/342)
- fix: merge consecutive system messages by [@阿平](https://github.com/阿平) in [#340](https://github.com/umijs/takumi/pull/340)
- fix: replace function call syntax with chat method calls in providers by [@阿平](https://github.com/阿平) in [#339](https://github.com/umijs/takumi/pull/339)
- feat: increase ripgrep timeout from 10s to 20s by [@阿平](https://github.com/阿平) in [#338](https://github.com/umijs/takumi/pull/338)
- dep: upgrade to ai 5 by @chencheng (云谦) in [#337](https://github.com/umijs/takumi/pull/337)
- feat: support server mode by [@阿平](https://github.com/阿平) in [#301](https://github.com/umijs/takumi/pull/301)
- refactor: remove git commit step from write-plan template by [@阿平](https://github.com/阿平) in [#331](https://github.com/umijs/takumi/pull/331)
- feat: add fallback to extract tool name from name tag when tool_name is empty by [@阿平](https://github.com/阿平) in [#329](https://github.com/umijs/takumi/pull/329)
- fix: @ suggestion is laggy in large codebase by [@sorrycc](https://github.com/sorrycc)
- feat: add cursor editor support to external editor candidates by [@阿平](https://github.com/阿平) in [#327](https://github.com/umijs/takumi/pull/327)


## 0.14.0

`2025-10-16`

- feat: add claude-haiku-4-5 model support by [@sorrycc](https://github.com/sorrycc)
- fix: The provider VolcEngine issue by [@Wu Changming](https://github.com/Wu Changming) in [#319](https://github.com/umijs/takumi/pull/319)
- fix: LSTool.execute result by [@Cloudyan](https://github.com/Cloudyan) in [#325](https://github.com/umijs/takumi/pull/325)
- feat: add spec commands for brainstorming, planning, and execution by [@sorrycc](https://github.com/sorrycc)
- feat: increase context and output limits for model by [@阿平](https://github.com/阿平) in [#324](https://github.com/umijs/takumi/pull/324)
- feat(quiet): add telemetry hook to track messages with session id by [@阿平](https://github.com/阿平) in [#316](https://github.com/umijs/takumi/pull/316)
- feat: implement conversation forking by @chencheng (云谦) in [#312](https://github.com/umijs/takumi/pull/312)
- fix: handle missing global project directory in getLatestSessionId by [@sorrycc](https://github.com/sorrycc)
- feat: add ZenMux provider with InclusionAI model support by [@明城](https://github.com/明城) in [#309](https://github.com/umijs/takumi/pull/309)
- refactor: replace console.error with debug logging for directory access errors by [@阿平](https://github.com/阿平) in [#311](https://github.com/umijs/takumi/pull/311)
- feat: filterMessages support fork by [@sorrycc](https://github.com/sorrycc)
- refactor: update chat input layout and border styling by [@sorrycc](https://github.com/sorrycc)
- feat: update global memory label to use dynamic product name by [@阿平](https://github.com/阿平) in [#308](https://github.com/umijs/takumi/pull/308)


## 0.13.0

`2025-10-10`

- feat: add filename and dimensions to image paste placeholders by [@afc163](https://github.com/afc163) in [#296](https://github.com/umijs/takumi/pull/296)
- feat: add ctrl-g external editor support for prompt editing by @chencheng (云谦) in [#307](https://github.com/umijs/takumi/pull/307)
- fix: post-process chrome-devtools-mcp bundle to replace console.error call by [@sorrycc](https://github.com/sorrycc)
- fix: update bundleMcps script to handle .mjs files and add browser module support by [@阿平](https://github.com/阿平) in [#306](https://github.com/umijs/takumi/pull/306)
- fix: handle undefined provider env in getProviderApiKey by [@sorrycc](https://github.com/sorrycc)
- feat: add empty apiKey field to copilot provider configuration by [@阿平](https://github.com/阿平) in [#305](https://github.com/umijs/takumi/pull/305)
- Revert "feat: filter models by available API keys and improve documentation (…" by [@afc163](https://github.com/afc163) in [#304](https://github.com/umijs/takumi/pull/304)
- feat: filter models by available API keys and improve documentation by [@Derek](https://github.com/Derek) in [#297](https://github.com/umijs/takumi/pull/297)
- Merge branch 'sorrycc/chrome-devtools-mcp' by [@sorrycc](https://github.com/sorrycc)
- feat: add browser integration with chrome-devtools-mcp support by [@sorrycc](https://github.com/sorrycc)
- refactor: improve ignore pattern handling and add global gitignore support by [@sorrycc](https://github.com/sorrycc)
- refactor: simplify user message detection and optimize at normalization by [@阿平](https://github.com/阿平) in [#300](https://github.com/umijs/takumi/pull/300)
- feat: add glm-4.6 model support by [@sorrycc](https://github.com/sorrycc)
- feat: support nested directory structure in command name extraction by [@阿平](https://github.com/阿平) in [#281](https://github.com/umijs/takumi/pull/281)
- feat: update login command to use PaginatedGroupSelectInput by @chencheng (云谦) in [#303](https://github.com/umijs/takumi/pull/303)
- feat: add memory rule submission with session message logging by [@sorrycc](https://github.com/sorrycc)
- feat: add delete key handling and improve escape key behavior in text input components [AI] by [@sorrycc](https://github.com/sorrycc)
- feat: support memory mode [AI] by [@sorrycc](https://github.com/sorrycc)
- feat: add support for JSON output styles and improve error handling by [@sorrycc](https://github.com/sorrycc)


## 0.12.7

`2025-10-02`

- refactor: reorganize nodeBridge handlers and improve mcp status functionality [AI] by [@sorrycc](https://github.com/sorrycc)
- refactor: rename message bus handlers to use hierarchical naming convention [AI] by [@sorrycc](https://github.com/sorrycc)
- feat: add glm-4.5-air and glm-4.5-flash models with zai-coding-plan and zhipuai providers, Close #291 by [@sorrycc](https://github.com/sorrycc)
- fix: ensure auth file directory exists before writing by [@sorrycc](https://github.com/sorrycc)


## 0.12.6

`2025-10-01`

- feat: add GLM-4.6 model with enhanced context and output limits by [@sorrycc](https://github.com/sorrycc)
- feat: add github copilot provider with login/logout support by [@sorrycc](https://github.com/sorrycc)
- feat: add claude-4-5-sonnet model with updated capabilities and limits by [@sorrycc](https://github.com/sorrycc)


## 0.12.5

`2025-09-29`

- feat: add deepseek-v3-2-exp model and update provider mappings by [@sorrycc](https://github.com/sorrycc)
- feat: add model command disable hint and validate model arg, Close #293, Close #292 by [@sorrycc](https://github.com/sorrycc)
- fix: replace tab characters with spaces and use strict equality operators by [@阿平](https://github.com/阿平) in [#294](https://github.com/umijs/takumi/pull/294)
- feat: add kimi-k2-0905-preview model to moonshot providers by [@阿平](https://github.com/阿平) in [#299](https://github.com/umijs/takumi/pull/299)
- feat: add VolcEngine provider support by [@zy520](https://github.com/zy520) in [#288](https://github.com/umijs/takumi/pull/288)
- feat: add beep utility function to emit terminal bell sound by [@sorrycc](https://github.com/sorrycc)
- refactor: make progressMessage optional in PromptCommand by [@sorrycc](https://github.com/sorrycc)
- refactor: lazy load yargs-parser in command modules by [@阿平](https://github.com/阿平) in [#286](https://github.com/umijs/takumi/pull/286)
- feat: add gemini 2.5 flash preview 2025 09 model and provider support by [@sorrycc](https://github.com/sorrycc)
- fix: prevent normal turns from being terminated when tool execution is denied by [@阿平](https://github.com/阿平) in [#284](https://github.com/umijs/takumi/pull/284)
- feat: clear message history when generating summary by [@阿平](https://github.com/阿平) in [#285](https://github.com/umijs/takumi/pull/285)
- refactor: remove unused session history tracking and related handlers by [@sorrycc](https://github.com/sorrycc)
- feat: implement global data storage for project history across sessions [AI] by [@sorrycc](https://github.com/sorrycc)
- refactor: make model id comparison case-insensitive by [@阿平](https://github.com/阿平) in [#283](https://github.com/umijs/takumi/pull/283)
- feat: add apiEnv support and default id/name for providers by [@sorrycc](https://github.com/sorrycc)
- <|begin_of_box|>docs: update npm badges to use shields.io<|end_of_box|> [AI] by [@sorrycc](https://github.com/sorrycc)


## 0.12.4

`2025-09-26`

- feat: add beep utility function to emit terminal bell sound by [@sorrycc](https://github.com/sorrycc)
- refactor: make progressMessage optional in PromptCommand by [@sorrycc](https://github.com/sorrycc)
- refactor: lazy load yargs-parser in command modules by [@阿平](https://github.com/阿平) in [#286](https://github.com/umijs/takumi/pull/286)
- feat: add gemini 2.5 flash preview 2025 09 model and provider support by [@sorrycc](https://github.com/sorrycc)
- fix: prevent normal turns from being terminated when tool execution is denied by [@阿平](https://github.com/阿平) in [#284](https://github.com/umijs/takumi/pull/284)
- feat: clear message history when generating summary by [@阿平](https://github.com/阿平) in [#285](https://github.com/umijs/takumi/pull/285)
- refactor: remove unused session history tracking and related handlers by [@sorrycc](https://github.com/sorrycc)
- feat: implement global data storage for project history across sessions [AI] by [@sorrycc](https://github.com/sorrycc)
- refactor: make model id comparison case-insensitive by [@阿平](https://github.com/阿平) in [#283](https://github.com/umijs/takumi/pull/283)
- feat: add apiEnv support and default id/name for providers by [@sorrycc](https://github.com/sorrycc)
- <|begin_of_box|>docs: update npm badges to use shields.io<|end_of_box|> [AI] by [@sorrycc](https://github.com/sorrycc)


## 0.12.3

`2025-09-24`

- feat: add SiliconFlow and SiliconFlow CN provider support by [@Pan YANG](https://github.com/Pan YANG) in [#279](https://github.com/umijs/takumi/pull/279)
- feat: add glm-4.5v model and providers by [@sorrycc](https://github.com/sorrycc)
- feat: add deepseek-v3-1-terminus model and provider mapping by [@sorrycc](https://github.com/sorrycc)


## 0.12.2

`2025-09-24`

- feat: add gpt-5-codex model with tool_call and image input support [AI] by [@sorrycc](https://github.com/sorrycc)
- refactor: optimize session boundary and assistant message detection by [@阿平](https://github.com/阿平) in [#277](https://github.com/umijs/takumi/pull/277)
- feat: add abort controller and improve cancellation handling in loop by [@阿平](https://github.com/阿平) in [#278](https://github.com/umijs/takumi/pull/278)
- feat: improve token calculation for conversation turns by [@阿平](https://github.com/阿平) in [#276](https://github.com/umijs/takumi/pull/276)
- feat: add terminal-setup command for shift+enter key bindings by [@阿平](https://github.com/阿平) in [#275](https://github.com/umijs/takumi/pull/275)
- feat: add isEnabled property to slash commands with filtering by [@阿平](https://github.com/阿平) in [#271](https://github.com/umijs/takumi/pull/271)
- fix: prevent single newlines from shift+enter being treated as paste by [@阿平](https://github.com/阿平) in [#269](https://github.com/umijs/takumi/pull/269)
- feat: add shorter alias 'neo' for neovate cli command by [@afc163](https://github.com/afc163) in [#273](https://github.com/umijs/takumi/pull/273)
- Merge pull request #270 from neovateai/chore/update-typescript-comment-remove-fallback by [@阿平](https://github.com/阿平)
- Update README.md by @chencheng (云谦)
- refactor: adjust paste detection thresholds and simplify input processing logic by [@阿平](https://github.com/阿平) in [#265](https://github.com/umijs/takumi/pull/265)
- perf: optimize terminal refresh with async resize handling and timing adjustments by [@阿平](https://github.com/阿平) in [#268](https://github.com/umijs/takumi/pull/268)


## 0.12.1

`2025-09-21`

- feat: add grok-4-fast model support [AI] by [@sorrycc](https://github.com/sorrycc)
- feat: update output-style help and make terminal title update non-blocking by [@sorrycc](https://github.com/sorrycc)

## 0.12.0

`2025-09-19`

- feat: add e2e testing framework with CLI validation by [@sorrycc](https://github.com/sorrycc)
- feat: improve slash commands filtering and dependency management by [@sorrycc](https://github.com/sorrycc)
- refactor: replace direct env access with getProviderApiKey helper by [@sorrycc](https://github.com/sorrycc)
- fix: improve input handling to support pasted content in api key field [AI] by [@sorrycc](https://github.com/sorrycc)
- feat: add support for mcp config via cli args and files [AI] by [@sorrycc](https://github.com/sorrycc)
- feat: add positional parameter support for slash commands by [@xierenyuan](https://github.com/xierenyuan) in [#266](https://github.com/umijs/takumi/pull/266)
- feat: support loading output styles from local markdown files with validation [AI] by [@sorrycc](https://github.com/sorrycc)
- feat: support parsing <argument> tag in tool use messages [AI] by [@sorrycc](https://github.com/sorrycc)
- feat: improve ripgrep path resolution and add error logging by [@xierenyuan](https://github.com/xierenyuan) in [#264](https://github.com/umijs/takumi/pull/264)
- feat: add isLocal utility to detect bun runtime by [@sorrycc](https://github.com/sorrycc)
- feat: add telemetry hook for tracking slash command execution by [@xierenyuan](https://github.com/xierenyuan) in [#258](https://github.com/umijs/takumi/pull/258)
- feat: isSlashCommand supports file parameters by [@xierenyuan](https://github.com/xierenyuan) in [#260](https://github.com/umijs/takumi/pull/260)
- refactor: move provider normalization to function and improve onboarding UI by [@sorrycc](https://github.com/sorrycc)
- feat: add login and logout slash commands with provider API key management [AI] by [@sorrycc](https://github.com/sorrycc)
- feat: add provider config support with options and model resolution by [@sorrycc](https://github.com/sorrycc)
- feat: update provider name from Moonshot to MoonshotCN by [@xierenyuan](https://github.com/xierenyuan) in [#261](https://github.com/umijs/takumi/pull/261)
- type: add missing type field for stdio transport in mcp servers by [@afc163](https://github.com/afc163) in [#262](https://github.com/umijs/takumi/pull/262)
- feat: add http transport and header/env support for mcp servers by [@sorrycc](https://github.com/sorrycc)
- feat: log server addition to config path by [@sorrycc](https://github.com/sorrycc)
- refactor: move mcpManager.initAsync to nodeBridge.ts by [@sorrycc](https://github.com/sorrycc)
- feat: support loading local project config with defu merging by [@sorrycc](https://github.com/sorrycc)
- build: remove redundant build:browser from build script by [@sorrycc](https://github.com/sorrycc)

## 0.11.0

`2025-09-17`

- feat: add update command to check and apply application updates [AI] by [@sorrycc](https://github.com/sorrycc)
- feat: add autoUpdate config and getConfig handler for automatic upgrades [AI] by [@sorrycc](https://github.com/sorrycc)
- feat: add file content limits to prevent oversized output by [@xierenyuan](https://github.com/xierenyuan) in [#256](https://github.com/umijs/takumi/pull/256)
- feat: add tab-triggered file suggestions for word completion by [@xierenyuan](https://github.com/xierenyuan) in [#255](https://github.com/umijs/takumi/pull/255)
- build: remove bun version check and update build scripts by [@afc163](https://github.com/afc163) in [#250](https://github.com/umijs/takumi/pull/250)
- feat: implement history compression with token threshold and model limits [AI] by [@xierenyuan](https://github.com/xierenyuan) in [#209](https://github.com/umijs/takumi/pull/209)
- feat: add destroy hook support for plugin lifecycle management by [@xierenyuan](https://github.com/xierenyuan) in [#254](https://github.com/umijs/takumi/pull/254)
- feat: normalize summary text by removing line breaks and extra whitespace by [@xierenyuan](https://github.com/xierenyuan) in [#253](https://github.com/umijs/takumi/pull/253)
- feat(slash-command): add session-specific model support to chat store by [@xierenyuan](https://github.com/xierenyuan) in [#247](https://github.com/umijs/takumi/pull/247)
- feat: add claude-4.1-opus model and update provider mappings by [@sorrycc](https://github.com/sorrycc)
- feat: add moonshotai provider with kimi models support by [@sorrycc](https://github.com/sorrycc)
- feat: add version flag to display version info by [@sorrycc](https://github.com/sorrycc)
- feat: add image paste support with multimodal content handling [AI] by [@xierenyuan](https://github.com/xierenyuan) in [#223](https://github.com/umijs/takumi/pull/223)
- fix: handle null text value in useTextInput onChange callback by [@xierenyuan](https://github.com/xierenyuan) in [#246](https://github.com/umijs/takumi/pull/246)
- feat: allow overriding provider API via environment variables by [@sorrycc](https://github.com/sorrycc)
- refactor: extract image extensions to constants and improve path extraction logic by [@afc163](https://github.com/afc163) in [#243](https://github.com/umijs/takumi/pull/243)
- refactor: improve params description formatting for MCP tools by [@xierenyuan](https://github.com/xierenyuan) in [#245](https://github.com/umijs/takumi/pull/245)
- style: format html and improve code structure in web-client.html by [@sorrycc](https://github.com/sorrycc)
- feat: add WebSocket server and client implementation by [@sorrycc](https://github.com/sorrycc)
- style: add ↓ to token count in activity indicator by [@sorrycc](https://github.com/sorrycc)
- feat: add image prefix removal for gemini model support by [@xierenyuan](https://github.com/xierenyuan) in [#121](https://github.com/umijs/takumi/pull/121)
- style: update assistant text color to #FF3070 by [@sorrycc](https://github.com/sorrycc)
- feat: gradient product name by [@afc163](https://github.com/afc163) in [#241](https://github.com/umijs/takumi/pull/241)
- fix: comment out JSON.stringify conversion for MCP result content by [@xierenyuan](https://github.com/xierenyuan) in [#242](https://github.com/umijs/takumi/pull/242)
- refactor: standardize tool result types and remove redundant type files by [@sorrycc](https://github.com/sorrycc)
- feat: add tool description and display name support to message rendering by [@sorrycc](https://github.com/sorrycc)
- refactor: standardize llmContent and returnDisplay handling across tools by [@sorrycc](https://github.com/sorrycc)
- refactor: remove outdated TODO comment and fix tool name mismatch by [@sorrycc](https://github.com/sorrycc)
- refactor: rename TOOL_NAME enum to TOOL_NAMES for consistency by [@sorrycc](https://github.com/sorrycc)
- feat: add safeStringify utility and support MCP result conversion to LLM content by [@sorrycc](https://github.com/sorrycc)
- fix: add restart notice after upgrade completion by [@sorrycc](https://github.com/sorrycc)
- refactor: update tool result handling and image processing logic by [@sorrycc](https://github.com/sorrycc)
- refactor: standardize tool result types and update related interfaces by [@sorrycc](https://github.com/sorrycc)
- feat: add requestId parameter to onChunk callback by [@xierenyuan](https://github.com/xierenyuan) in [#235](https://github.com/umijs/takumi/pull/235)
- fix: set minimum Node.js version to 18 for yargs compatibility by [@xierenyuan](https://github.com/xierenyuan) in [#232](https://github.com/umijs/takumi/pull/232)
- feat: prioritize name matches in slash command filtering [AI] by [@sorrycc](https://github.com/sorrycc)

## 0.10.1

`2025-09-09`

- refactor: remove ts-ignore comments and add proper type guards by [@xierenyuan](https://github.com/xierenyuan) in [#227](https://github.com/umijs/takumi/pull/227)
- feat: add onboarding flow for model configuration and improve model resolution logic by [@sorrycc](https://github.com/sorrycc)
- feat: include model context limit in model selection and state by [@sorrycc](https://github.com/sorrycc)
- refactor: simplify text interpolation in ActivityIndicator by [@xierenyuan](https://github.com/xierenyuan) in [#225](https://github.com/umijs/takumi/pull/225)
- refactor: update defaultModelCreator and clean unused imports by [@sorrycc](https://github.com/sorrycc)
- refactor: replace tiktoken with gpt-tokenizer and add tests [AI] by [@sorrycc](https://github.com/sorrycc)

## 0.10.0

`2025-09-09`

- refactor: move ToolUse and ToolUseResult types to tool.ts module [AI] by [@sorrycc](https://github.com/sorrycc)
- refactor: move message types from history to message module [AI] by [@sorrycc](https://github.com/sorrycc)
- fix: deduplicate paths in at class method by [@sorrycc](https://github.com/sorrycc)
- fix: set cursor position to end after paste operation by [@xierenyuan](https://github.com/xierenyuan) in [#224](https://github.com/umijs/takumi/pull/224)
- style: add spacing around folder and session id icons by [@sorrycc](https://github.com/sorrycc)
- feat: add token counting and streaming chunk handling with tiktoken by [@sorrycc](https://github.com/sorrycc)
- feat: add shortName to models and update status line display by [@sorrycc](https://github.com/sorrycc)
- feat: enhance @path parsing with quote and space escape support by [@sorrycc](https://github.com/sorrycc)
- feat: pasted text by @chencheng (云谦) in [#222](https://github.com/umijs/takumi/pull/222)
- feat: support mcp by [@xierenyuan](https://github.com/xierenyuan) in [#220](https://github.com/umijs/takumi/pull/220)
- refactor: export SessionConfig and update LogConfig type usage by [@sorrycc](https://github.com/sorrycc)
- fix: correct session resume message text by [@sorrycc](https://github.com/sorrycc)
- feat: add config-based summary support for conversation logs [AI] by [@xierenyuan](https://github.com/xierenyuan) in [#215](https://github.com/umijs/takumi/pull/215)
- fix: prevent slash commands from being added to history by [@sorrycc](https://github.com/sorrycc)
- feat: add page change callback to selection logic [AI] by [@xierenyuan](https://github.com/xierenyuan) in [#210](https://github.com/umijs/takumi/pull/210)
- fix: handle tool not found error in project.ts by [@sorrycc](https://github.com/sorrycc)
- feat: handle unknown slash commands by adding user message to store by [@sorrycc](https://github.com/sorrycc)
- fix: enhance provider not found error with valid providers list by [@sorrycc](https://github.com/sorrycc)
- feat: add qwen3-max and sonoma alpha models with provider mappings by [@sorrycc](https://github.com/sorrycc)
- refactor: split rule names into global and project-specific arrays by [@sorrycc](https://github.com/sorrycc)
- refactor: update plugin hook type to SeriesLast by [@xierenyuan](https://github.com/xierenyuan) in [#219](https://github.com/umijs/takumi/pull/219)
- fix: update toolUse parameter type from ProvidersMap to ToolUse by [@xierenyuan](https://github.com/xierenyuan) in [#218](https://github.com/umijs/takumi/pull/218)
- refactor: reorganize import statements for better clarity by [@xierenyuan](https://github.com/xierenyuan) in [#217](https://github.com/umijs/takumi/pull/217)
- refactor: update plugin context and model alias types by [@sorrycc](https://github.com/sorrycc)
- refactor: update plugin hooks and context handling for improved workflow and session management by [@sorrycc](https://github.com/sorrycc)
- refactor: update plugin types and remove unused import by [@sorrycc](https://github.com/sorrycc)
- refactor: update model creation and provider interfaces for consistency by [@sorrycc](https://github.com/sorrycc)
- feat: add active state color for chat arrow by [@sorrycc](https://github.com/sorrycc)
- refactor: convert exit command to jsx component with app store integration by [@xierenyuan](https://github.com/xierenyuan) in [#216](https://github.com/umijs/takumi/pull/216)
- refactor: reorder react imports in ApprovalModal.tsx by [@sorrycc](https://github.com/sorrycc)
- refactor: remove cost field from qwen3-coder-470b model config by [@sorrycc](https://github.com/sorrycc)
- feat: add kimi-k2-0905 model with updated context limit and cost details [AI] by [@sorrycc](https://github.com/sorrycc)
- fix: plugin extension slashCommands type exception by [@xierenyuan](https://github.com/xierenyuan) in [#213](https://github.com/umijs/takumi/pull/213)
- feat: export internal dependencies for plugin development by [@xierenyuan](https://github.com/xierenyuan) in [#212](https://github.com/umijs/takumi/pull/212)
- feat: add aisdk parameter to plugin resolveModelWithContext by [@sorrycc](https://github.com/sorrycc)

## 0.9.0

`2025-09-04`

- feat: add deepseek-v3-1 model and provider mapping by [@sorrycc](https://github.com/sorrycc)
- feat: set logFile path using Paths when clearing store by [@sorrycc](https://github.com/sorrycc)
- fix: improve error logging messages by [@sorrycc](https://github.com/sorrycc)
- feat: add gpt-oss-120b model and update providers map by [@sorrycc](https://github.com/sorrycc)
- fix: correctly extract model from resolved context by [@sorrycc](https://github.com/sorrycc)
- refactor: remove unused model-related types and plugin methods by [@sorrycc](https://github.com/sorrycc)
- refactor: rename hookedProviders to providers in model resolution by [@sorrycc](https://github.com/sorrycc)
- feat: add qwen3 model and improve error handling in message bus by [@sorrycc](https://github.com/sorrycc)
- refactor: move product ASCII art trimming to constants definition by [@sorrycc](https://github.com/sorrycc)
- fix: improve upgrade handling and error messaging by [@sorrycc](https://github.com/sorrycc)
- build: add publishConfig to make package public by [@sorrycc](https://github.com/sorrycc)
- refact: 202508 by @chencheng (云谦) in [#178](https://github.com/umijs/takumi/pull/178)
- fix: make diff params optional with default empty string values [AI] by [@xierenyuan](https://github.com/xierenyuan) in [#181](https://github.com/umijs/takumi/pull/181)
- feat: add async initialization and status tracking for MCP servers [AI] by [@xierenyuan](https://github.com/xierenyuan) in [#171](https://github.com/umijs/takumi/pull/171)
- feat: add tool parameter validation using zod schema by [@xierenyuan](https://github.com/xierenyuan) in [#166](https://github.com/umijs/takumi/pull/166)
- feat: add abort controller for cancellable queries [AI] by [@xierenyuan](https://github.com/xierenyuan) in [#167](https://github.com/umijs/takumi/pull/167)

## 0.8.2

`2025-08-18`

- fix: handle undefined array config values gracefully by [@sorrycc](https://github.com/sorrycc)

## 0.8.1

`2025-08-18`

## 0.8.0

`2025-08-18`

- refactor: pass config to plugin hook and use context product name by [@sorrycc](https://github.com/sorrycc)
- feat: add model selection with config persistence and agent setup by [@sorrycc](https://github.com/sorrycc)
- feat: add output style system with configurable prompt templates and slash command support [AI] by [@sorrycc](https://github.com/sorrycc)
- feat: add recursive deep file discovery for nested slash commands [AI] by [@sorrycc](https://github.com/sorrycc)
- feat: implement message queue functionality with auto-execution and UI display [AI] by [@sorrycc](https://github.com/sorrycc)
- fix: escape shell arguments to prevent command injection vulnerabilities [AI] by [@sorrycc](https://github.com/sorrycc)
- feat: add try tips hook and placeholder suggestions to chat input [AI] by [@sorrycc](https://github.com/sorrycc)
- feat: add kebabToTitleCase utility and enhance command description resolution with fallback logic [AI] by [@sorrycc](https://github.com/sorrycc)
- feat: implement command source tracking and priority-based registration [AI] by [@sorrycc](https://github.com/sorrycc)
- fix: add ts-ignore comment for LexicalTextArea component by [@sorrycc](https://github.com/sorrycc)
- feat: add plugin directory scanning for global and local plugins [AI] by [@sorrycc](https://github.com/sorrycc)
- feat: add prompt parameter to conversation hook and extract prompt from input by [@sorrycc](https://github.com/sorrycc)
- refactor: rename userMessage to userPrompt and restructure plugin hooks by [@sorrycc](https://github.com/sorrycc)
- dep: update dependencies by [@sorrycc](https://github.com/sorrycc)
- style: add type imports with verbatimModuleSyntax enabled by [@xierenyuan](https://github.com/xierenyuan) in [#163](https://github.com/umijs/takumi/pull/163)
- fix: bun compilation error due to circular references by [@xierenyuan](https://github.com/xierenyuan) in [#162](https://github.com/umijs/takumi/pull/162)
- refactor: simplify image mime type detection by accepting extension directly by [@xierenyuan](https://github.com/xierenyuan) in [#161](https://github.com/umijs/takumi/pull/161)
- build: add version check for bun before building [AI] by [@sorrycc](https://github.com/sorrycc)
- feat: add model override support for file-based slash commands [AI] by [@xierenyuan](https://github.com/xierenyuan) in [#159](https://github.com/umijs/takumi/pull/159)
- feat: add custom headers support for MCP server configuration by [@xierenyuan](https://github.com/xierenyuan) in [#157](https://github.com/umijs/takumi/pull/157)
- feat: add model selection command with interactive UI by [@xierenyuan](https://github.com/xierenyuan) in [#156](https://github.com/umijs/takumi/pull/156)
- feat: add model option to query and service run options by @chencheng (云谦) in [#155](https://github.com/umijs/takumi/pull/155)

## 0.7.1

`2025-08-06`

- fix: update logfiles directory path for non-local environments by [@sorrycc](https://github.com/sorrycc)

## 0.7.0

`2025-08-06`

- fix: remove redundant gh pr checkout command in review slash command by [@sorrycc](https://github.com/sorrycc)
- feat: add SSE support to MCPManager [AI] by [@xierenyuan](https://github.com/xierenyuan) in [#154](https://github.com/umijs/takumi/pull/154)
- feat: add line limit and offset support for file reading tool [AI] by [@xierenyuan](https://github.com/xierenyuan) in [#153](https://github.com/umijs/takumi/pull/153)
- style: standardize font family quotes and clean up html whitespace by [@sorrycc](https://github.com/sorrycc)
- feat: add log viewer and live activity pages with real-time WebSocket support [AI] by [@sorrycc](https://github.com/sorrycc)
- feat: add history loading from JSONL files and parseJsonl utility by [@sorrycc](https://github.com/sorrycc)
- feat: add path formatting utility and update trace file location by [@sorrycc](https://github.com/sorrycc)
- feat: update init command to generate comprehensive rule files with detailed development guidelines by [@sorrycc](https://github.com/sorrycc)
- refactor: move stagewise agent to plugin system and update status command by [@sorrycc](https://github.com/sorrycc)
- refactor: simplify output truncation to use line count instead of length [AI] by [@xierenyuan](https://github.com/xierenyuan) in [#152](https://github.com/umijs/takumi/pull/152)
- refactor: exclude multiple lock files from git diff in review command by [@sorrycc](https://github.com/sorrycc)
- feat: add review command for pull request and staged changes analysis [AI] by [@sorrycc](https://github.com/sorrycc)
- fix: handle tool result errors and stringify non-string messages in jsonl plugin by [@sorrycc](https://github.com/sorrycc)
- feat: implement jsonl logging plugin and update git status handling [AI] by [@sorrycc](https://github.com/sorrycc)
- feat: add nested commit.language config support and improve config get/set [AI] by [@sorrycc](https://github.com/sorrycc)
- feat: add env flag to toggle ide contributor by [@xierenyuan](https://github.com/xierenyuan) in [#151](https://github.com/umijs/takumi/pull/151)
- fix: correct typo in bash command result property and truncate messages by [@xierenyuan](https://github.com/xierenyuan) in [#150](https://github.com/umijs/takumi/pull/150)
- feat: add support for openrouter/horizon-beta model with 256k context limit by [@sorrycc](https://github.com/sorrycc)
- feat: add k2-turbo model support by [@sorrycc](https://github.com/sorrycc)
- feat: add shell execution utilities with encoding detection by [@xierenyuan](https://github.com/xierenyuan) in [#147](https://github.com/umijs/takumi/pull/147)
- feat: add timeout configuration for MCP tool calls by [@xierenyuan](https://github.com/xierenyuan) in [#146](https://github.com/umijs/takumi/pull/146)
- feat: add approval memory to context and sync with app state by [@xierenyuan](https://github.com/xierenyuan) in [#145](https://github.com/umijs/takumi/pull/145)

## 0.6.0

`2025-07-31`

- fix: remove unnecessary newline in CLI output by [@sorrycc](https://github.com/sorrycc)
- fix: pipe and jq don't work by [@sorrycc](https://github.com/sorrycc)
- refactor: update model aliases and info with new providers and limits by [@sorrycc](https://github.com/sorrycc)
- feat: add iFlow AI model provider by [@sorrycc](https://github.com/sorrycc)
- feat: add file path detection to slash command parser by [@xierenyuan](https://github.com/xierenyuan) in [#144](https://github.com/umijs/takumi/pull/144)
- feat: add frontmatter support for command descriptions by [@xierenyuan](https://github.com/xierenyuan) in [#143](https://github.com/umijs/takumi/pull/143)
- fix: handling the case for unclosed tool arguments parsing by [@xierenyuan](https://github.com/xierenyuan) in [#142](https://github.com/umijs/takumi/pull/142)
- refactor: move todo directory to global config dir by [@sorrycc](https://github.com/sorrycc)
- fix: exit process after commit by [@sorrycc](https://github.com/sorrycc)
- feat: add --no-mcp flag to disable MCP servers by [@sorrycc](https://github.com/sorrycc)
- feat: Add env var to control console patching by [@sorrycc](https://github.com/sorrycc)
- feat: add stagewise command and improve agent description by [@xierenyuan](https://github.com/xierenyuan) in [#141](https://github.com/umijs/takumi/pull/141)
- feat: add result param to toolResult plugin interface by [@xierenyuan](https://github.com/xierenyuan) in [#139](https://github.com/umijs/takumi/pull/139)
- perf: optimize resize debounce with width threshold check by [@xierenyuan](https://github.com/xierenyuan) in [#140](https://github.com/umijs/takumi/pull/140)
- fix: only patch console when not in quiet mode by [@xierenyuan](https://github.com/xierenyuan) in [#138](https://github.com/umijs/takumi/pull/138)
- refactor: update toolResult plugin interface params by [@xierenyuan](https://github.com/xierenyuan) in [#137](https://github.com/umijs/takumi/pull/137)
- feat: add toolResultFormat hook for custom tool output formatting by [@xierenyuan](https://github.com/xierenyuan) in [#136](https://github.com/umijs/takumi/pull/136)
- fix: patch marked-terminal to handle nested list items correctly by [@xierenyuan](https://github.com/xierenyuan) in [#135](https://github.com/umijs/takumi/pull/135)
- feat: add OpenRouter Qwen models and update Gemini Flash Lite model by [@sorrycc](https://github.com/sorrycc)
- feat: add Stagewise agent integration with enhanced logging [AI] by [@sorrycc](https://github.com/sorrycc)
- fix: add websocket connection check before sending message by [@xierenyuan](https://github.com/xierenyuan) in [#134](https://github.com/umijs/takumi/pull/134)
- feat: add support for new OpenRouter model qwen/qwen3-235b-a22b-07-25 by [@@\_@](https://github.com/@_@) in [#133](https://github.com/umijs/takumi/pull/133)
- fix: improve json parsing for tool use arguments by [@xierenyuan](https://github.com/xierenyuan) in [#128](https://github.com/umijs/takumi/pull/128)
- feat: add token usage display when ctrl+c is pressed by [@xierenyuan](https://github.com/xierenyuan) in [#127](https://github.com/umijs/takumi/pull/127)

## 0.5.1

`2025-07-21`

- fix: limit tool use to one and improve diff param handling by [@sorrycc](https://github.com/sorrycc)
- feat: add Groq API model support by [@sorrycc](https://github.com/sorrycc)
- feat: add appendSystemPrompt option to argv configuration by [@xierenyuan](https://github.com/xierenyuan) in [#123](https://github.com/umijs/takumi/pull/123)
- feat: update code agent prompts and simplify todo tool descriptions by [@xierenyuan](https://github.com/xierenyuan) in [#122](https://github.com/umijs/takumi/pull/122)
- feat: add automatic conversation compression based on token limits by [@xierenyuan](https://github.com/xierenyuan) in [#124](https://github.com/umijs/takumi/pull/124)

## 0.5.0

`2025-07-16`

- feat: add todo tool for task management by [@xierenyuan](https://github.com/xierenyuan) in [#118](https://github.com/umijs/takumi/pull/118)
- feat(broswer): Allow drag pictures to context by [@Z-Bokle](https://github.com/Z-Bokle) in [#116](https://github.com/umijs/takumi/pull/116)
- fix(browser): duplicate write while editing by [@thy](https://github.com/thy) in [#120](https://github.com/umijs/takumi/pull/120)
- feat(browser): optimize cancel request [AI] by [@ZhangBo](https://github.com/ZhangBo) in [#111](https://github.com/umijs/takumi/pull/111)
- feat: add review staged docs and handle partial XML in streams [AI] by [@sorrycc](https://github.com/sorrycc)
- feat: enhance file path resolution logic to recognize 'at' symbol for plugins by [@sorrycc](https://github.com/sorrycc)
- feat: add image file support to read and mcp tool support image by [@xierenyuan](https://github.com/xierenyuan) in [#115](https://github.com/umijs/takumi/pull/115)
- fix: resolve race conditions in text input cursor handling by [@xierenyuan](https://github.com/xierenyuan) in [#96](https://github.com/umijs/takumi/pull/96)
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
- fix: validate params type in tool message component by [@xierenyuan](https://github.com/xierenyuan) in [#114](https://github.com/umijs/takumi/pull/114)
- feat: allow all bash commands and enable external host access by [@xierenyuan](https://github.com/xierenyuan) in [#113](https://github.com/umijs/takumi/pull/113)
- refactor: improve tool use formatting with detailed descriptions and error handling by [@xierenyuan](https://github.com/xierenyuan) in [#110](https://github.com/umijs/takumi/pull/110)
- feat: update IDE methods and add new functionality to diff handling by [@sorrycc](https://github.com/sorrycc)
- feat: add jsonrepair for handling malformed json in message parsing by [@xierenyuan](https://github.com/xierenyuan) in [#109](https://github.com/umijs/takumi/pull/109)
- feat: update terminal title without star prefix by [@sorrycc](https://github.com/sorrycc)
- feat: implement double ctrl+c exit warning with timeout handler [AI] by [@sorrycc](https://github.com/sorrycc)
- refactor: improve bash tool with safer command execution and validation [AI] by [@xierenyuan](https://github.com/xierenyuan) in [#106](https://github.com/umijs/takumi/pull/106)
- refactor: improve tool use formatting and documentation clarity by [@xierenyuan](https://github.com/xierenyuan) in [#105](https://github.com/umijs/takumi/pull/105)
- feat: enhance directory structure contributor with formatted output by [@xierenyuan](https://github.com/xierenyuan) in [#107](https://github.com/umijs/takumi/pull/107)
- refactor: improve diff viewer component layout and stats rendering by [@xierenyuan](https://github.com/xierenyuan) in [#103](https://github.com/umijs/takumi/pull/103)

## 0.3.0

`2025-07-08`

- feat: add custom system prompt support for code agent [AI] by [@sorrycc](https://github.com/sorrycc)
- fix: handle undefined file paths and improve error messaging with context by [@sorrycc](https://github.com/sorrycc)
- feat: support product-specific ignore files [AI] by [@sorrycc](https://github.com/sorrycc)
- feat: add interactive mode switching [AI] by [@sorrycc](https://github.com/sorrycc)
- refactor: remove TAKUMI_FC flag and streamline model provider access by [@sorrycc](https://github.com/sorrycc)
- refactor(browser): context UI upgrade and image url to base64 [AI] by [@Z-Bokle](https://github.com/Z-Bokle) in [#94](https://github.com/umijs/takumi/pull/94)
- refactor: simplify compact agent instructions and xml structure by [@xierenyuan](https://github.com/xierenyuan) in [#102](https://github.com/umijs/takumi/pull/102)
- feat: add compact command to summarize conversation history by [@xierenyuan](https://github.com/xierenyuan) in [#101](https://github.com/umijs/takumi/pull/101)
- feat: add external editor support for file modifications [AI] by [@xierenyuan](https://github.com/xierenyuan) in [#97](https://github.com/umijs/takumi/pull/97)
- feat: add model-specific tool prompt formatting by [@xierenyuan](https://github.com/xierenyuan) in [#100](https://github.com/umijs/takumi/pull/100)
- refactor: make auto suggestion item description optional by [@sorrycc](https://github.com/sorrycc)
- fix: refine suggestion acceptance for file and slash commands [AI] by [@sorrycc](https://github.com/sorrycc)
- feat(browser): markdown render & tool call loading by [@thy](https://github.com/thy) in [#93](https://github.com/umijs/takumi/pull/93)
- feat: add file auto-suggestion with gitignore support [AI] by [@sorrycc](https://github.com/sorrycc)
- feat: add init command and improve chat input UI text by [@xierenyuan](https://github.com/xierenyuan) in [#92](https://github.com/umijs/takumi/pull/92)
- fix(browser): fixed problem about Sender won't clear content when submit by [@Z-Bokle](https://github.com/Z-Bokle) in [#91](https://github.com/umijs/takumi/pull/91)

## 0.2.0

`2025-07-04`

## 0.1.10

`2025-07-04`

- feat: add multiline text input support with arrow key navigation by [@xierenyuan](https://github.com/xierenyuan) in [#88](https://github.com/umijs/takumi/pull/88)
- feat: add debounced resize handler for terminal window [AI] by [@xierenyuan](https://github.com/xierenyuan) in [#90](https://github.com/umijs/takumi/pull/90)
- feat: set terminal title for default command [AI] by [@sorrycc](https://github.com/sorrycc)
- refactor: stream shell command output directly [AI] by [@sorrycc](https://github.com/sorrycc)
- feat(cli): implement terminal resize handling to force component re-render by [@YK 菌](https://github.com/YK菌) in [#87](https://github.com/umijs/takumi/pull/87)
- refactor: use proper enum type for plugin hook type in command registry by [@xierenyuan](https://github.com/xierenyuan) in [#89](https://github.com/umijs/takumi/pull/89)
- feat(browser): edit & write tool render by [@thy](https://github.com/thy) in [#78](https://github.com/umijs/takumi/pull/78)
- feat(browser): optimize chat sender by [@Z-Bokle](https://github.com/Z-Bokle) in [#86](https://github.com/umijs/takumi/pull/86)
- feat: implement query cancellation via escape key [AI] by [@sorrycc](https://github.com/sorrycc)
- feat: add exit slash command by [@sorrycc](https://github.com/sorrycc)
- feat: add approval memory persistence to context [AI] by [@xierenyuan](https://github.com/xierenyuan) in [#84](https://github.com/umijs/takumi/pull/84)
- refactor: convert clear command to JSX and clear chat state by [@sorrycc](https://github.com/sorrycc)
- fix: stop query on denied tool execution [AI] by [@sorrycc](https://github.com/sorrycc)
- feat: display relative paths in tool descriptions by [@sorrycc](https://github.com/sorrycc)
- refactor: unify tool result format and simplify UI formatting [AI] by [@sorrycc](https://github.com/sorrycc)
- fix: simplify push rejection check by [@sorrycc](https://github.com/sorrycc)
- fix: show git command output by [@sorrycc](https://github.com/sorrycc)
- feat(browser): implement tool approval system with UI components and backend service [AI] by [@xierenyuan](https://github.com/xierenyuan) in [#83](https://github.com/umijs/takumi/pull/83)
- feat: add openrouter cypher model and inline gemini pro constant by [@sorrycc](https://github.com/sorrycc)
- fix: force executeQuery to code stage after plan approval [AI] by [@sorrycc](https://github.com/sorrycc)
- feat: enhance chat input auto-suggestion control by [@sorrycc](https://github.com/sorrycc)
- feat: move cursor to end on chat history navigation [AI] by [@sorrycc](https://github.com/sorrycc)
- feat: add slash command auto-suggestion with enhanced command matching [AI] by [@sorrycc](https://github.com/sorrycc)
- feat: add loading spinner to chat input by [@sorrycc](https://github.com/sorrycc)
- build: specify pnpm version via packageManager field by [@sorrycc](https://github.com/sorrycc)
- refactor: extract UI state to React Context and enhance quiet mode [AI] by [@sorrycc](https://github.com/sorrycc)
- feat: add comprehensive slash command system and documentation [AI] by [@sorrycc](https://github.com/sorrycc)
- fix: add simplified tool use format with environment toggle by [@xierenyuan](https://github.com/xierenyuan) in [#82](https://github.com/umijs/takumi/pull/82)
- fix(browser): handle default values for attachedContexts in multiple files #81 by [@xierenyuan](https://github.com/xierenyuan)
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
- fix: simplify result assignment in service class by [@xierenyuan](https://github.com/xierenyuan) in [#80](https://github.com/umijs/takumi/pull/80)
- feat: introduce granular tool approval with UI and modes [AI] by [@sorrycc](https://github.com/sorrycc)
- feat: enhance user message handling and context management in chat UI by [@xierenyuan](https://github.com/xierenyuan) in [#79](https://github.com/umijs/takumi/pull/79)
- feat: add enable and disable commands for MCP servers by [@sorrycc](https://github.com/sorrycc)
- feat: add and display tool messages for grep and glob by [@sorrycc](https://github.com/sorrycc)

## 0.1.7

`2025-06-30`

- refactor: history items to structured message format; update Gemini Pro model by [@sorrycc](https://github.com/sorrycc)
- feat(browser): takumi settings page by [@YK 菌](https://github.com/YK菌) in [#75](https://github.com/umijs/takumi/pull/75)
- feat(browser): add plan mode to enhance task management functionality by [@xierenyuan](https://github.com/xierenyuan) in [#77](https://github.com/umijs/takumi/pull/77)

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
