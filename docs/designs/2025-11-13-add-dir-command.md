# /add-dir Command Implementation Design

**Date:** 2025-11-13

## Context

Referencing the implementation of the `/add-dir` command in Claude CLI, this feature is to add similar functionality in our current project. Users will be able to dynamically add extra working directories during a session, letting the AI assistant’s file tools (read, write, edit, etc.) access directories beyond the main working directory.

**Core Requirements:**
- Implement `/add-dir` slash command
- Support session-level directory storage (session-only, no persistence to local settings)
- Extract and reuse path validation logic
- Keep external editor functionality unchanged (already an independent module)
- Exclude telemetry/bacon related code

**Reference Implementation Features:**
- Comprehensive path validation (existence, directory check, duplicate check)
- Support both direct addition and interactive UI modes
- Friendly error messages
- Integration with permission system

## Discussion

### 1. Storage Method Selection

**Options Explored:**
- A. Session-level only - lost after restart
- B. Persistence only (localSettings) - saved to config file
- C. Support both, let user choose

**Final Decision:** Option A (Session-level only)
- **Rationale:** Simplifies implementation, suitable for temporary authorization scenarios
- **Implementation:** Save to session config via bridge API, support session recovery

### 2. Permission System Integration

**Current Situation Analysis:**
- Project uses zustand store for application state management
- No permission system similar to `toolPermissionContext`
- Session config managed through `SessionConfigManager`

**Final Decision:** Option B (Save to session config via bridge)
- **Rationale:** Consistent with existing architecture, supports session-level persistence
- **Storage Location:** Add new `additionalDirectories: string[]` field in Session config file

### 3. Interaction Mode

**Options Explored:**
- A. Direct path provision only
- B. Interactive UI only
- C. Support both

**Final Decision:** Option C (Support both)
- `/add-dir /path/to/dir` - Direct addition mode
- `/add-dir` - Interactive UI mode
- **Rationale:** Provides maximum flexibility, meets different use cases

### 4. Path Validation Strategy

**Options Explored:**
- A. Full validation (safest)
- B. Basic validation (existence + directory check)
- C. Minimal validation (non-empty check only)

**Final Decision:** Option A (Full validation)
- Check if path is empty
- Check if path exists
- Check if it's a directory
- Check if already in working directory (avoid duplicates)
- **Rationale:** Provides best user experience, reduces erroneous operations

### 5. Interactive UI Features

**Options Explored:**
- A. Add functionality only
- B. Add + list display
- C. Add + list + delete (complete management)

**Final Decision:** Option C (Complete management)
- Display current cwd and additional directory list
- Support adding new directories (with validation)
- Support deleting added directories
- **Rationale:** Provides complete directory management experience

## Approach

### Three Evaluated Approaches

**Approach A: Minimal Refactoring**
- All code concentrated in one file
- Don't extract path validation logic
- Complexity: ⭐⭐
- Drawback: Poor code reusability

**Approach B: Modular Refactoring ✅ (Selected)**
- Reasonable separation, balancing reusability and implementation cost
- Path validation extracted to `src/utils/path.ts`
- Hook defined within command file
- Complexity: ⭐⭐⭐
- Advantage: Clear code organization, key logic reusable

**Approach C: Full Modularization**
- Each feature is a separate file
- Includes independent component and Hook files
- Complexity: ⭐⭐⭐⭐
- Drawback: Over-engineering for simple functionality

**Final Choice:** Approach B
- Achieves optimal balance between code quality and implementation cost
- Key logic reusable, but not over-separated
- Consistent with existing project code organization style

## Architecture

### File Structure

```
src/
├── slash-commands/builtin/
│   ├── add-dir.tsx          # New: /add-dir command implementation
│   └── index.ts             # Modified: Register new command
├── utils/
│   └── path.ts              # Extended: Add path validation functions
└── nodeBridge.ts            # Extended: Add directory management API
```

### Core Components

#### 1. Path Validation (`src/utils/path.ts`)

```typescript
// Validation result types
type PathValidationResult = 
  | { resultType: 'success'; absolutePath: string }
  | { resultType: 'emptyPath' }
  | { resultType: 'pathNotFound'; directoryPath: string; absolutePath: string }
  | { resultType: 'notADirectory'; directoryPath: string; absolutePath: string }
  | { resultType: 'alreadyInWorkingDirectory'; directoryPath: string; workingDir: string };

// Core function
function validateDirectoryPath(
  inputPath: string,
  existingDirectories: string[],
  currentCwd: string
): PathValidationResult

// Helper functions
function isPathWithin(childPath: string, parentPath: string): boolean
function formatValidationMessage(result: PathValidationResult): string
```

**Validation Flow:**
1. Check empty path → `emptyPath`
2. Resolve to absolute path
3. Check path existence → `pathNotFound`
4. Check if it's a directory → `notADirectory`
5. Check if already in existing directories → `alreadyInWorkingDirectory`
6. All pass → `success`

#### 2. Bridge API Extension (`src/nodeBridge.ts`)

```typescript
interface BridgeAPI {
  // Get additional directory list
  'session.config.getAdditionalDirectories': { 
    cwd: string; 
    sessionId: string 
  } => { directories: string[] }
  
  // Add directory
  'session.config.addDirectory': { 
    cwd: string; 
    sessionId: string;
    directory: string;
  } => { success: boolean }
  
  // Remove directory
  'session.config.removeDirectory': { 
    cwd: string; 
    sessionId: string;
    directory: string;
  } => { success: boolean }
}
```

**Storage Structure:**
```typescript
interface SessionConfig {
  // ... existing fields
  additionalDirectories?: string[];  // New field
}
```

#### 3. Command Implementation (`src/slash-commands/builtin/add-dir.tsx`)

**Component Structure:**
- `DirectoryManagerComponent` - Main interactive UI component
- `DirectoryListItem` - Directory list item
- `DirectoryInputForm` - Input form
- `useDirectoryManager` - Custom Hook, manages state and operations

**Command Definition:**
```typescript
export function createAddDirCommand(): LocalJSXCommand {
  return {
    type: 'local-jsx',
    name: 'add-dir',
    description: 'Add additional working directory',
    async call(onDone, context) {
      const args = /* Get arguments from context */;
      
      if (args.trim()) {
        // Direct addition mode
        return await handleDirectAdd(args, onDone);
      } else {
        // Interactive UI mode
        return <DirectoryManagerComponent onExit={onDone} />;
      }
    }
  };
}
```

### Data Flow

#### Scenario 1: Direct Addition (`/add-dir /path/to/dir`)

```
User Input
  ↓
Parse command arguments
  ↓
validateDirectoryPath()
  ↓
Validation failed → Display error → End
  ↓
Validation success
  ↓
bridge.request('session.config.addDirectory')
  ↓
Session config updated
  ↓
Display success message → End
```

#### Scenario 2: Interactive UI (`/add-dir`)

```
User Input (no arguments)
  ↓
Render DirectoryManagerComponent
  ↓
useDirectoryManager Hook initialization
  ↓
bridge.request('session.config.getAdditionalDirectories')
  ↓
Display current directory list
  ↓
User operations:
├─ Input path + Enter
│    ↓
│  validateDirectoryPath()
│    ↓
│  bridge.request('session.config.addDirectory')
│    ↓
│  Refresh list
│
├─ Select directory + Enter
│    ↓
│  Confirm deletion
│    ↓
│  bridge.request('session.config.removeDirectory')
│    ↓
│  Refresh list
│
└─ q/ESC → onDone() → Exit
```

### UI Design

**Interactive Interface Layout:**
```
┌─────────────────────────────────────────┐
│ Manage Working Directories              │
│                                         │
│ Current working directory:              │
│ • /Users/xxx/project (current cwd)      │
│                                         │
│ Additional working directories:         │
│ ┌─────────────────────────────────────┐ │
│ │ 1. /Users/xxx/other-project     [×] │ │
│ │ 2. /Users/xxx/shared-libs       [×] │ │ ← Selected (highlighted)
│ └─────────────────────────────────────┘ │
│                                         │
│ Add new directory:                      │
│ > /path/to/new/directory___             │
│                                         │
│ ↑↓ Navigate • Enter: Add/Delete • q/ESC: Exit │
└─────────────────────────────────────────┘
```

**Keyboard Controls:**
- `↑/↓` - Navigate in directory list
- `Tab` - Switch focus between list and input box
- `Enter` - Delete in list, add in input box
- `q/ESC` - Exit

### Error Handling

#### 1. Path Validation Errors

| Error Type | User Message |
|-----------|-------------|
| `emptyPath` | "Please provide a directory path" |
| `pathNotFound` | "Path /xxx was not found" |
| `notADirectory` | "/xxx is not a directory. Did you mean to add the parent directory /parent?" |
| `alreadyInWorkingDirectory` | "/xxx is already accessible within the existing working directory /yyy" |

#### 2. Bridge API Errors

- Catch exceptions and display friendly messages
- "Unable to connect to backend service"
- "Failed to save directory config: {error}"

#### 3. UI Interaction Errors

- Load failure: Display error state + retry button
- Delete failure: Keep list unchanged + error message

### Integration Points

#### 1. Session Management Integration

**Modification:** `SessionConfig` interface in `src/session.ts`
```typescript
interface SessionConfig {
  // ... existing fields
  additionalDirectories?: string[];
}
```

**Implementation:** Utilize existing `SessionConfigManager` read/write logic

#### 2. Command Registration

**Modification:** `src/slash-commands/builtin/index.ts`
```typescript
import { createAddDirCommand } from './add-dir';

export function createBuiltinCommands(opts) {
  return [
    // ... existing commands
    createAddDirCommand(),
  ];
}
```

#### 3. System Prompt Integration (Environment Information)

**Purpose:** Inform the model about accessible directories through environment information

**Reference:** Claude CLI implementation (lines 467775-467803)
- In Claude CLI, `ma2` function generates environment info including additional directories
- Format: `Additional working directories: dir1, dir2, ...` in `<env>` tags
- This allows the model to understand which directories it can access

**Our Implementation Strategy:**

**3.1 Modify `LlmsContextCreateOpts` Type**

**File:** `src/llmsContext.ts` (lines 11-15)

```typescript
export type LlmsContextCreateOpts = {
  context: Context;
  sessionId: string;
  userPrompt: string | null;
  additionalDirectories?: string[];  // New field
};
```

**3.2 Update `LlmsContext.create()` Method**

**File:** `src/llmsContext.ts` (lines 80-97)

```typescript
let llmsEnv = {
  'Working directory': opts.context.cwd,
  'Is directory a git repo': gitStatus ? 'YES' : 'NO',
  ...(opts.additionalDirectories && opts.additionalDirectories.length > 0 && {
    'Additional working directories': opts.additionalDirectories.join(', ')
  }),
  Platform: platform,
  "Today's date": new Date().toLocaleDateString(),
};
```

**3.3 Pass Additional Directories in `Project` Class**

**File:** `src/project.ts` (around line 180-185, in `sendWithSystemPromptAndTools` method)

```typescript
// Import SessionConfigManager
import { SessionConfigManager } from './session';

// In sendWithSystemPromptAndTools method:
// Retrieve additional working directories
const sessionConfigManager = new SessionConfigManager({
  logPath: this.context.paths.getSessionLogPath(this.session.id),
});
const additionalDirectories = 
  sessionConfigManager.config.additionalDirectories || [];

const llmsContext = await LlmsContext.create({
  context: this.context,
  sessionId: this.session.id,
  userPrompt: message,
  additionalDirectories,  // Pass additional directories
});
```

**3.4 Expected Output Format**

When no additional directories:
```
# Environment
Here is useful information about the environment you are running in.
<env name="Working directory">/Users/xxx/project</env>
<env name="Is directory a git repo">YES</env>
<env name="Platform">darwin</env>
<env name="Today's date">11/14/2025</env>
```

When additional directories exist:
```
# Environment
Here is useful information about the environment you are running in.
<env name="Working directory">/Users/xxx/project</env>
<env name="Is directory a git repo">YES</env>
<env name="Additional working directories">/Users/xxx/lib1, /Users/xxx/lib2</env>
<env name="Platform">darwin</env>
<env name="Today's date">11/14/2025</env>
```

**Design Rationale:**
- **Separation of Concerns:** `Project` retrieves session config data, `LlmsContext` formats environment info
- **Loose Coupling:** `LlmsContext` doesn't need to know about `SessionConfigManager`
- **Easy Testing:** Can pass mock data directly to `LlmsContext.create()`
- **Backward Compatible:** Optional parameter `additionalDirectories?:` maintains existing behavior
- **Leverages Existing Architecture:** Reuses the proven `LlmsContext` environment information system

**Data Flow:**
```
User adds directory via /add-dir
  ↓
SessionConfig updated (additionalDirectories field)
  ↓
Project.send() → SessionConfigManager reads config
  ↓
LlmsContext.create(additionalDirectories) → Formats env info
  ↓
runLoop(llmsContexts) → System prompt + env info sent to model
  ↓
Model is aware of accessible directories
```

#### 4. Tool Access Control Integration (Optional, Future Enhancement)

In files `src/tools/read.ts`, `write.ts`, `edit.ts`, etc.:
- Check if file path is in `cwd` or `additionalDirectories`
- If not, deny access and suggest using `/add-dir`

### Implementation Priority

1. ✅ Path validation utility functions (Infrastructure)
2. ✅ Bridge API extension (Core functionality)
3. ✅ Session config extension (Data storage)
4. ✅ Direct addition mode (MVP functionality)
5. ✅ Interactive UI - List display (User experience)
6. ✅ Interactive UI - Add functionality (Complete functionality)
7. ✅ Interactive UI - Delete functionality (Complete management)
8. ✅ System prompt integration (Environment information) - **NEW**
9. 🔄 Tool access control integration (Optional enhancement)

## Implementation Checklist

### New Files
- `src/slash-commands/builtin/add-dir.tsx` (~300 lines)
  - Command definition and export
  - Direct addition logic
  - Interactive UI components
  - useDirectoryManager Hook

### Modified Files
- `src/utils/path.ts` (+100 lines)
  - `validateDirectoryPath()` function
  - `isPathWithin()` helper function
  - `formatValidationMessage()` formatting function

- `src/nodeBridge.ts` (+50 lines)
  - `session.config.getAdditionalDirectories` handler
  - `session.config.addDirectory` handler
  - `session.config.removeDirectory` handler

- `src/session.ts` (+20 lines)
  - Extend `SessionConfig` interface
  - Support new field in get/set methods

- `src/slash-commands/builtin/index.ts` (+3 lines)
  - Import `createAddDirCommand`
  - Add to command list

- `src/llmsContext.ts` (+10 lines)
  - Extend `LlmsContextCreateOpts` type to include `additionalDirectories?` field
  - Update `llmsEnv` object to conditionally include additional directories

- `src/project.ts` (+15 lines)
  - Import `SessionConfigManager`
  - Retrieve additional directories from session config
  - Pass `additionalDirectories` to `LlmsContext.create()`

### Excluded Content
- ❌ Telemetry/Bacon related code
- ❌ Persistence to local settings (localSettings)
- ❌ External editor functionality extraction (already an independent module, no modification needed)

## Testing Points

### Path Validation Tests
- ✅ Empty path returns `emptyPath`
- ✅ Non-existent path returns `pathNotFound`
- ✅ File path returns `notADirectory`
- ✅ Subdirectory path returns `alreadyInWorkingDirectory`
- ✅ Valid path returns `success` and absolute path

### Direct Addition Mode Tests
- ✅ `/add-dir /valid/path` successfully adds
- ✅ `/add-dir /invalid/path` displays error
- ✅ `/add-dir /cwd/subdir` prompts already in working directory

### Interactive UI Tests
- ✅ Display current cwd
- ✅ Load and display additional directory list
- ✅ Add valid directory successfully
- ✅ Add invalid directory displays error
- ✅ List updates after deleting directory
- ✅ Keyboard navigation works correctly
- ✅ q/ESC exits properly

### Session Config Tests
- ✅ Added directories correctly saved to session config
- ✅ Directory list persists when resuming session
- ✅ Directory list clears when clearing session

### System Prompt Integration Tests (NEW)
- ✅ When no additional directories: `Additional working directories` line should NOT appear in environment info
- ✅ When 1 additional directory: Should show `<env name="Additional working directories">/path/to/dir</env>`
- ✅ When multiple additional directories: Should show comma-separated list
- ✅ Environment info correctly passed through `LlmsContext.create()`
- ✅ Model receives environment information in system prompt
- ✅ After adding directory via `/add-dir`, next conversation turn includes updated environment info
- ✅ After removing directory, environment info updates accordingly

## Notes

1. **Path Normalization:** All paths should be converted to absolute paths for storage, avoiding issues caused by relative paths

2. **Platform Compatibility:** Path validation needs to handle differences between Windows and Unix paths

3. **Concurrency Safety:** Need to consider concurrent modification scenarios when updating session config

4. **User Experienc- Error messages should clearly guide users on how to correct
   - Interactive UI should provide real-time feedback
   - Avoidal deletion (optional: add confirmation prompt)

5nce Considerations:** Directory list is typically not very long, ed for pagination or virtual scrolling

6. **Future Extensions:** 
   - Can add directory alias functionality
   - Crate into file tool access control
   - Can support import/export of directory lists

## References

- Claude CLI 2.0.37 `/add-dir` implementation and "Additional working directories" logic
- Existing `/mcp` command implementation (`src/slash-commands/builtin/mcp.tsx`)
- Session config management (`src/session.ts`)
- Zustand Store (`src/ui/store.ts`)
- LlmsContext system (`src/llmsContext.ts`)

### Claude CLI "Additional working directories" Implementation Analysis

Based on analysis of `versions/2.0.37/cli.js`, here's how Claude CLI implements the complete additional working directories feature:

#### 1. Core Concept
"Additional working directories" is a permission management feature that allows users to add extra working directories beyond the current working directory, expanding the file system scope that Claude can access and operate on.

#### 2. Data Structure
```typescript
// In toolPermissionContext
additionalWorkingDirectories: new Map()
// Map structure: { path: string, source: string }
```

#### 3. Three Major Use Cases

**3.1 UI Display** (lines 456029-456034)
```javascript
let Z = $z.useMemo(() => {
  return Array.from(G.additionalWorkingDirectories.keys()).map((X) => ({
    path: X,
    isCurrent: false,
    isDeletable: true,
  }));
}, [G.additionalWorkingDirectories]);
```

**3.2 System Prompt Generation** (lines 467775-467803)
```javascript
async function ma2(A, B) {
  // A: model ID, B: additional directories array
  let Y = B && B.length > 0
    ? `Additional working directories: ${B.join(", ")}\n`
    : "";
    
  return `Here is useful information about the environment you are running in:
<env>
Working directory: ${G0()}
Is directory a git repo: ${Q ? "Yes" : "No"}
${Y}Platform: ${T0.platform}
OS Version: ${I}
Today's date: ${DAI()}
</env>`;
}
```

**3.3 Permission Verification** (lines 474919-474946)
```javascript
// Get all allowed directories
function d4A(A) {
  return new Set([WQ(), ...A.additionalWorkingDirectories.keys()]);
}

// Verify if path is within allowed directories
function VO(A, B) {
  return HGA(A).every((I) =>
    Array.from(d4A(B)).some((G) => Yv(I, G))
  );
}

// Check if path is within directory
function Yv(A, B) {
  // Handles macOS /private/var and /private/tmp symlinks
  // Normalizes paths
  // Calculates relative path
  // Returns true if childPath is within parentPath
}
```

#### 4. Complete Data Flow

```
User Action / System Suggestion
  ↓
addDirectories permission update
  ↓
toolPermissionContext.additionalWorkingDirectories (Map)
  ↓
Three parallel uses:

1. UI Display              2. System Prompt           3. Permission Verification
   ↓                          ↓                          ↓
Rl2 → Display list       ma2 → Environment info    d4A → Merge all directories
                             ↓                          ↓
                         em/db2 → System prompt    VO → Verify path permissions
                             ↓                          ↓
                         Send to Claude            Allow/Deny file operations
```

#### 5. Key Takeaways for Our Implementation

1. **Storage:** Use `Map<string, {path: string, source: string}>` in Claude CLI; we use `string[]` in session config
2. **System Prompt Integration:** Critical - must inform model about accessible directories
3. **Format:** Use comma-separated list in `<env>` tags
4. **Timing:** Environment info regenerated for each conversation turn
5. **Lifecycle:** Tied to session (matches our session-only approach)

Our implementation aligns with Claude CLI's approach but simplifies it:
- **Storage:** Session config array instead of Map (simpler for session-only scope)
- **Integration Point:** `LlmsContext` instead of direct system prompt function
- **Advantages:** Reuses existing environment info system, cleaner separation of concerns
