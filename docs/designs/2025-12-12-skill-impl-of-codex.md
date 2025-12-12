# Skill System Implementation Guide

This document describes how to implement the Skills feature from Codex CLI (commit a8d5ad3, PR #7412) in another code agent.

## Overview

Skills are reusable instruction bundles stored on disk. The system:
- Discovers `SKILL.md` files at startup
- Injects only name/description/path into context (keeps it lean)
- Loads full skill body on-demand when user explicitly invokes a skill

## File Format: SKILL.md

```markdown
---
name: pdf-processing
description: Extract text and tables from PDFs; use when PDFs, forms, or document extraction are mentioned.
---

# PDF Processing

## Instructions
- Use pdfplumber to extract text
- For tables, use camelot or tabula-py
- For form filling, see FORMS.md

## References
- See `references/pdf-libs.md` for library comparison
```

### Frontmatter Rules
- **Required fields**: `name`, `description`
- **name**: Non-empty, max 64 characters, single line
- **description**: Non-empty, max 1024 characters, single line
- Extra YAML keys are ignored
- Body (after second `---`) can be any Markdown

## Directory Structure

```
~/.your-agent/
└── skills/
    ├── pdf-processing/
    │   ├── SKILL.md           # Required
    │   ├── references/        # Optional
    │   │   └── pdf-libs.md
    │   └── scripts/           # Optional
    │       └── extract.py
    └── linting/
        └── SKILL.md

# Also check project-local skills:
.your-agent/
└── skills/
    └── project-specific/
        └── SKILL.md
```

## Data Models

```typescript
interface SkillMetadata {
  name: string;        // e.g., "pdf-processing"
  description: string; // e.g., "Extract text from PDFs..."
  path: string;        // Absolute path to SKILL.md
}

interface SkillError {
  path: string;
  message: string;
}

interface SkillLoadOutcome {
  skills: SkillMetadata[];
  errors: SkillError[];
}
```

## Implementation Components

### 1. Skill Loader

```typescript
const SKILLS_FILENAME = "SKILL.md";
const MAX_NAME_LEN = 64;
const MAX_DESCRIPTION_LEN = 1024;

interface SkillFrontmatter {
  name: string;
  description: string;
}

function loadSkills(config: Config): SkillLoadOutcome {
  const outcome: SkillLoadOutcome = { skills: [], errors: [] };

  // Get skill root directories
  const roots = getSkillRoots(config);

  for (const root of roots) {
    discoverSkillsUnderRoot(root, outcome);
  }

  // Sort by name, then path for stability
  outcome.skills.sort((a, b) => {
    const nameCompare = a.name.localeCompare(b.name);
    return nameCompare !== 0 ? nameCompare : a.path.localeCompare(b.path);
  });

  return outcome;
}

function getSkillRoots(config: Config): string[] {
  const roots: string[] = [];

  // Global skills directory
  roots.push(path.join(config.agentHome, "skills"));

  // Project-local skills (if in a git repo)
  const repoRoot = findGitRoot(config.cwd);
  if (repoRoot) {
    roots.push(path.join(repoRoot, ".your-agent", "skills"));
  }

  return roots;
}

function discoverSkillsUnderRoot(root: string, outcome: SkillLoadOutcome): void {
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    return;
  }

  // BFS traversal
  const queue: string[] = [root];

  while (queue.length > 0) {
    const dir = queue.shift()!;

    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (e) {
      console.error(`Failed to read skills dir ${dir}: ${e}`);
      continue;
    }

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      // Skip hidden entries
      if (entry.name.startsWith('.')) {
        continue;
      }

      // Skip symlinks
      if (entry.isSymbolicLink()) {
        continue;
      }

      // Recurse into directories
      if (entry.isDirectory()) {
        queue.push(fullPath);
        continue;
      }

      // Parse SKILL.md files
      if (entry.isFile() && entry.name === SKILLS_FILENAME) {
        try {
          const skill = parseSkillFile(fullPath);
          outcome.skills.push(skill);
        } catch (e) {
          outcome.errors.push({
            path: fullPath,
            message: e instanceof Error ? e.message : String(e),
          });
        }
      }
    }
  }
}

function parseSkillFile(filePath: string): SkillMetadata {
  const contents = fs.readFileSync(filePath, 'utf-8');

  // Extract YAML frontmatter
  const frontmatter = extractFrontmatter(contents);
  if (!frontmatter) {
    throw new Error("missing YAML frontmatter delimited by ---");
  }

  // Parse YAML
  const parsed = yaml.parse(frontmatter) as SkillFrontmatter;

  // Sanitize (collapse whitespace to single line)
  const name = sanitizeSingleLine(parsed.name);
  const description = sanitizeSingleLine(parsed.description);

  // Validate
  validateField(name, MAX_NAME_LEN, "name");
  validateField(description, MAX_DESCRIPTION_LEN, "description");

  return {
    name,
    description,
    path: path.resolve(filePath),
  };
}

function extractFrontmatter(contents: string): string | null {
  const lines = contents.split('\n');

  // Must start with ---
  if (lines[0]?.trim() !== '---') {
    return null;
  }

  const frontmatterLines: string[] = [];
  let foundClosing = false;

  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      foundClosing = true;
      break;
    }
    frontmatterLines.push(lines[i]);
  }

  if (frontmatterLines.length === 0 || !foundClosing) {
    return null;
  }

  return frontmatterLines.join('\n');
}

function sanitizeSingleLine(raw: string): string {
  return raw.split(/\s+/).join(' ').trim();
}

function validateField(value: string, maxLen: number, fieldName: string): void {
  if (!value) {
    throw new Error(`missing field \`${fieldName}\``);
  }
  if ([...value].length > maxLen) {
    throw new Error(`invalid ${fieldName}: exceeds maximum length of ${maxLen} characters`);
  }
}
```

### 2. Context Rendering (System Prompt Injection)

```typescript
function renderSkillsSection(skills: SkillMetadata[]): string | null {
  if (skills.length === 0) {
    return null;
  }

  const lines: string[] = [];

  // Header
  lines.push("## Skills");
  lines.push(
    "These skills are discovered at startup from ~/.your-agent/skills; " +
    "each entry shows name, description, and file path so you can open " +
    "the source for full instructions. Content is not inlined to keep context lean."
  );

  // One bullet per skill
  for (const skill of skills) {
    lines.push(`- ${skill.name}: ${skill.description} (file: ${skill.path})`);
  }

  // Usage rules for the LLM
  lines.push(SKILL_USAGE_RULES);

  return lines.join('\n');
}

const SKILL_USAGE_RULES = `- Discovery: Available skills are listed in project docs and may also appear in a runtime "## Skills" section (name + description + file path). These are the sources of truth; skill bodies live on disk at the listed paths.
- Trigger rules: If the user names a skill (with \`$SkillName\` or plain text) OR the task clearly matches a skill's description, you must use that skill for that turn. Multiple mentions mean use them all. Do not carry skills across turns unless re-mentioned.
- Missing/blocked: If a named skill isn't in the list or the path can't be read, say so briefly and continue with the best fallback.
- How to use a skill (progressive disclosure):
  1) After deciding to use a skill, open its \`SKILL.md\`. Read only enough to follow the workflow.
  2) If \`SKILL.md\` points to extra folders such as \`references/\`, load only the specific files needed for the request; don't bulk-load everything.
  3) If \`scripts/\` exist, prefer running or patching them instead of retyping large code blocks.
  4) If \`assets/\` or templates exist, reuse them instead of recreating from scratch.
- Description as trigger: The YAML \`description\` in \`SKILL.md\` is the primary trigger signal; rely on it to decide applicability. If unsure, ask a brief clarification before proceeding.
- Coordination and sequencing:
  - If multiple skills apply, choose the minimal set that covers the request and state the order you'll use them.
  - Announce which skill(s) you're using and why (one short line). If you skip an obvious skill, say why.
- Context hygiene:
  - Keep context small: summarize long sections instead of pasting them; only load extra files when needed.
  - Avoid deeply nested references; prefer one-hop files explicitly linked from \`SKILL.md\`.
  - When variants exist (frameworks, providers, domains), pick only the relevant reference file(s) and note that choice.
- Safety and fallback: If a skill can't be applied cleanly (missing files, unclear instructions), state the issue, pick the next-best approach, and continue.`;
```

### 3. User Input Detection

```typescript
interface UserInput {
  type: 'text' | 'image' | 'skill';
  // For text:
  text?: string;
  // For skill:
  skillName?: string;
  skillPath?: string;
}

function findSkillMentions(text: string, skills: SkillMetadata[]): SkillMetadata[] {
  const seen = new Set<string>();
  const matches: SkillMetadata[] = [];

  for (const skill of skills) {
    if (seen.has(skill.name)) {
      continue;
    }

    // Look for $skillName pattern
    const needle = `$${skill.name}`;
    if (text.includes(needle)) {
      seen.add(skill.name);
      matches.push(skill);
    }
  }

  return matches;
}

// When processing user input:
function processUserMessage(text: string, skills: SkillMetadata[]): UserInput[] {
  const inputs: UserInput[] = [];

  // Add the text itself
  if (text.trim()) {
    inputs.push({ type: 'text', text });
  }

  // Detect skill mentions
  const mentionedSkills = findSkillMentions(text, skills);
  for (const skill of mentionedSkills) {
    inputs.push({
      type: 'skill',
      skillName: skill.name,
      skillPath: skill.path,
    });
  }

  return inputs;
}
```

### 4. Runtime Skill Body Injection

```typescript
interface SkillInjection {
  items: ConversationItem[];
  warnings: string[];
}

async function buildSkillInjections(
  inputs: UserInput[],
  skills: SkillMetadata[]
): Promise<SkillInjection> {
  const result: SkillInjection = { items: [], warnings: [] };

  // Find which skills were mentioned
  const skillInputs = inputs.filter(i => i.type === 'skill');
  const seen = new Set<string>();

  for (const input of skillInputs) {
    if (!input.skillName || seen.has(input.skillName)) {
      continue;
    }
    seen.add(input.skillName);

    // Find matching skill metadata
    const skill = skills.find(
      s => s.name === input.skillName && s.path === input.skillPath
    );
    if (!skill) {
      continue;
    }

    // Read skill body from disk
    try {
      const contents = await fs.promises.readFile(skill.path, 'utf-8');

      // Wrap in XML and add as user message
      result.items.push({
        role: 'user',
        content: formatSkillInstructions(skill.name, skill.path, contents),
      });
    } catch (e) {
      result.warnings.push(
        `Failed to load skill ${skill.name} at ${skill.path}: ${e}`
      );
    }
  }

  return result;
}

function formatSkillInstructions(name: string, path: string, contents: string): string {
  return `<skill>
<name>${name}</name>
<path>${path}</path>
${contents}
</skill>`;
}
```

### 5. Error Handling at Startup

```typescript
function handleSkillErrors(errors: SkillError[]): 'continue' | 'exit' {
  if (errors.length === 0) {
    return 'continue';
  }

  console.log("Skill validation errors detected");
  console.log("Fix these SKILL.md files and restart. Invalid skills are ignored until resolved.");
  console.log("");

  for (const error of errors) {
    console.log(`- ${error.path}: ${error.message}`);
  }

  // In a TUI, show a modal and let user choose to continue or exit
  // For CLI, you might just log and continue
  return 'continue';
}
```

### 6. Integration with System Prompt

```typescript
async function buildSystemPrompt(config: Config, skills: SkillMetadata[]): Promise<string> {
  const parts: string[] = [];

  // 1. Base system instructions
  if (config.systemInstructions) {
    parts.push(config.systemInstructions);
  }

  // 2. Project documentation (e.g., AGENTS.md)
  const projectDoc = await readProjectDocs(config);
  if (projectDoc) {
    if (parts.length > 0) {
      parts.push("\n\n--- project-doc ---\n\n");
    }
    parts.push(projectDoc);
  }

  // 3. Skills section (appended to project doc)
  const skillsSection = renderSkillsSection(skills);
  if (skillsSection) {
    if (parts.length > 0) {
      parts.push("\n\n");
    }
    parts.push(skillsSection);
  }

  return parts.join('');
}
```

## Complete Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        STARTUP                                   │
│                                                                  │
│  1. loadSkills(config)                                          │
│     ├─ Scan ~/.agent/skills/ and .agent/skills/                 │
│     ├─ Parse each SKILL.md (YAML frontmatter)                   │
│     ├─ Validate name/description lengths                        │
│     └─ Return { skills: [...], errors: [...] }                  │
│                                                                  │
│  2. handleSkillErrors(errors)                                   │
│     └─ Show modal/log if any errors                             │
│                                                                  │
│  3. buildSystemPrompt(config, skills)                           │
│     └─ Append "## Skills" section with names/descriptions/paths │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      USER TURN                                   │
│                                                                  │
│  User types: "Please process this PDF using $pdf-processing"    │
│                                                                  │
│  1. processUserMessage(text, skills)                            │
│     ├─ Create UserInput for text                                │
│     └─ findSkillMentions() → detect $pdf-processing             │
│                                                                  │
│  2. buildSkillInjections(inputs, skills)                        │
│     ├─ Read ~/.agent/skills/pdf-processing/SKILL.md from disk   │
│     └─ Wrap in <skill>...</skill> XML                           │
│                                                                  │
│  3. Send to LLM:                                                │
│     ├─ System prompt (with ## Skills section)                   │
│     ├─ User message: "Please process this PDF..."               │
│     └─ Injected skill: <skill><name>pdf-processing</name>...</> │
└─────────────────────────────────────────────────────────────────┘
```

## Feature Flag

Skills should be gated behind a feature flag (disabled by default for experimental features):

```typescript
interface FeatureFlags {
  skills: boolean;  // default: false
}

// Only load/render skills if enabled
if (config.features.skills) {
  const skillOutcome = loadSkills(config);
  // ...
}
```

## Key Design Principles

1. **Lazy Loading**: Skill bodies stay on disk until explicitly invoked → keeps context small
2. **Progressive Disclosure**: LLM reads only what it needs from SKILL.md
3. **Explicit Invocation**: `$skillName` syntax for unambiguous skill selection
4. **Two Discovery Roots**: Global + project-local for flexibility
5. **Validation at Startup**: Catch errors early, don't block the agent
6. **Context Hygiene**: Only names/descriptions in system prompt, not bodies

## Example Usage

### Creating a Skill

```bash
mkdir -p ~/.your-agent/skills/pdf-processing
cat > ~/.your-agent/skills/pdf-processing/SKILL.md << 'EOF'
---
name: pdf-processing
description: Extract text and tables from PDFs; use when PDFs, forms, or document extraction are mentioned.
---

# PDF Processing Skill

## When to Use
- User mentions PDF, document extraction, or form processing
- File extensions: .pdf

## Instructions
1. Use `pdfplumber` for text extraction
2. Use `camelot` for table extraction
3. For scanned PDFs, use `pytesseract` OCR

## Code Template
```python
import pdfplumber

def extract_text(pdf_path: str) -> str:
    with pdfplumber.open(pdf_path) as pdf:
        return "\n".join(page.extract_text() or "" for page in pdf.pages)
```
EOF
```

### Invoking a Skill

User message:
```
Please extract the text from invoice.pdf using $pdf-processing
```

The agent will:
1. Detect `$pdf-processing` in the message
2. Read the full SKILL.md content from disk
3. Inject it into the conversation as a user message wrapped in `<skill>` tags
4. Follow the instructions to extract text from the PDF
