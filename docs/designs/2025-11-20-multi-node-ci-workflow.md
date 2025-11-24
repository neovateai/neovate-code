# Multi-Node CI Workflow with Integration Testing

**Date:** 2025-11-20

## Context

The project currently has a GitHub Actions workflow that only tests on Node 22. To ensure compatibility across supported Node versions and validate the built CLI works correctly, we need to:

1. Test build and unit tests on Node 18, 20, and 22
2. Add integration testing that runs the built CLI with a real model
3. Test with `iflow/qwen3-coder-plus` model using API key from GitHub secrets
4. Follow the testing pattern established in `scripts/ready.ts`

The goal is to catch compatibility issues early and ensure the distributed CLI artifact works as expected before releases.

## Discussion

### Job Structure Decision

Three options were considered for organizing the CI workflow:

**Option A: Run inline tests similar to ready.ts**
- All steps inline in workflow
- Duplicates ready.ts logic

**Option B: Run ready.ts script directly**
- Simplest approach
- Less flexibility for CI-specific needs

**Option C: Split into separate jobs (Selected)**
- Job 1: Build/unit tests
- Job 2: Integration/CLI testing
- Clear separation of concerns

Option C was selected for better clarity and separation between unit and integration testing.

### Multi-Node Testing Strategy

Three approaches were evaluated:

**Approach 1: Matrix Build + Single Integration Test (Selected)**
- Build/unit test matrix on Node 18, 20, 22 (parallel)
- Integration test on Node 22 only (sequential)
- Reuses build artifacts
- Fast and efficient

**Approach 2: Full Matrix for Everything**
- Both build and integration tests on all Node versions
- Most comprehensive but slowest
- 3x more API calls to iflow model

**Approach 3: Combined Jobs Per Node Version**
- Single job per Node version with all steps
- No artifact sharing
- Simple but less efficient

Approach 1 was selected as the best balance between comprehensive testing and CI efficiency. It ensures Node compatibility for core functionality while keeping integration testing focused on the production Node version.

### Key Decisions

- **Node Versions:** Test on 18, 20, 22 (current LTS and latest)
- **Integration Scope:** Single smoke test with "hello" prompt
- **Model:** `iflow/qwen3-coder-plus` (from ready.ts)
- **Secret:** Use `secrets.IFLOW_API_KEY` for authentication
- **Artifact Strategy:** Upload from Node 22 build, download in integration job

## Approach

The CI workflow is split into two sequential jobs:

**Job 1: Build and Test Matrix**
- Runs in parallel on Node 18, 20, and 22
- Each version executes: install → build → typecheck → format → unit tests
- Node 22 job uploads build artifacts (dist/) for next job
- Any version failure stops the entire workflow

**Job 2: Integration Test**
- Runs only on Node 22 (depends on Job 1 success)
- Downloads build artifacts from Job 1
- Executes CLI with iflow model: `node ./dist/cli.mjs -m iflow/qwen3-coder-plus -q --output-format json "hello"`
- Validates JSON output
- Uses `IFLOW_API_KEY` from GitHub secrets

This design ensures compatibility across Node versions while maintaining efficient integration testing.

## Architecture

### Job 1: Build and Test Matrix

**Configuration:**
```yaml
strategy:
  matrix:
    node-version: [18, 20, 22]
runs-on: ubuntu-latest
```

**Steps (all Node versions):**
1. Checkout code (`actions/checkout@v4`)
2. Setup Node.js from matrix (`actions/setup-node@v4`)
3. Setup Bun 1.2.7 (`oven-sh/setup-bun@v1`) - required for build
4. Setup pnpm 10.8.0 (`pnpm/action-setup@v2`)
5. Install dependencies: `pnpm install`
6. Build project: `pnpm build`
7. Type check: `pnpm typecheck`
8. Format check: `pnpm format`
9. Run unit tests: `pnpm test`

**Artifact Upload (Node 22 only):**
- Conditional: `if: matrix.node-version == '22'`
- Uploads: `dist/` directory
- Artifact name: `dist-node-22`
- Used by integration test job

### Job 2: Integration Test

**Configuration:**
```yaml
needs: [build-and-test]
runs-on: ubuntu-latest
```

**Environment:**
- `IFLOW_API_KEY: ${{ secrets.IFLOW_API_KEY }}`

**Steps:**
1. Checkout code (for dependencies)
2. Setup Node.js 22
3. Setup pnpm 10.8.0
4. Install production dependencies: `pnpm install --prod`
5. Download artifacts: `dist-node-22`
6. Run CLI test:
   ```bash
   node ./dist/cli.mjs -m iflow/qwen3-coder-plus -q --output-format json "hello"
   ```
7. Validate JSON output (parse to ensure valid JSON)

### Error Handling

**Build Matrix Failures:**
- Any Node version failure stops entire workflow
- Clear attribution - can identify which Node version and step failed
- No partial success allowed

**Integration Test Failures:**

API Authentication:
- Missing `IFLOW_API_KEY` → CLI authentication error, job fails
- Invalid API key → CLI error, job fails
- Solution: Ensure secret is configured in repository settings

CLI Execution:
- Non-zero exit code → immediate job failure
- Invalid JSON output → validation step catches and fails
- Timeout: Can add step timeout (e.g., 10 minutes)

Network Issues:
- iflow API unreachable → job fails
- Occasional flakes accepted, manual re-run available

### Testing Coverage

**Unit Tests (Job 1):**
- Full test suite via `pnpm test`
- Tested on Node 18, 20, and 22
- Catches compatibility issues early

**Integration Test (Job 2):**
- Single smoke test with "hello" prompt
- Validates: CLI executes, model responds, JSON output valid
- Focused scope - comprehensive E2E testing is separate

### Implementation Details

**File:** `.github/workflows/test.yml` (replaces existing)

**Required GitHub Secret:**
- Name: `IFLOW_API_KEY`
- Scope: Repository secrets
- Must be configured before first workflow run

**Estimated CI Time:**
- Job 1 (parallel): ~5-8 minutes
- Job 2 (sequential): ~2-3 minutes  
- Total: ~7-11 minutes per run

**Migration Notes:**
- Current workflow only tests Node 22
- New workflow extends to 18, 20, 22 and adds integration testing
- No breaking changes, pure enhancement
- Existing triggers (push to master, PRs) remain unchanged
