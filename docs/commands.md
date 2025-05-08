# Commands

This document provides a detailed overview of the commands available in the Takumi CLI.

## General Usage

```bash
takumi [command] [prompt_or_args] [options]
```

Most commands accept general options for configuration, such as model selection, API keys, and context settings.

## (Default Command)

This is the primary and default command used to instruct Takumi to perform actions, modify code, or execute tasks based on your prompt.

**Syntax:**

```bash
takumi <prompt> [options]
```

**Description:**

Used for tasks that involve code generation, file modification, running commands, or any other active development task. Takumi will analyze the prompt, potentially use its tools (like file editing, bash execution, searching), and attempt to fulfill the request.

**Options:**

* `-m, --model <model>`: Specify the language model to use.
* `--small-model <model>`: Specify a smaller language model to use.
* `--api-key <provider=key>`: Specify the API key for the provider.
* `--stream`: Stream the response from the LLM.
* `--mcp`: Specify extra mcp servers to use.
* `-q, --quiet`: Enable non-interactive quiet mode.
* `--plan`: Before executing the task, Takumi will first generate a step-by-step execution plan. It will present this plan to you for confirmation or modification. This allows for interactive refinement before any changes are made.
* `--plan-model <model>`: Specify a different language model to use specifically for the planning phase when `--plan` is active. Defaults to the model specified by `--model`.
* `--plugin <plugin>`: Specify a plugin to use.
* `--language <language>`: Specify the language of the output, defaults to `en`.
* `--codebase <includes>`: Specify the path to the codebase to use.


**Examples:**

```bash
# Ask Takumi to add a feature
takumi "Implement a function to calculate the factorial of a number in src/mathUtils.ts"

# Ask Takumi to refactor code, requesting a plan first
takumi "Refactor the database connection logic in src/db.ts for clarity" --plan
```

## `ask`

Use this command to ask questions about your codebase, programming concepts, or anything else Takumi might be able to answer based on its context and knowledge. This command typically uses a more restricted set of tools focused on reading and searching, rather than modifying files or executing commands.

**Syntax:**

```bash
takumi ask "<prompt>" [options]
```

**Description:**

Ideal for code explanation, finding specific information within the project, or getting general programming help without risking unintended side effects.

**Options:**

* Accepts general configuration options.

**Examples:**

```bash
takumi ask "Explain the purpose of the 'useAppContext' hook in this project."

takumi ask "Where are the environment variables configured?"

takumi ask "What is the difference between '==' and '===' in JavaScript?"
```

## `commit`

Generates a conventional Git commit message based on the currently staged changes. It can optionally stage changes, perform the commit, and push to the remote repository.

**Syntax:**

```bash
takumi commit [options]
```

**Description:**

Analyzes the output of `git diff --cached` (staged changes) and uses an LLM to generate a concise, one-line commit message following conventional commit standards (e.g., `feat: add login button`).

**Options:**

* `--stage`: Automatically run `git add .` to stage all current changes before generating the commit message.
* `--commit`: After generating the message, automatically execute `git commit -m "<generated_message>"`.
* `--push`: After successfully committing (requires `--commit`), automatically execute `git push`. This only runs if a remote repository is configured.
* `--copy`: Copy the generated commit message to the system clipboard.
* `--follow-style`: Analyze the last 10 commit messages in the repository and instruct the AI to follow a similar style, while still adhering to the basic structure.
* `--no-verify`: Pass the `--no-verify` flag to the `git commit` command, bypassing pre-commit hooks. Only relevant if `--commit` is used.
* `--language <language>`: Specify the language of the commit message, defaults to `en`.

**Examples:**

```bash
# Generate a commit message for already staged changes and copy it
takumi commit --copy

# Stage all changes, generate a message, and commit
takumi commit --stage --commit

# Stage, commit, and push the changes
takumi commit --stage --commit --push

# Stage, commit, bypassing hooks
takumi commit --stage --commit --no-verify
```

## `init`

Analyzes the current project codebase and generates or updates a `TAKUMI.md` file in the project root.

**Syntax:**

```bash
takumi init [options]
```

**Description:**

This command helps Takumi understand project-specific conventions. It prompts the AI to identify build/test commands, code style guidelines (formatting, naming, imports, error handling), and other relevant development information from files like `package.json`, `.editorconfig`, existing READMEs, or linting configurations. The output is saved to `TAKUMI.md`, which is then included in Takumi's context for future interactions.

**Options:**

* Accepts general configuration options.

**Examples:**

```bash
# Run in the project root directory
takumi init
```

## `watch`

Starts Takumi in a persistent watch mode, monitoring specified files (JavaScript/TypeScript files by default) for changes.

**Syntax:**

```bash
takumi watch [options]
```

**Description:**

When a change is detected in a watched file, Takumi scans the file content for special comments:
* `// AI! <instruction>` (or similar comment syntax like `# AI!`, `-- AI!`, `; AI!`): Triggers Takumi to execute the `<instruction>` based on the surrounding code context. The comment itself will be removed after execution.
* `// AI? <question>` (or similar): Intended for asking questions related to the code block (Note: Full implementation for `?` might be pending based on `watch.ts`).

This command runs continuously until manually stopped (e.g., with Ctrl+C). It ignores files in `node_modules`, `.git`, `.umi`, and `dist` by default, and skips files larger than 100KB.

**Options:**

* Accepts general configuration options.

**Examples:**

```bash
# Start watching files in the current directory and its subdirectories
takumi watch
```

*(Then, in a watched file like `src/app.ts`, you could add a comment like `// AI! Refactor this function to use async/await` and save the file.)*

## `version`

Displays the currently installed version of the Takumi CLI.

**Syntax:**

```bash
takumi version
# or
takumi --version
# or
takumi -v
```

## `help`

Displays the help information for the Takumi CLI.

**Syntax:**

```bash
takumi help
```

## `test`

Runs the project tests and supports automatic AI-powered fixing of test failures.

**Syntax:**

```bash
takumi test [options]
```

**Description:**

Runs the project's test suite (default: `npm run test`). If the tests fail, Takumi will automatically attempt to fix the problem using AI, then re-run the tests.
This process repeats until the tests pass or the maximum number of attempts is reached (default: 10).

**Options:**

* `--test-cmd <command>`: Specify a custom test command (e.g., `npx vitest run src/tests/index.test.ts`). Default is `npm run test`.

**Examples:**

```bash
# Run the default test command
takumi test

# Run a specific test file with a custom command
takumi test --test-cmd "npx vitest run src/tests/index.test.ts"
```

## `lint`

Runs the project linter and supports automatic AI-powered fixing of lint errors.

**Syntax:**

```bash
takumi lint [options]
```

**Description:**

Runs the project's lint command (default: `npm run lint`). If linting fails, Takumi will automatically attempt to fix the problem using AI, then re-run the linter. This process repeats until the linter passes or the maximum number of attempts is reached (default: 10). If the lint command does not exist, an error is shown and no AI fix is attempted.

**Options:**

* `--lint-cmd <command>`: Specify a custom lint command (e.g., `npx eslint src/`). Default is `npm run lint`.
* Accepts general configuration options (e.g., `-m, --model`, `--api-key`, etc.).

**Examples:**

```bash
# Run the default lint command
$ takumi lint

# Run a specific linter with a custom command
$ takumi lint --lint-cmd "npx eslint src/"
```

## `config`

Interactive wizard to guide users through Takumi configuration.

**Syntax:**

```bash
takumi config
```

**Description:**

This command launches an interactive wizard that guides you through setting up Takumi configuration options. It helps configure:

* Default large model - For main AI operations
* Small model (optional) - For faster, more economical simple queries
* API keys - Based on your selected models
* Streaming mode - Toggle response streaming
* Tasks feature - Enable specialized task processing
* Language preference - Choose between English or Chinese
* MCP servers - Configure Model Control Protocol servers

All settings are saved to `~/.takumi/config.json` and apply globally across all projects.

**Examples:**

```bash
takumi config
```

## `run`
Execute shell commands using natural language, without needing to remember complex command syntax.

**Syntax:**

```bash
takumi run "<prompt>"
```

**Description:**

This command allows you to describe operations in everyday language, and Takumi will convert it into appropriate shell commands and execute them. This is especially useful for users unfamiliar with specific command parameters or syntax. Takumi will first show you the command it plans to execute, then execute it after your confirmation.

**Options:**
- `--yes`: Automatically execute the command without asking for confirmation
- `--dry-run`: Show the command that would be executed without actually running it


**Examples:**

```bash
# Undo the last commit
takumi run "Undo the last commit"

# View git repository history in text graph format
takumi run "View git repository history in text graph format"

# Used wrong username and email for git commit
takumi run "Used wrong username and email for git commit"

# Find all files containing a specific text
takumi run "Find all files containing the text 'TODO' in the src directory"

# Clean up node_modules and reinstall dependencies
takumi run "Clean up node_modules and reinstall all dependencies"

# Show the command without executing it
takumi run "Delete all .log files" --dry-run

# Execute command without confirmation
takumi run "Create a backup of the database" --yes

```

## `log`

Processes a Takumi log file and generates an HTML visualization for easier review.

**Syntax:**

```bash
takumi log <log_file_path> [options]
```

**Description:**

Converts a Takumi JSON log file into a formatted HTML file for better readability and analysis. This is particularly useful for reviewing complex interactions, debugging issues, or sharing session results with team members.

**Options:**

* `--open`: Automatically open the generated HTML file in the default browser after creation.
* `--latest`: Automatically find and process the most recent log file in the logs directory.

**Examples:**

```bash
# Convert a specific log file to HTML
takumi log ~/.takumi/logs/session-20250508.json

# Convert a specific log file and open it in the browser
takumi log ~/.takumi/logs/session-20250508.json --open

# Convert the latest log file to HTML and open it
takumi log --latest --open
```