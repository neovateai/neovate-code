# Skill Tool Implementation

## Overview

The Skill Tool allows Claude to execute skills (specialized prompt-based commands) within the main conversation. Skills provide specialized capabilities and domain knowledge.

---

## 1. Tool Definition (`cli.js:402038-402239`)

```javascript
// Tool name constant
var Mw = "Skill";  // line 380064

// Input/Output schemas (lines 402049-402061)
inputSchema = {
  skill: string  // The skill name (no arguments). E.g., "pdf" or "xlsx"
}

outputSchema = {
  success: boolean,
  commandName: string,
  allowedTools: string[] (optional),
  model: string (optional)
}
```

## 2. Tool Properties (`cli.js:402062-402071`)

| Property | Value |
|----------|-------|
| `name` | `"Skill"` |
| `userFacingName` | `"Skill"` |
| `isConcurrencySafe` | `false` |
| `isEnabled` | `true` |
| `isReadOnly` | `false` |

## 3. Prompt Generation (`cli.js:380030-380062`)

The `_B2` function generates the tool's description dynamically:

1. Fetches all available skills via `qYA()`
2. Limits skills by token budget via `TB2()` → `OV8()` (max `MV8()` characters)
3. Generates XML format for each skill using `RB2()`:

```xml
<skill>
<name>skill-name</name>
<description>...</description>
<location>...</location>
</skill>
```

The generated prompt includes:
- Instructions on how to invoke skills
- Available skills list in `<available_skills>` block
- Important notes about immediate invocation requirement

## 4. Input Validation (`cli.js:402072-402103`)

Validates the skill input through these checks:

| Check | Error Code | Description |
|-------|------------|-------------|
| Non-empty | 1 | Skill name must not be empty |
| Existence (`Cb()`) | 2 | Skill must exist in available commands |
| Loadable (`Lw()`) | 3 | Skill must be loadable |
| Model invocation | 4 | `disableModelInvocation` must be false |
| Type check | 5 | Must be a "prompt" type skill |

## 5. Permission Checking (`cli.js:402105-402149`)

Permission flow:
1. **Check deny rules first** → blocks if matched
2. **Check allow rules** → auto-allows if matched
3. **Otherwise** → returns `behavior: "ask"` with suggestions to add allow rules

Supports wildcard patterns (e.g., `ms-office-suite:*` matches all skills in that namespace).

## 6. Core Execution Logic (`cli.js:402151-402226`)

The `call()` method:

```javascript
async call({ skill: A }, Q, B, G) {
  // 1. Normalize skill name (strip leading "/")
  let Z = A.trim();
  let Y = Z.startsWith("/") ? Z.substring(1) : Z;

  // 2. Load all available commands
  let J = await sF(e1());

  // 3. Process the skill command via e01()
  let I = await e01(Y, "", J, Q);

  // 4. Extract allowed tools, model, and thinking tokens
  let X = I.allowedTools || [];
  let W = I.model;
  let K = I.maxThinkingTokens;

  // 5. Track invocation telemetry
  r("tengu_skill_tool_invocation", { command_name: V });

  // 6. Filter and transform messages (remove progress and command-message tags)
  let D = iB1(I.messages.filter(...), E);

  // 7. Return result with context modifier
  return {
    data: { success: true, commandName: Y, allowedTools, model },
    newMessages: D,
    contextModifier(H) {
      // Merges allowed tools into permission context
      // Sets model override if specified
      // Sets maxThinkingTokens if specified
    }
  };
}
```

## 7. Skill Processing via `e01()` (`cli.js:370680-370688`)

```javascript
async function e01(A, Q, B, G, Z = []) {
  // Validate command exists
  if (!Cb(A, B)) throw new s_(`Unknown command: ${A}`);

  // Load command definition
  let Y = Lw(A, B);

  // Must be a prompt type
  if (Y.type !== "prompt") throw Error(...);

  // Process the prompt via dtB()
  return dtB(Y, Q, G, [], Z);
}
```

## 8. Prompt Processing via `dtB()` (`cli.js:370689-370748`)

This function:

1. Calls `A.getPromptForCommand()` to get the skill's prompt content
2. Generates command metadata XML:
   - `<command-message>` - Status message
   - `<command-name>` - Command identifier
   - `<command-args>` - Arguments (if any)
3. Extracts allowed tools via `_AA()`
4. Creates message array with:
   - Command metadata message
   - Prompt content message (marked as `isMeta: true`)
   - Additional messages from `K01()`
   - Permission info if allowedTools or model specified

Returns:
```javascript
{
  messages: E,
  shouldQuery: true,
  allowedTools: X,
  maxThinkingTokens: K > 0 ? K : undefined,
  model: A.useSmallFastModel ? xI() : A.model,
  command: A,
}
```

## 9. Skill Filtering via `qYA()` (`cli.js:486311-486319`)

Skills shown in the tool must match ALL criteria:

- `type === "prompt"`
- `isSkill === true`
- `disableModelInvocation === false`
- `source !== "builtin"`
- Has `hasUserSpecifiedDescription` OR `whenToUse`

## 10. Helper Functions

| Function | Purpose | Location |
|----------|---------|----------|
| `Cb(A, Q)` | Check if command name exists in list | 486156 |
| `Lw(A, Q)` | Find and return command by name/alias | 486161 |
| `iB1(A, Q)` | Add `sourceToolUseID` to messages | 402027 |
| `nB1(A, Q)` | Extract tool use ID from message | 402034 |
| `sF()` | Load all commands (memoized) | 486303 |
| `qYA()` | Get skills for Skill tool (memoized) | 486311 |
| `oB1()` | Get slash commands for SlashCommand tool | 486321 |

## 11. Output Rendering Functions

| Function | Purpose |
|----------|---------|
| `L82` | Render tool use message |
| `M82` | Render progress message ("Loading…") |
| `O82` | Render rejection message (empty) |
| `R82` | Render error message |
| `q82` | Render result message |

## 12. Context Modifier

The `contextModifier` function returned by `call()` can modify:

1. **Allowed Tools**: Merges skill's allowed tools into the permission context
2. **Model Override**: Sets a different model for subsequent processing
3. **Max Thinking Tokens**: Sets thinking token budget if specified

```javascript
contextModifier(H) {
  let F = H;

  // Merge allowed tools
  if (X.length > 0) {
    F = {
      ...F,
      async getAppState() {
        let C = await Q.getAppState();
        return {
          ...C,
          toolPermissionContext: {
            ...C.toolPermissionContext,
            alwaysAllowRules: {
              ...C.toolPermissionContext.alwaysAllowRules,
              command: [...new Set([
                ...(C.toolPermissionContext.alwaysAllowRules.command || []),
                ...X,
              ])],
            },
          },
        };
      },
    };
  }

  // Set model override
  if (W) F = { ...F, options: { ...F.options, mainLoopModel: W } };

  // Set thinking tokens
  if (K !== void 0) F = { ...F, options: { ...F.options, maxThinkingTokens: K } };

  return F;
}
```

---

## Key Architecture Points

1. **Memoization**: `Z0()` is used to cache expensive operations (skill loading, prompt generation)

2. **Token Budget**: Skills are limited by `MV8()` character budget to avoid context overflow

3. **Context Modifier**: Skills can modify the execution context (allowed tools, model, thinking tokens)

4. **Permission System**: Integrates with the broader tool permission framework (deny/allow rules)

5. **Telemetry**: Tracks skill invocations via `r("tengu_skill_tool_invocation")`

6. **Message Transformation**: The `iB1()` function tags messages with `sourceToolUseID` for tracking

7. **Skill vs SlashCommand**:
   - Skills (`qYA`): `isSkill === true`
   - SlashCommands (`oB1`): `isSkill !== true`

---

## Usage Examples

```javascript
// Invoke by skill name
{ skill: "pdf" }

// Invoke with namespace
{ skill: "ms-office-suite:pdf" }

// With leading slash (auto-stripped)
{ skill: "/pdf" }
```

## Tool Result Mapping

```javascript
mapToolResultToToolResultBlockParam(A, Q) {
  return {
    type: "tool_result",
    tool_use_id: Q,
    content: `Launching skill: ${A.commandName}`,
  };
}
```
