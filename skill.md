# Skills and Commands Implementation in Claude Code

## 1. Skill Tool System Overview (`cli.js:380030-380063`)

The **Skill tool** is a special tool exposed to Claude that allows invoking skills within a conversation. Its description is dynamically generated:

```javascript
// Line 380030-380062
_B2 = Z0(async (A) => {
  let Q = await qYA(A),  // Load all available skills
    { limitedCommands: B } = TB2(Q),  // Apply token budget limit
    G = B.map((Y) => Y.userFacingName()).join(", ");
  return `Execute a skill within the main conversation
<skills_instructions>
When users ask you to perform tasks, check if any of the available skills below...
</skills_instructions>
<available_skills>
${TV8(B, Q.length)}  // Render skills as XML
</available_skills>
`;
});
```

The tool name is `"Skill"` (line 380064: `var Mw = "Skill"`).

---

## 2. SKILL.md File Discovery & Loading

### Directory Structure

Skills are loaded from three locations (line 482977-482982):

```javascript
VG0 = Z0(async (A) => {
  let Q = T81(iQ(), "skills"),           // User settings: ~/.config/claude-code/skills/
      B = T81(kq(), ".claude", "skills"), // Managed settings: ~/.claude/skills/
      G = EG0("skills", A);               // Project settings: .claude/skills/
```

### SKILL.md Loading Logic (`cli.js:482867-482959`)

The `KG0` function scans directories for `SKILL.md` files:

```javascript
async function KG0(A, Q) {
  let B = jA(), G = [];
  if (!B.existsSync(A)) return [];
  let Z = B.readdirSync(A);
  for (let Y of Z) {
    if (!Y.isDirectory() && !Y.isSymbolicLink()) continue;
    let J = T81(A, Y.name),
        I = T81(J, "SKILL.md");  // Look for SKILL.md in each subdirectory
    if (B.existsSync(I)) {
      let X = B.readFileSync(I, { encoding: "utf-8" }),
          { frontmatter: W, content: K } = CW(X);  // Parse YAML frontmatter
      // ... create skill object
    }
  }
}
```

---

## 3. SKILL.md Frontmatter Schema (`cli.js:482880-482904`)

The frontmatter supports these fields:

| Field | Purpose |
|-------|---------|
| `description` | Skill description shown to model |
| `allowed-tools` | List of tools the skill can use |
| `argument-hint` | Hint for argument format |
| `when_to_use` | Guidance on when to invoke |
| `version` | Skill version |
| `name` | Display name (overrides folder name) |
| `disable-model-invocation` | If true, model cannot auto-invoke |
| `model` | Override model (e.g., "inherit") |

```javascript
let V = Y.name,
    E = W.description ?? mx(K, "Skill"),
    D = AM(W["allowed-tools"]),
    H = W["argument-hint"],
    F = W.when_to_use,
    C = W.version,
    U = W.name,
    N = W["disable-model-invocation"],
    q = W.model === "inherit" ? void 0 : W.model;
```

---

## 4. Skill Object Creation (`cli.js:482892-482951`)

Each skill becomes an object with:

```javascript
G.push({
  skill: {
    type: "prompt",
    name: V,
    description: T,  // "${description} (${source})"
    hasUserSpecifiedDescription: !!W.description,
    allowedTools: D,
    argumentHint: H,
    whenToUse: F,
    version: C,
    model: q,
    isSkill: !0,
    disableModelInvocation: L,
    isEnabled: () => !0,
    isHidden: !0,
    progressMessage: "running",
    userFacingName() { return U || V; },
    source: Q,
    async getPromptForCommand(_, x) {
      let f = `Base directory for this skill: ${J}\n\n${K}`;
      if (_) {
        if (f.includes("$ARGUMENTS"))
          f = f.replaceAll("$ARGUMENTS", _);
        else
          f = f + `\n\nARGUMENTS: ${_}`;
      }
      // Apply template substitution via Ci()
      return [{ type: "text", text: f }];
    }
  },
  filePath: I
});
```

---

## 5. Plugin Skills Loading (`cli.js:443018-443058`)

For plugins, the `Yq2` function loads skills:

```javascript
async function Yq2(A, Q, B, G, Z) {
  let Y = jA(), J = [];
  if (!Y.existsSync(A)) return [];

  // Check for SKILL.md directly in the directory
  let I = rJA(A, "SKILL.md");
  if (Y.existsSync(I)) {
    let W = Y.readFileSync(I, { encoding: "utf-8" }),
        { frontmatter: K, content: V } = CW(W),
        E = `${Q}:${tJA(A)}`,
        D = { filePath: I, baseDir: zi(I), frontmatter: K, content: V },
        H = tOA(E, D, B, G, Z, !0, { isSkillMode: !0 });
    if (H) J.push(H);
    return J;
  }

  // Otherwise scan subdirectories for SKILL.md
  let X = Y.readdirSync(A);
  for (let W of X) {
    if (!W.isDirectory() && !W.isSymbolicLink()) continue;
    let K = rJA(A, W.name),
        V = rJA(K, "SKILL.md");
    // ... load skill from subdirectory
  }
}
```

---

## 6. Skill Filtering for Model Invocation (`cli.js:486311-486319`)

Not all skills appear in `<available_skills>`. The `qYA` function filters:

```javascript
qYA = Z0(async (A) => {
  return (await sF(A)).filter(
    (B) =>
      B.type === "prompt" &&
      B.isSkill === !0 &&
      !B.disableModelInvocation &&      // Must allow model invocation
      B.source !== "builtin" &&
      (B.hasUserSpecifiedDescription || B.whenToUse)  // Must have description or when_to_use
  );
});
```

---

## 7. Skill XML Rendering (`cli.js:379957-379989`)

Skills are rendered as XML for the model:

```javascript
function RB2(A) {
  let Q = A.name,
      B = A.whenToUse ? `${A.description} - ${A.whenToUse}` : A.description,
      G = /* determine location: project/user/plugin/managed */;
  return `<skill>
<name>${Q}</name>
<description>${B}</description>
<location>${G}</location>
</skill>`;
}
```

---

## 8. Token Budget Limiting (`cli.js:379990-380016`)

Skills are limited by character budget (default 15000 chars):

```javascript
function MV8() {
  return Number(process.env.SLASH_COMMAND_TOOL_CHAR_BUDGET) || 15000;
}

function OV8(A) {
  let Q = [], B = 0;
  for (let G of A) {
    let Z = RB2(G);
    if ((B += Z.length + 1) > MV8()) break;
    Q.push(G);
  }
  return Q;
}
```

---

## Summary

**Skills** are prompt-based commands defined via `SKILL.md` files that:

1. Live in `~/.claude/skills/`, `~/.config/claude-code/skills/`, `.claude/skills/`, or plugin directories
2. Use YAML frontmatter for metadata (`description`, `allowed-tools`, `when_to_use`, etc.)
3. Are filtered to only show model-invokable skills with descriptions
4. Get rendered as XML in the `<available_skills>` section of the Skill tool
5. When invoked, inject their content as a prompt with `Base directory for this skill: ...` prefix
6. Support `$ARGUMENTS` placeholder substitution
