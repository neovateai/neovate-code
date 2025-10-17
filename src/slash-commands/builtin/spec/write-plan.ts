import type { PromptCommand } from '../../types';

export const writePlanCommand = {
  type: 'prompt',
  name: 'spec:write-plan',
  description:
    'Create detailed implementation plans with bite-sized tasks for engineers with zero codebase context',
  progressMessage: 'Creating implementation plan...',
  async getPromptForCommand() {
    return [
      {
        role: 'user',
        content: `
# Writing Plans

## Overview

Write comprehensive implementation plans assuming the engineer has zero context for our codebase and questionable taste. Document everything they need to know: which files to touch for each task, code, testing, docs they might need to check, how to test it. Give them the whole plan as bite-sized tasks. DRY. YAGNI.

Assume they are a skilled developer, but know almost nothing about our toolset or problem domain. Assume they don't know good test design very well.

**Announce at start:** "I'm creating the implementation plan."

**Save plans to:** \`docs/plans/YYYY-MM-DD-\<feature-name\>.md\`

## Bite-Sized Task Granularity

**Each step is one action (2-5 minutes):**
- "Write the failing test" - step
- "Run it to make sure it fails" - step
- "Implement the minimal code to make the test pass" - step
- "Run the tests and make sure they pass" - step
- "Commit" - step

## Plan Document Header

**Every plan MUST start with this header:**

\`\`\`markdown
# [Feature Name] Implementation Plan

**Goal:** [One sentence describing what this builds]

**Architecture:** [2-3 sentences about approach]

**Tech Stack:** [Key technologies/libraries]

---
\`\`\`

## Task Structure

\`\`\`markdown
### Task N: [Component Name]

**Files:**
- Create: \`exact/path/to/file.py\`
- Modify: \`exact/path/to/existing.py:123-145\`
- Test: \`tests/exact/path/to/test.py\`

**Step 1: Write the failing test**

\`\`\`python
def test_specific_behavior():
    result = function(input)
    assert result == expected
\`\`\`

**Step 2: Run test to verify it fails**

Run: \`pytest tests/path/test.py::test_name -v\`
Expected: FAIL with "function not defined"

**Step 3: Write minimal implementation**

\`\`\`python
def function(input):
    return expected
\`\`\`

**Step 4: Run test to verify it passes**

Run: \`pytest tests/path/test.py::test_name -v\`
Expected: PASS

## Remember
- Exact file paths always
- Complete code in plan (not "add validation")
- Exact commands with expected output
- DRY, YAGNI
        `.trim(),
      },
    ];
  },
} as PromptCommand;
