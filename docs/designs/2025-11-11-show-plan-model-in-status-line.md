# Show Plan Model in Status Line

**Date:** 2025-11-11

## Overview

Display the plan model in the status line when it's configured, showing it alongside the main model.

## Requirements

- Show plan model when `planModel` config is set
- Display format: `[claude/opus | plan: gpt/4o-mini] | folder | ...`
- Always visible when configured (not mode-dependent)
- Use simple text prefix `plan:` for clarity

## Design Decision

**Approach:** Simple string concatenation
- Minimal code changes
- Works with existing gradient/color system
- Easy to understand and maintain
- Complexity: Low (5-10 lines changed per file)

## Implementation

### 1. Update AppState interface in `src/ui/store.ts`
- Add `planModel: string | null;` field (after the `model` field)

### 2. Update `initialize` action in `src/ui/store.ts`
- Extract `planModel` from response: `planModel: response.data.planModel`
- Set it in the state where other response data is set

### 3. Update `session.initialize` in `src/nodeBridge.ts`
- Return `planModel: context.config.planModel` in the response object
- No parsing needed - keep as raw string from config

### 4. Update `src/ui/StatusLine.tsx`
- Extract both `model` (ModelInfo) and `planModel` (string | null) from `useAppStore()`
- Modify the model display logic:
  ```typescript
  let modelDisplay = `${model.provider.id}/${model.model.id}`;
  if (planModel) {
    modelDisplay += ` | plan: ${planModel}`;
  }
  ```

## Key Points

- `planModel` is stored as a raw config string (e.g., `"anthropic/claude-3-5-sonnet-20241022"`)
- `model` is parsed into ModelInfo with provider/model objects
- Simple conditional append - if planModel exists (truthy), show it
- No comparison needed between planModel and model config
- Existing gradient/color logic handles the final display string unchanged
