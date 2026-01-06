# Terminal Size Context Provider

**Date:** 2026-01-04

## Context

The application was experiencing a `MaxListenersExceededWarning` with 11 resize listeners added to the WriteStream. The root cause was the `useTerminalSize` hook being used in at least 6 different components (`AskQuestionModal`, `ChatInput`, `DiffViewer`, `ApprovalModal`, `DashedDivider`, `ReverseSearchInput`), with each component instance creating its own `resize` event listener on `process.stdout`. This architectural issue was compounded by React's hot reloading and multiple component instances, causing the listener count to exceed the default EventEmitter limit.

## Discussion

**Explored Approaches:**

1. **Single global listener with React Context (Selected)** - Create one listener at the top level, share terminal size via Context. Most efficient and follows React best practices.

2. **Increase maxListeners limit** - Quick fix using `setMaxListeners()` to suppress the warning, but doesn't solve the underlying architectural issue.

3. **Debounced singleton pattern** - Single event listener with ref counting, more complex but keeps hook API unchanged.

**Key Decisions:**

- **Refactoring scope:** Medium - Update all consumers to use Context directly. This approach provides cleaner architecture with zero API changes for consuming components since the `useTerminalSize()` hook API remains identical.

- **Migration strategy:** Create a TerminalSizeProvider wrapper, implement Context-based hook, and update App.tsx to wrap with provider. No changes needed in the 6 existing components.

## Approach

Implement a **TerminalSizeProvider** that wraps the App component and manages a single `resize` event listener. Components will access terminal size via the existing `useTerminalSize()` hook, which will be refactored internally to read from Context instead of creating individual listeners.

**Benefits:**
- Single listener regardless of component count
- Zero API changes for consuming components
- Automatic cleanup on unmount
- Type-safe with TypeScript
- Eliminates memory leak warning

## Architecture

### Component Structure

**New file: `src/ui/TerminalSizeContext.tsx`**
- Context with `{ columns: number, rows: number }` shape
- TerminalSizeProvider component with single useEffect managing one resize listener
- Custom hook `useTerminalSize()` for consumers (replaces old implementation)
- Hook throws descriptive error if used outside Provider

**Modified file: `src/ui/App.tsx`**
```tsx
<TerminalSizeProvider>
  <ExistingAppContent />
</TerminalSizeProvider>
```

**Existing components** - No changes required, continue using `useTerminalSize()` hook

### Data Flow

1. App renders, TerminalSizeProvider mounts
2. Provider reads initial `process.stdout.columns` and `process.stdout.rows`
3. Single `process.stdout.on('resize', updateSize)` listener attached
4. On terminal resize → setState in Provider with new dimensions
5. Context value updates → all consuming components re-render with new size
6. On unmount → cleanup removes the one listener

### Error Handling

**Provider safeguards:**
- Fallback to 80x24 default if `process.stdout` unavailable (non-TTY environments)
- Graceful handling if resize event doesn't fire
- Hook throws descriptive error when used outside Provider context

**Edge cases:**
- Server-side rendering: Context provides default dimensions
- Multiple providers: Each manages own listener (avoid nesting providers)
- Hot reload: Provider cleanup prevents stale listeners from accumulating

### Testing Strategy

**Unit tests:**
- Context provides correct initial values from stdout
- Hook throws when used outside Provider
- Single listener registered per Provider instance
- Cleanup removes listener on unmount

**Integration verification:**
- Run app and resize terminal → no MaxListenersExceededWarning
- Verify `process.stdout.listenerCount('resize') === 1`
- Hot reload multiple times → listener count remains at 1

### Migration Path

1. Create new `src/ui/TerminalSizeContext.tsx` with Provider and Context-based hook
2. Wrap App component with TerminalSizeProvider in `src/ui/App.tsx`
3. Replace old `src/ui/useTerminalSize.ts` implementation to re-export from Context
4. Verify warning disappears and all components receive updates
5. Run tests to confirm single listener behavior

### Success Criteria

✅ MaxListenersExceededWarning eliminated  
✅ Only 1 resize listener active regardless of component count  
✅ All 6+ components receive terminal size updates correctly  
✅ No breaking changes to component APIs  
✅ Type-safe implementation with proper error boundaries
