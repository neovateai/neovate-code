# Skills System Manual Testing Guide

## Setup

### 1. Create Global Skill

```bash
# Create global skills directory
mkdir -p ~/.takumi/skills/pdf-processing

# Create SKILL.md file
cat > ~/.takumi/skills/pdf-processing/SKILL.md << 'EOF'
---
name: pdf-processing
description: Extract text and tables from PDFs; use when PDFs mentioned.
---

# PDF Processing

## Instructions
- Use pdfplumber to extract text
- For tables, use camelot or tabula-py
- Always check if the PDF is scanned (image-based) first
- For scanned PDFs, use OCR with pytesseract
EOF
```

### 2. Create Project-Local Skill

```bash
# Create project skills directory (run from project root)
mkdir -p .takumi/skills/linting

# Create SKILL.md file
cat > .takumi/skills/linting/SKILL.md << 'EOF'
---
name: linting
description: Run project-specific linting and fix common issues.
---

# Linting

## Instructions
- Run `npm run format -- --write` to fix formatting
- Run `npm run typecheck` to check TypeScript types
- Common issues:
  - Missing semicolons
  - Unused imports
  - Type mismatches
EOF
```

## Test Cases

### Test 1: Skills Load at Startup

**Steps:**
1. Start the CLI: `bun ./src/cli.ts`
2. Check the console output for any skill loading warnings

**Expected:**
- No warnings if skills are valid
- Warning messages for invalid skills (missing frontmatter, etc.)

### Test 2: Skills Appear in System Prompt

**Steps:**
1. Start the CLI: `bun ./src/cli.ts`
2. Send any message
3. Check the request log in `~/.takumi/projects/<project>/requests/` for the system prompt

**Expected:**
- System prompt should contain a `# Skills` section
- Section should list `$pdf-processing` and `$linting` with their descriptions

### Test 3: Explicit Skill Invocation

**Steps:**
1. Start the CLI: `bun ./src/cli.ts`
2. Send a message: `Process invoice.pdf using $pdf-processing`

**Expected:**
- The message sent to LLM should include a `<skill>` block with:
  - `<name>pdf-processing</name>`
  - `<path>` pointing to the SKILL.md file
  - Full skill content including frontmatter and body

### Test 4: Multiple Skills in One Message

**Steps:**
1. Start the CLI: `bun ./src/cli.ts`
2. Send a message: `First $pdf-processing the document, then run $linting`

**Expected:**
- Both skills should be injected as separate `<skill>` blocks
- Each skill appears only once (no duplicates)

### Test 5: Non-existent Skill Mention

**Steps:**
1. Start the CLI: `bun ./src/cli.ts`
2. Send a message: `Use $nonexistent skill`

**Expected:**
- No `<skill>` block injected (skill doesn't exist)
- No error message
- LLM receives the message as-is

### Test 6: Project Skill Overrides Global Skill

**Steps:**
1. Create a global skill with name `shared`:
   ```bash
   mkdir -p ~/.takumi/skills/shared
   cat > ~/.takumi/skills/shared/SKILL.md << 'EOF'
   ---
   name: shared
   description: Global version of shared skill
   ---
   # Global Shared
   EOF
   ```

2. Create a project skill with same name:
   ```bash
   mkdir -p .takumi/skills/shared
   cat > .takumi/skills/shared/SKILL.md << 'EOF'
   ---
   name: shared
   description: Project version of shared skill
   ---
   # Project Shared
   EOF
   ```

3. Start the CLI and send: `Use $shared`

**Expected:**
- Only the project version is injected
- Description in system prompt shows "Project version of shared skill"

### Test 7: Invalid Skill File (Missing Frontmatter)

**Steps:**
1. Create an invalid skill:
   ```bash
   mkdir -p ~/.takumi/skills/invalid
   cat > ~/.takumi/skills/invalid/SKILL.md << 'EOF'
   # No Frontmatter
   Just content without YAML frontmatter.
   EOF
   ```

2. Start the CLI: `bun ./src/cli.ts`

**Expected:**
- Warning in console: `[skill] Warning: ... Missing frontmatter`
- Invalid skill not loaded
- Other valid skills still work

### Test 8: Invalid Skill File (Missing Required Field)

**Steps:**
1. Create a skill missing description:
   ```bash
   mkdir -p ~/.takumi/skills/nodesc
   cat > ~/.takumi/skills/nodesc/SKILL.md << 'EOF'
   ---
   name: nodesc
   ---
   # No Description
   EOF
   ```

2. Start the CLI: `bun ./src/cli.ts`

**Expected:**
- Warning in console: `[skill] Warning: ... Missing required field: description`
- Invalid skill not loaded

## Cleanup

```bash
# Remove test skills
rm -rf ~/.takumi/skills/pdf-processing
rm -rf ~/.takumi/skills/shared
rm -rf ~/.takumi/skills/invalid
rm -rf ~/.takumi/skills/nodesc
rm -rf .takumi/skills/linting
rm -rf .takumi/skills/shared
```

## Debug Tips

1. **Check loaded skills programmatically:**
   Add `console.log(context.skillManager.getSkills())` in the code to see all loaded skills.

2. **Check skill errors:**
   Add `console.log(context.skillManager.getErrors())` to see all loading errors.

3. **Inspect request logs:**
   Check `~/.takumi/projects/<project-hash>/requests/` for the actual prompts sent to the LLM.

