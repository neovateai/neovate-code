import { Box, render, Text } from 'ink';
import Spinner from 'ink-spinner';
import path from 'pathe';
import type React from 'react';
import { useEffect, useState } from 'react';
import type { Context } from '../context';
import { Paths } from '../paths';
import {
  type AddSkillResult,
  SkillManager,
  type SkillMetadata,
  SkillSource,
} from '../skill';

type AddState =
  | { phase: 'cloning' }
  | { phase: 'done'; result: AddSkillResult }
  | { phase: 'error'; error: string };

type ListState =
  | { phase: 'loading' }
  | { phase: 'done'; skills: SkillMetadata[] }
  | { phase: 'error'; error: string };

type RemoveState =
  | { phase: 'removing' }
  | { phase: 'done' }
  | { phase: 'error'; error: string };

interface AddSkillUIProps {
  source: string;
  skillManager: SkillManager;
  options: {
    global?: boolean;
    overwrite?: boolean;
    name?: string;
    target?: string;
  };
}

const AddSkillUI: React.FC<AddSkillUIProps> = ({
  source,
  skillManager,
  options,
}) => {
  const [state, setState] = useState<AddState>({ phase: 'cloning' });

  useEffect(() => {
    const run = async () => {
      try {
        const result = await skillManager.addSkill(source, {
          global: options.global,
          overwrite: options.overwrite,
          name: options.name,
          targetDir: options.target,
        });
        setState({ phase: 'done', result });
        setTimeout(() => process.exit(0), 1500);
      } catch (error: any) {
        setState({ phase: 'error', error: error.message });
        setTimeout(() => process.exit(1), 2000);
      }
    };
    run();
  }, [source, skillManager, options]);

  if (state.phase === 'cloning') {
    return (
      <Box>
        <Text color="cyan">
          <Spinner type="dots" />
        </Text>
        <Text> Cloning skill from {source}...</Text>
      </Box>
    );
  }

  if (state.phase === 'error') {
    return <Text color="red">✗ Error: {state.error}</Text>;
  }

  const { result } = state;
  return (
    <Box flexDirection="column">
      {result.installed.length > 0 && (
        <Box flexDirection="column">
          <Text color="green" bold>
            ✓ Installed {result.installed.length} skill(s):
          </Text>
          {result.installed.map((skill) => (
            <Box key={skill.name} marginLeft={2}>
              <Text color="green">• {skill.name}</Text>
            </Box>
          ))}
        </Box>
      )}
      {result.skipped.length > 0 && (
        <Box
          flexDirection="column"
          marginTop={result.installed.length > 0 ? 1 : 0}
        >
          <Text color="yellow" bold>
            ⚠ Skipped {result.skipped.length} skill(s):
          </Text>
          {result.skipped.map((item) => (
            <Box key={item.name} marginLeft={2}>
              <Text color="yellow">• {item.name}</Text>
              <Text dimColor> - {item.reason}</Text>
            </Box>
          ))}
          <Box marginLeft={2} marginTop={1}>
            <Text dimColor>Use --overwrite to replace existing skills</Text>
          </Box>
        </Box>
      )}
      {result.errors.length > 0 && (
        <Box
          flexDirection="column"
          marginTop={
            result.installed.length > 0 || result.skipped.length > 0 ? 1 : 0
          }
        >
          <Text color="red" bold>
            ✗ Errors:
          </Text>
          {result.errors.map((error, i) => (
            <Box key={i} marginLeft={2}>
              <Text color="red">
                • {error.path}: {error.message}
              </Text>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

interface SkillListUIProps {
  skillManager: SkillManager;
}

const sourceLabels: Record<SkillSource, string> = {
  [SkillSource.GlobalClaude]: 'global-claude',
  [SkillSource.Global]: 'global',
  [SkillSource.ProjectClaude]: 'project-claude',
  [SkillSource.Project]: 'project',
  [SkillSource.Plugin]: 'plugin',
};

const sourceColors: Record<SkillSource, string> = {
  [SkillSource.GlobalClaude]: 'blue',
  [SkillSource.Global]: 'cyan',
  [SkillSource.ProjectClaude]: 'magenta',
  [SkillSource.Project]: 'green',
  [SkillSource.Plugin]: 'blueBright',
};

const SkillListUI: React.FC<SkillListUIProps> = ({ skillManager }) => {
  const [state, setState] = useState<ListState>({ phase: 'loading' });

  useEffect(() => {
    if (state.phase === 'done' || state.phase === 'error') {
      process.exit(state.phase === 'error' ? 1 : 0);
    }
  }, [state.phase]);

  useEffect(() => {
    const run = async () => {
      try {
        await skillManager.loadSkills();
        const skills = skillManager.getSkills();
        setState({ phase: 'done', skills });
      } catch (error: any) {
        setState({ phase: 'error', error: error.message });
      }
    };
    run();
  }, [skillManager]);

  if (state.phase === 'loading') {
    return (
      <Box>
        <Text color="cyan">
          <Spinner type="dots" />
        </Text>
        <Text> Loading skills...</Text>
      </Box>
    );
  }

  if (state.phase === 'error') {
    return <Text color="red">✗ Error: {state.error}</Text>;
  }

  const { skills } = state;
  if (skills.length === 0) {
    return <Text dimColor>No skills installed.</Text>;
  }

  const maxNameLen = Math.max(...skills.map((s) => s.name.length), 4);
  const maxSourceLen = Math.max(
    ...skills.map((s) => sourceLabels[s.source].length),
    6,
  );

  return (
    <Box flexDirection="column">
      <Box>
        <Text bold>{'Name'.padEnd(maxNameLen + 2)}</Text>
        <Text bold>Source</Text>
      </Box>
      <Box marginBottom={0}>
        <Text dimColor>{'─'.repeat(maxNameLen + 2)}</Text>
        <Text dimColor>{'─'.repeat(maxSourceLen)}</Text>
      </Box>
      {skills.map((skill) => (
        <Box key={`${skill.source}-${skill.name}`}>
          <Text>{skill.name.padEnd(maxNameLen + 2)}</Text>
          <Text color={sourceColors[skill.source] as any}>
            {sourceLabels[skill.source]}
          </Text>
        </Box>
      ))}
    </Box>
  );
};

interface RemoveSkillUIProps {
  name: string;
  targetDir: string;
  skillManager: SkillManager;
}

const RemoveSkillUI: React.FC<RemoveSkillUIProps> = ({
  name,
  targetDir,
  skillManager,
}) => {
  const [state, setState] = useState<RemoveState>({ phase: 'removing' });

  useEffect(() => {
    const run = async () => {
      try {
        const result = await skillManager.removeSkill(name, targetDir);
        if (result.success) {
          setState({ phase: 'done' });
          setTimeout(() => process.exit(0), 1000);
        } else {
          setState({ phase: 'error', error: result.error || 'Unknown error' });
          setTimeout(() => process.exit(1), 2000);
        }
      } catch (error: any) {
        setState({ phase: 'error', error: error.message });
        setTimeout(() => process.exit(1), 2000);
      }
    };
    run();
  }, [name, targetDir, skillManager]);

  if (state.phase === 'removing') {
    return (
      <Box>
        <Text color="cyan">
          <Spinner type="dots" />
        </Text>
        <Text> Removing skill "{name}"...</Text>
      </Box>
    );
  }

  if (state.phase === 'error') {
    return <Text color="red">✗ Error: {state.error}</Text>;
  }

  return (
    <Box>
      <Text color="green">✓ Skill "{name}" removed successfully.</Text>
    </Box>
  );
};

function printHelp(p: string) {
  console.log(
    `
Usage:
  ${p} skill <command> [options]

Manage skills for the code agent.

Commands:
  add <source>     Install skills from a source
  list             List all available skills
  remove <name>    Remove an installed skill

Options:
  -h, --help       Show help

Add Options:
  --target <dir>   Target directory for skills
  --global, -g     Install to global skills directory (~/.neovate/skills/)
  --overwrite      Overwrite existing skill with the same name
  --name <name>    Install with a custom local name

List Options:
  --target <dir>   Target directory for skills
  --json           Output as JSON

Remove Options:
  --target <dir>   Target directory for skills

Examples:
  ${p} skill add user/repo                    Add skill from GitHub
  ${p} skill add user/repo/path               Add skill from subpath
  ${p} skill add -g user/repo                 Add skill globally
  ${p} skill add --name my-skill user/repo    Add with custom name
  ${p} skill list                             List all skills
  ${p} skill list --json                      List as JSON
  ${p} skill remove my-skill                  Remove skill from project
  ${p} skill remove -g my-skill               Remove skill from global
    `.trim(),
  );
}

function resolveTargetDir(
  argv: { target?: string; global?: boolean },
  paths: Paths,
): string {
  if (argv.target) return path.resolve(argv.target);
  if (argv.global) return path.join(paths.globalConfigDir, 'skills');
  return path.join(paths.projectConfigDir, 'skills');
}

interface SkillArgv {
  _: string[];
  help?: boolean;
  global?: boolean;
  overwrite?: boolean;
  json?: boolean;
  target?: string;
  name?: string;
}

export async function runSkill(context: Context) {
  const { default: yargsParser } = await import('yargs-parser');
  const productName = context.productName.toLowerCase();
  const argv = yargsParser(process.argv.slice(3), {
    alias: {
      help: 'h',
      global: 'g',
      target: 't',
      name: 'n',
    },
    boolean: ['help', 'global', 'overwrite', 'json'],
    string: ['target', 'name'],
  }) as SkillArgv;

  const command = argv._[0];

  if (!command || argv.help) {
    printHelp(productName);
    return;
  }

  const paths = new Paths({
    productName: context.productName,
    cwd: context.cwd,
  });

  const skillManager = new SkillManager({ context });

  if (command === 'add') {
    const source = argv._[1] as string | undefined;
    if (!source) {
      console.error('Error: Missing source argument');
      console.error(`Usage: ${productName} skill add <source>`);
      process.exit(1);
    }

    render(
      <AddSkillUI
        source={source}
        skillManager={skillManager}
        options={{
          global: argv.global,
          overwrite: argv.overwrite,
          name: argv.name,
          target: argv.target,
        }}
      />,
      { patchConsole: true, exitOnCtrlC: true },
    );
    return;
  }

  if (command === 'list' || command === 'ls') {
    if (argv.json) {
      await skillManager.loadSkills();
      const skills = skillManager.getSkills();
      console.log(JSON.stringify(skills, null, 2));
      return;
    }

    render(<SkillListUI skillManager={skillManager} />, {
      patchConsole: true,
      exitOnCtrlC: true,
    });
    return;
  }

  if (command === 'remove' || command === 'rm') {
    const name = argv._[1] as string | undefined;
    if (!name) {
      console.error('Error: Missing skill name');
      console.error(`Usage: ${productName} skill remove <name>`);
      process.exit(1);
    }

    const targetDir = resolveTargetDir(argv, paths);

    render(
      <RemoveSkillUI
        name={name}
        targetDir={targetDir}
        skillManager={skillManager}
      />,
      { patchConsole: true, exitOnCtrlC: true },
    );
    return;
  }

  console.error(`Error: Unknown command "${command}"`);
  printHelp(productName);
  process.exit(1);
}
