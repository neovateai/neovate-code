# NodeBridge Plugin Handler Hook

**Date:** 2026-01-13

## Context

The `NodeBridge` class in `nodeBridge.ts` provides a centralized handler registry for various operations (config, session, utils, etc.) via `MessageBus`. Currently, all handlers are hardcoded in `NodeHandlerRegistry.registerHandlers()`.

The goal is to allow plugins to extend the nodeBridge handlers, enabling:
1. Adding entirely new handler methods (e.g., `myPlugin.doSomething`)
2. Overriding/wrapping existing handlers (e.g., modify `session.send` behavior)

## Discussion

### Approaches Explored

**Approach A: Single `nodeBridgeHandler` Hook** (Selected)
- Plugins provide a single hook returning a map of handlers
- Uses `SeriesMerge` to combine results from multiple plugins
- Simple, consistent with existing plugin patterns
- Type safety via existing `HandlerMap` from `nodeBridge.types.ts`

**Approach B: Handler-Specific Hooks**
- Individual hooks per handler category (`nodeBridgeConfigHandler`, `nodeBridgeSessionHandler`, etc.)
- Better per-category type safety but doesn't scale well
- More hooks to maintain

**Approach C: Middleware-Style with `next` Function**
- Handlers receive `next` to call original handler
- Maximum flexibility for pre/post processing
- More complex for simple use cases

### Decision

Approach A was selected for its simplicity and consistency with existing plugin patterns. The `SeriesMerge` hook type from the existing plugin system provides natural result merging via `defu`.

## Approach

Add a `nodeBridgeHandler` hook to the `Plugin` interface that:
- Returns a partial map of handler implementations
- Receives `Context` as second argument for access to config, paths, etc.
- Uses `SeriesMerge` type to merge results from multiple plugins
- Leverages existing `HandlerMap` for full type safety

## Architecture

### Type Definitions

Add `NodeBridgeHandlers` type to `nodeBridge.types.ts`:

```typescript
export type NodeBridgeHandlers = Partial<{
  [K in keyof HandlerMap]: (
    data: HandlerMap[K]['input'],
    context: import('./context').Context,
  ) => Promise<HandlerMap[K]['output']> | HandlerMap[K]['output'];
}>;
```

Add hook to `Plugin` type in `plugin.ts`:

```typescript
import type { NodeBridgeHandlers } from './nodeBridge.types';

// Add to Plugin type
nodeBridgeHandler?: (
  this: PluginContext,
) => Promise<NodeBridgeHandlers> | NodeBridgeHandlers;
```

### Integration in NodeHandlerRegistry

Modify `getContext()` to apply plugin handlers when context is created:

```typescript
private async getContext(cwd: string) {
  if (this.contexts.has(cwd)) {
    return this.contexts.get(cwd)!;
  }
  
  const context = await Context.create({
    cwd,
    ...this.contextCreateOpts,
    messageBus: this.messageBus,
  });
  context.mcpManager.initAsync();
  this.contexts.set(cwd, context);
  
  // Register plugin handlers for this context
  await this.applyPluginHandlers(context);
  
  return context;
}

private async applyPluginHandlers(context: Context) {
  const pluginHandlers = await context.apply({
    hook: 'nodeBridgeHandler',
    args: [],
    memo: {},
    type: PluginHookType.SeriesMerge,
  });
  
  for (const [method, handler] of Object.entries(pluginHandlers)) {
    const originalHandler = this.messageBus.messageHandlers.get(method);
    
    this.messageBus.registerHandler(method, async (data) => {
      const result = await (handler as Function)(data, context);
      if (originalHandler && result !== undefined) {
        const originalResult = await originalHandler(data);
        return defu(result, originalResult);
      }
      return originalHandler ? originalHandler(data) : result;
    });
  }
}
```

### Usage Example

```typescript
const myPlugin: Plugin = {
  name: 'my-plugin',
  nodeBridgeHandler() {
    return {
      // Extend existing handler
      'utils.query': async (data, context) => {
        return { success: true, data: { custom: true } };
      },
      // Add new handler
      'myPlugin.customHandler': async (data, context) => {
        return { success: true };
      },
    };
  },
};
```

### Files to Modify

| Component | Change |
|-----------|--------|
| `nodeBridge.types.ts` | Add `NodeBridgeHandlers` type |
| `plugin.ts` | Add `nodeBridgeHandler` hook to `Plugin` |
| `nodeBridge.ts` | Add `applyPluginHandlers()` method, call in `getContext()` |
