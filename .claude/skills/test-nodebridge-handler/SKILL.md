---
name: test-nodebridge-handler
description: Use this skill when testing NodeBridge handlers using `bun scripts/test-nodebridge.ts`, including listing available handlers and passing parameters
---

# Test NodeBridge Handler

## Overview

This skill guides the process of testing NodeBridge message handlers using the test script.

## Usage

### List All Available Handlers

```bash
bun scripts/test-nodebridge.ts --list
```

### Test a Specific Handler

```bash
bun scripts/test-nodebridge.ts <handler> [options]
```

## Parameter Passing

### Key-Value Format

```bash
bun scripts/test-nodebridge.ts handler.name --key=value --flag=true --count=42
```

- Values are auto-converted: `true`/`false` → Boolean, numbers → Number
- Boolean flags without value: `--verbose` becomes `{ verbose: true }`

### JSON Data Format

For complex data, use `--data` with JSON (takes priority over `--key=value`):

```bash
bun scripts/test-nodebridge.ts handler.name --data='{"key":"value","nested":{"foo":"bar"}}'
```

## Available Handler Categories

| Category | Example Handlers |
|----------|------------------|
| models | `models.list`, `models.test` |
| config | `config.list` |
| providers | `providers.list` |
| mcp | `mcp.list`, `mcp.getStatus` |
| outputStyles | `outputStyles.list` |
| project | `project.getRepoInfo`, `project.workspaces.list` |
| projects | `projects.list` |
| sessions | `sessions.list` |
| skills | `skills.list`, `skills.get`, `skills.add`, `skills.remove`, `skills.preview`, `skills.install` |
| slashCommand | `slashCommand.list` |
| git | `git.status`, `git.detectGitHub` |
| utils | `utils.getPaths`, `utils.detectApps`, `utils.playSound` |

## Examples

### Test Model

```bash
bun scripts/test-nodebridge.ts models.test --model=anthropic/claude-sonnet-4-20250514
bun scripts/test-nodebridge.ts models.test --model=openai/gpt-4o --prompt="Say hello" --timeout=5000
```

### List Models

```bash
bun scripts/test-nodebridge.ts models.list
```

### Get File Paths

```bash
bun scripts/test-nodebridge.ts utils.getPaths --cwd=/path/to/dir --maxFiles=100
```

### List Projects

```bash
bun scripts/test-nodebridge.ts projects.list --includeSessionDetails=true
```

### Get Skill Details

```bash
bun scripts/test-nodebridge.ts skills.get --name=my-skill
```

### Git Status

```bash
bun scripts/test-nodebridge.ts git.status --cwd=/path/to/repo
```

## Output Format

The script outputs:
1. **Request** - JSON of the data sent to the handler
2. **Response** - JSON of the handler's return value with timing

Success response structure:
```json
{
  "success": true,
  "data": { ... }
}
```

Error response structure:
```json
{
  "success": false,
  "error": "Error message"
}
```

## Notes

- The script has a 30-second timeout for all requests
- Exit code 0 on success, 1 on error
- Use `-h` or `--help` for help message
