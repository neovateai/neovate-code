# NodeBridge Handler Type Definitions

**Date:** 2025-12-04

## Context

The `nodeBridge.ts` file contains ~40+ handlers registered via `messageBus.registerHandler()`. These handlers serve as the communication bridge between different parts of the application, handling operations like config management, MCP server control, model selection, session management, and more.

Currently, both `registerHandler` and `request` methods use loosely typed parameters (`any`), which means:
- No compile-time type checking for handler inputs/outputs
- No IDE autocomplete when calling `request()`
- Easy to break contracts when modifying handlers
- Difficult to understand what data each handler expects/returns

The goal is to achieve **full type-safety** where both handler registration and request calls are fully typed, enabling TypeScript to enforce correct parameter types and infer return types automatically.

## Discussion

### Key Questions & Decisions

**Q1: What level of type safety?**
- Selected: **Full type-safety** - Both `registerHandler` and `request` should be fully typed with autocomplete and inference

**Q2: Where should type definitions live?**
- Selected: **Single file** approach (`src/nodeBridge.types.ts`) for easy maintenance and single source of truth

**Q3: How should the handler map be structured?**
- Selected: **Record-style mapping** with method names mapping to `{ input: ..., output: ... }` objects for simplicity

### Alternative Approaches Considered

**Approach 1: Centralized Type Map with Generics (SELECTED)**
- Define `HandlerMap` type with all handlers
- Make `registerHandler` and `request` generic over method names
- Simple, direct type-safety
- Medium complexity - one-time extraction, ongoing maintenance

**Approach 2: Dual Registry (Runtime + Type)**
- Parallel type-only registry with module augmentation
- Less invasive but types can drift from runtime
- Not selected due to sync concerns

**Approach 3: Code Generation from Runtime**
- Auto-generate types from actual handlers
- Single source of truth but requires build tooling
- Too complex for the benefit

## Approach

The solution uses **Centralized Type Map with Generics**:

1. **Create `src/nodeBridge.types.ts`** - Single file containing `HandlerMap` type with all ~40+ handler definitions
2. **Update `MessageBus` class** - Add generic constraints to `registerHandler<K>()` and `request<K>()` methods
3. **Type-check handlers** - All existing handlers automatically validated against the type map
4. **Progressive refinement** - Start with `any` for complex types, refine incrementally

### Benefits
- **Type safety at registration**: Handler must match input/output types
- **Type safety at call site**: `request('config.get', params)` enforces correct params
- **Return type inference**: TypeScript automatically infers return types
- **Single source of truth**: All handler contracts in one file
- **Easy maintenance**: Add/modify types in one location

## Architecture

### File Structure

```
src/
├── nodeBridge.types.ts       # NEW: All handler type definitions
├── messageBus.ts             # MODIFIED: Add generic constraints
└── nodeBridge.ts             # UNCHANGED: Existing handlers work as-is
```

### Type Map Structure

```typescript
// src/nodeBridge.types.ts
export type HandlerMap = {
  'config.get': {
    input: { cwd: string; isGlobal: boolean; key: string };
    output: { success: true; data: { value: any } };
  };
  'config.set': {
    input: { cwd: string; isGlobal: boolean; key: string; value: string };
    output: { success: true };
  };
  'mcp.reconnect': {
    input: { cwd: string; serverName: string };
    output: 
      | { success: true; message: string }
      | { success: false; error: string };
  };
  // ... all ~40+ handlers
};

// Helper types for convenience
export type HandlerInput<K extends keyof HandlerMap> = HandlerMap[K]['input'];
export type HandlerOutput<K extends keyof HandlerMap> = HandlerMap[K]['output'];
```

### MessageBus Generic Implementation

```typescript
// src/messageBus.ts
import type { HandlerMap } from './nodeBridge.types';

export class MessageBus extends EventEmitter {
  // Typed registration
  registerHandler<K extends keyof HandlerMap>(
    method: K,
    handler: (data: HandlerMap[K]['input']) => Promise<HandlerMap[K]['output']>
  ): void {
    this.messageHandlers.set(method, handler as MessageHandler);
  }
  
  // Typed request with inference
  async request<K extends keyof HandlerMap>(
    method: K,
    params: HandlerMap[K]['input'],
    options: { timeout?: number } = {},
  ): Promise<HandlerMap[K]['output']> {
    // Existing implementation unchanged
  }
}
```

### Type Extraction Patterns

**Pattern 1 - Simple handlers:**
```typescript
'config.list': {
  input: { cwd: string };
  output: { success: true; data: { ... } };
};
```

**Pattern 2 - Union return types:**
```typescript
'mcp.reconnect': {
  input: { cwd: string; serverName: string };
  output: { success: true; ... } | { success: false; error: string };
};
```

**Pattern 3 - Complex types:**
```typescript
'session.send': {
  input: {
    message: string | null;
    cwd: string;
    sessionId: string | undefined;
    attachments?: ImagePart[];  // Reuse existing types
    thinking?: ThinkingConfig;
  };
  output: any;  // Refine later
};
```

### Implementation Steps

1. **Extract all handler types** from `nodeBridge.ts` (~40+ handlers)
2. **Create type file** with complete `HandlerMap`
3. **Update MessageBus** with generic constraints
4. **Validate** all handlers pass type checking
5. **Refine types** incrementally where needed

### Maintenance Strategy

- **Adding handlers**: Add to `HandlerMap` first, implementation second
- **Changing signatures**: Update `HandlerMap`, TypeScript finds all call sites
- **Documentation**: Use JSDoc comments in `HandlerMap`
- **Validation**: Type-level tests ensure correctness

### Migration Safety

- No runtime behavior changes
- Existing code continues working
- Type errors surface gradually
- Backward compatible with type assertions where needed
