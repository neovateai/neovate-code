# Login Provider Argument Support

**Date:** 2025-12-15

## Context

The `/login` command currently requires users to navigate a provider selection UI before configuring API keys. This adds friction when users already know which provider they want to configure. The goal is to support passing a provider name directly as an argument (e.g., `/login iflow`) to skip the selection UI.

## Discussion

**Q: What should happen when `/login iflow` is used?**
- Decision: Skip selection UI entirely and go directly to that provider's login flow

**Q: How should provider name matching work?**
- Decision: Exact match on provider ID only (e.g., `iflow` matches `iflow`, case-sensitive)

**Q: What if the provider ID doesn't match any provider?**
- Decision: Show error message and exit (e.g., "Provider 'xyz' not found")

## Approach

Minimal changes to existing code by reusing the current `handleProviderSelect` logic:

1. Accept `args` in `createLoginCommand` and pass to `LoginSelect` as `initialProviderId` prop
2. In `LoginSelect`, after providers load, if `initialProviderId` is provided:
   - Find provider with exact ID match
   - If found: trigger existing `handleProviderSelect` flow
   - If not found: call `onExit` with error message
3. No changes to OAuth flows, API key input, or UI components

## Architecture

**Flow:**
```
/login iflow
  → providers.list loads
  → find provider with id === "iflow"
  → found? → handleProviderSelect → existing OAuth/API key flow
  → not found? → onExit("Provider 'xyz' not found")
```

**Code Changes (login.tsx):**

1. Update `LoginSelectProps`:
   - Add `initialProviderId?: string`

2. Update `LoginSelect` component:
   - Accept `initialProviderId` prop
   - In the `useEffect` that loads providers, after `setProviders`:
     - Check if `initialProviderId` is set
     - Find matching provider by exact ID
     - Call `handleProviderSelect` or `onExit` accordingly

3. Update `createLoginCommand`:
   - Pass `args` parameter to `LoginSelect` as `initialProviderId`

**Scope:** ~15 lines of code
