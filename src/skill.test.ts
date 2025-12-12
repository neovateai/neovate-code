import fs from 'fs';
import os from 'os';
import path from 'pathe';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Paths } from './paths';
import { SkillManager, renderSkillsSection, type SkillMetadata } from './skill';

describe('SkillManager', () => {
  let tempDir: string;
  let globalDir: string;
  let projectDir: string;
  let paths: Paths;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-test-'));
    globalDir = path.join(tempDir, '.testproduct');
    projectDir = path.join(tempDir, 'project', '.testproduct');

    // Mock Paths
    paths = {
      globalConfigDir: globalDir,
      projectConfigDir: projectDir,
      globalProjectDir: path.join(globalDir, 'projects'),
    } as Paths;
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  function createSkillFile(
    baseDir: string,
    skillName: string,
    content: string,
  ): string {
    const skillDir = path.join(baseDir, 'skills', skillName);
    fs.mkdirSync(skillDir, { recursive: true });
    const skillPath = path.join(skillDir, 'SKILL.md');
    fs.writeFileSync(skillPath, content);
    return skillPath;
  }

  describe('loadSkills', () => {
    it('should load skills from global directory', () => {
      createSkillFile(
        globalDir,
        'pdf-processing',
        `---
name: pdf-processing
description: Extract text from PDFs
---

# PDF Processing

Instructions here.
`,
      );

      const manager = new SkillManager({ paths, productName: 'testproduct' });
      const skills = manager.getSkills();

      expect(skills).toHaveLength(1);
      expect(skills[0].name).toBe('pdf-processing');
      expect(skills[0].description).toBe('Extract text from PDFs');
    });

    it('should load skills from project directory', () => {
      createSkillFile(
        projectDir,
        'linting',
        `---
name: linting
description: Project-specific linting rules
---

# Linting

Instructions here.
`,
      );

      const manager = new SkillManager({ paths, productName: 'testproduct' });
      const skills = manager.getSkills();

      expect(skills).toHaveLength(1);
      expect(skills[0].name).toBe('linting');
    });

    it('should prioritize project skills over global skills with same name', () => {
      createSkillFile(
        globalDir,
        'shared',
        `---
name: shared
description: Global version
---

# Global
`,
      );

      createSkillFile(
        projectDir,
        'shared',
        `---
name: shared
description: Project version
---

# Project
`,
      );

      const manager = new SkillManager({ paths, productName: 'testproduct' });
      const skills = manager.getSkills();

      expect(skills).toHaveLength(1);
      expect(skills[0].description).toBe('Project version');
    });

    it('should handle missing frontmatter gracefully', () => {
      createSkillFile(
        globalDir,
        'invalid',
        `# No frontmatter

Just content.
`,
      );

      const manager = new SkillManager({ paths, productName: 'testproduct' });
      const skills = manager.getSkills();
      const errors = manager.getErrors();

      expect(skills).toHaveLength(0);
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain('Missing frontmatter');
    });

    it('should handle missing name field', () => {
      createSkillFile(
        globalDir,
        'noname',
        `---
description: No name field
---

# Content
`,
      );

      const manager = new SkillManager({ paths, productName: 'testproduct' });
      const errors = manager.getErrors();

      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain('Missing required field: name');
    });

    it('should handle missing description field', () => {
      createSkillFile(
        globalDir,
        'nodesc',
        `---
name: nodesc
---

# Content
`,
      );

      const manager = new SkillManager({ paths, productName: 'testproduct' });
      const errors = manager.getErrors();

      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain(
        'Missing required field: description',
      );
    });

    it('should handle name exceeding max length', () => {
      const longName = 'a'.repeat(65);
      createSkillFile(
        globalDir,
        'longname',
        `---
name: ${longName}
description: Test
---

# Content
`,
      );

      const manager = new SkillManager({ paths, productName: 'testproduct' });
      const errors = manager.getErrors();

      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain('exceeds maximum length');
    });
  });

  describe('findSkillMentions', () => {
    it('should find skill mentions in text', () => {
      createSkillFile(
        globalDir,
        'pdf-processing',
        `---
name: pdf-processing
description: Extract text from PDFs
---

# Content
`,
      );

      createSkillFile(
        globalDir,
        'linting',
        `---
name: linting
description: Run linting
---

# Content
`,
      );

      const manager = new SkillManager({ paths, productName: 'testproduct' });
      const mentions = manager.findSkillMentions(
        'Process this file using $pdf-processing and then $linting',
      );

      expect(mentions).toHaveLength(2);
      expect(mentions.map((m) => m.name)).toContain('pdf-processing');
      expect(mentions.map((m) => m.name)).toContain('linting');
    });

    it('should not duplicate mentions', () => {
      createSkillFile(
        globalDir,
        'test',
        `---
name: test
description: Test skill
---

# Content
`,
      );

      const manager = new SkillManager({ paths, productName: 'testproduct' });
      const mentions = manager.findSkillMentions('Use $test and $test again');

      expect(mentions).toHaveLength(1);
    });

    it('should ignore non-existent skill mentions', () => {
      const manager = new SkillManager({ paths, productName: 'testproduct' });
      const mentions = manager.findSkillMentions('Use $nonexistent skill');

      expect(mentions).toHaveLength(0);
    });
  });

  describe('readSkillBody', () => {
    it('should read full skill file contents', async () => {
      const content = `---
name: test
description: Test skill
---

# Test Skill

Full instructions here.
`;
      createSkillFile(globalDir, 'test', content);

      const manager = new SkillManager({ paths, productName: 'testproduct' });
      const skills = manager.getSkills();
      const body = await manager.readSkillBody(skills[0]);

      expect(body).toBe(content);
    });
  });

  describe('formatSkillInjection', () => {
    it('should format skill injection correctly', () => {
      const manager = new SkillManager({ paths, productName: 'testproduct' });
      const formatted = manager.formatSkillInjection(
        'test',
        '/path/to/SKILL.md',
        '---\nname: test\n---\n\n# Content',
      );

      expect(formatted).toContain('<skill>');
      expect(formatted).toContain('<name>test</name>');
      expect(formatted).toContain('<path>/path/to/SKILL.md</path>');
      expect(formatted).toContain('</skill>');
    });
  });
});

describe('renderSkillsSection', () => {
  it('should return empty string for no skills', () => {
    const result = renderSkillsSection([]);
    expect(result).toBe('');
  });

  it('should render skills section with skills', () => {
    const skills: SkillMetadata[] = [
      { name: 'pdf-processing', description: 'Extract PDFs', path: '/path' },
      { name: 'linting', description: 'Run linting', path: '/path2' },
    ];

    const result = renderSkillsSection(skills);

    expect(result).toContain('# Skills');
    expect(result).toContain('$pdf-processing');
    expect(result).toContain('Extract PDFs');
    expect(result).toContain('$linting');
    expect(result).toContain('Run linting');
  });
});
