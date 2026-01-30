---
name: add-nodebridge-handler
description: Use this skill when adding a new NodeBridge handler to src/nodeBridge.ts, including updating types in src/nodeBridge.types.ts and optionally testing with scripts/test-nodebridge.ts
---

# Add NodeBridge Handler

## Overview

This skill guides the process of adding a new message handler to the NodeBridge system, which enables communication between the UI layer and the Node.js backend.

## Steps

### 1. Add Handler Implementation in `src/nodeBridge.ts`

Locate the `registerHandlers()` method in the `NodeHandlerRegistry` class and add your handler:

```typescript
this.messageBus.registerHandler('category.handlerName', async (data) => {
  const { cwd, ...otherParams } = data;
  const context = await this.getContext(cwd);
  
  // Implementation logic here
  
  return {
    success: true,
    data: {
      // Return data
    },
  };
});
```

**Handler Naming Convention:**
- Use dot notation: `category.action` (e.g., `git.status`, `session.send`, `utils.getPaths`)
- Categories: `config`, `git`, `mcp`, `models`, `outputStyles`, `project`, `projects`, `providers`, `session`, `sessions`, `slashCommand`, `status`, `utils`

**Common Patterns:**
- Always get context via `await this.getContext(cwd)`
- Return `{ success: true, data: {...} }` for success
- Return `{ success: false, error: 'message' }` for errors
- Wrap in try/catch for error handling

### 2. Add Type Definitions in `src/nodeBridge.types.ts`

Add input and output types near the relevant section:

```typescript
// ============================================================================
// Category Handlers
// ============================================================================

type CategoryHandlerNameInput = {
  cwd: string;
  // other required params
  optionalParam?: string;
};

type CategoryHandlerNameOutput = {
  success: boolean;
  error?: string;
  data?: {
    // return data shape
  };
};
```

Then add to the `HandlerMap` type:

```typescript
export type HandlerMap = {
  // ... existing handlers
  
  // Category handlers
  'category.handlerName': {
    input: CategoryHandlerNameInput;
    output: CategoryHandlerNameOutput;
  };
};
```

### 3. (Optional) Add to Test Script

Update `scripts/test-nodebridge.ts` HANDLERS object if the handler should be easily testable:

```typescript
const HANDLERS: Record<string, string> = {
  // ... existing handlers
  'category.handlerName': 'Description of what this handler does',
};
```

### 4. Test the Handler

Run the test script:

```bash
bun scripts/test-nodebridge.ts category.handlerName --cwd=/path/to/dir --param=value
```

Or with JSON data:

```bash
bun scripts/test-nodebridge.ts category.handlerName --data='{"cwd":"/path","param":"value"}'
```

## Example: Complete Handler Addition

### nodeBridge.ts
```typescript
this.messageBus.registerHandler('utils.example', async (data) => {
  const { cwd, name } = data;
  try {
    const context = await this.getContext(cwd);
    
    // Do something with context and params
    const result = await someOperation(name);
    
    return {
      success: true,
      data: {
        result,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to execute example',
    };
  }
});
```

### nodeBridge.types.ts
```typescript
type UtilsExampleInput = {
  cwd: string;
  name: string;
};

type UtilsExampleOutput = {
  success: boolean;
  error?: string;
  data?: {
    result: string;
  };
};

// In HandlerMap:
'utils.example': {
  input: UtilsExampleInput;
  output: UtilsExampleOutput;
};
```

## Notes

- Handlers are async functions that receive `data` parameter
- Use `this.getContext(cwd)` to get the Context instance (cached per cwd)
- Context provides access to: `config`, `paths`, `mcpManager`, `productName`, `version`, etc.
- For long-running operations, consider using abort controllers (see `git.clone` pattern)
- For operations that emit progress, use `this.messageBus.emitEvent()` (see `git.commit.output` pattern)
