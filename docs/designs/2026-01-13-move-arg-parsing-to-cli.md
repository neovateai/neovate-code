# Move Arg Parsing to cli.ts

**Date:** 2026-01-13

## Context

The current architecture has `cli.ts` as a thin entry point (28 lines) that only reads package.json and calls `runNeovate()`. All argument parsing logic resides in `index.ts` (498 lines), which handles everything: arg parsing, help text, quiet mode, interactive mode, and command routing.

The goal is to refactor so that argument parsing happens in `cli.ts` before calling `runNeovate()`, providing better separation of concerns.

## Discussion

**Q: What should cli.ts do with the parsed args?**
- Option considered: Parse & handle commands directly in cli.ts
- Option considered: Full command routing in cli.ts
- **Chosen:** Parse args in cli.ts, pass to `runNeovate()`. Keep `parseArgs()` function defined in index.ts and import it to cli.ts.

**Q: Should the Argv type be exported?**
- **Chosen:** Export the `Argv` type from index.ts for type safety in cli.ts.

**Q: How should runNeovate() receive the parsed argv?**
- Option considered: Create a new `runNeovateWithArgv()` function
- **Chosen:** Add `argv: Argv` as a new required parameter to `runNeovate(opts)`.

## Approach

1. Export `parseArgs` function and `Argv` type from `index.ts`
2. Modify `runNeovate()` to accept `argv` in its options parameter
3. Remove the internal `parseArgs()` call from `runNeovate()`
4. In `cli.ts`, import `parseArgs` and `Argv`, call parsing before `runNeovate()`, and pass the result

## Architecture

### index.ts exports

```typescript
export { parseArgs };
export type { Argv };

export async function runNeovate(opts: {
  productName: string;
  productASCIIArt?: string;
  version: string;
  plugins: Plugin[];
  upgrade?: UpgradeOptions;
  argv: Argv;  // NEW required field
}) { ... }
```

### cli.ts changes

```typescript
import { runNeovate, parseArgs, type Argv } from '.';

const argv = await parseArgs(process.argv.slice(2));
runNeovate({
  productName: PRODUCT_NAME,
  productASCIIArt: PRODUCT_ASCII_ART,
  version: pkg.version,
  plugins: [],
  upgrade: { ... },
  argv,
});
```

### Breaking Change

`runNeovate()` now requires `argv` parameter. Any SDK consumers calling `runNeovate()` directly will need to provide parsed args.

### Estimated Changes

| File | Changes |
|------|---------|
| `src/index.ts` | ~10 lines modified |
| `src/cli.ts` | ~5 lines added |
