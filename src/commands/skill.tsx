import { Box, render, Text, useInput } from 'ink';
import Spinner from 'ink-spinner';
import path from 'pathe';
import type React from 'react';
import { useEffect, useState } from 'react';
import type { Context } from '../context';
import { DirectTransport, MessageBus } from '../messageBus';
import { NodeBridge } from '../nodeBridge';
import { Paths } from '../paths';
import { SkillSource } from '../skill';

// Types for handler responses
interface SkillMetadata {
  name: string;
  description: string;
  path: string;
  source: string;
}

interface SkillError {
  path: string;
  message: string;
}

interface AddSkillResult {
  installed: SkillMetadata[];
  skipped: Array<{ name: string; reason: string }>;
  errors: SkillError[];
}

interface PreviewSkill {
  name: string;
  description: string;
  skillPath: string;
}

type AddState =
  | { phase: 'cloning' }
  | { phase: 'done'; result: AddSkillResult }
  | { phase: 'error'; error: string };

type InteractiveAddState =
  | { phase: 'cloning' }
  | {
      phase: 'selecting';
      previewId: string;
      skills: PreviewSkill[];
    }
  | { phase: 'installing' }
  | { phase: 'done'; result: AddSkillResult }
  | { phase: 'cancelled' }
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
  messageBus: MessageBus;
  cwd: string;
  options: {
    global?: boolean;
    claude?: boolean;
    overwrite?: boolean;
    name?: string;
    target?: string;
  };
}

const AddSkillUI: React.FC<AddSkillUIProps> = ({
  source,
  messageBus,
  cwd,
  options,
}) => {
  const [state, setState] = useState<AddState>({ phase: 'cloning' });

  useEffect(() => {
    const run = async () => {
      try {
        const result = await messageBus.request('skills.add', {
          cwd,
          source,
          global: options.global,
          claude: options.claude,
          overwrite: options.overwrite,
          name: options.name,
          targetDir: options.target,
        });
        if (!result.success) {
          setState({ phase: 'error', error: result.error || 'Unknown error' });
          setTimeout(() => process.exit(1), 2000);
          return;
        }
        setState({ phase: 'done', result: result.data });
        setTimeout(() => process.exit(0), 1500);
      } catch (error: any) {
        setState({ phase: 'error', error: error.message });
        setTimeout(() => process.exit(1), 2000);
      }
    };
    run();
  }, [source, messageBus, cwd, options]);

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
  const installDir =
    result.installed.length > 0
      ? path.dirname(path.dirname(result.installed[0].path))
      : null;
  return (
    <Box flexDirection="column">
      {result.installed.length > 0 && (
        <Box flexDirection="column">
          <Text color="green" bold>
            ✓ Installed {result.installed.length} skill(s) to {installDir}:
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
  messageBus: MessageBus;
  cwd: string;
}

const sourceLabels: Record<SkillSource, string> = {
  [SkillSource.GlobalClaude]: 'global-claude',
  [SkillSource.Global]: 'global',
  [SkillSource.ProjectClaude]: 'project-claude',
  [SkillSource.Project]: 'project',
  [SkillSource.Plugin]: 'plugin',
  [SkillSource.Config]: 'config',
};

const sourceColors: Record<SkillSource, string> = {
  [SkillSource.GlobalClaude]: 'blue',
  [SkillSource.Global]: 'cyan',
  [SkillSource.ProjectClaude]: 'magenta',
  [SkillSource.Project]: 'green',
  [SkillSource.Plugin]: 'blueBright',
  [SkillSource.Config]: 'yellow',
};

// Map source string to SkillSource enum
const sourceStringToEnum: Record<string, SkillSource> = {
  'global-claude': SkillSource.GlobalClaude,
  global: SkillSource.Global,
  'project-claude': SkillSource.ProjectClaude,
  project: SkillSource.Project,
  plugin: SkillSource.Plugin,
  config: SkillSource.Config,
};

const SkillListUI: React.FC<SkillListUIProps> = ({ messageBus, cwd }) => {
  const [state, setState] = useState<ListState>({ phase: 'loading' });

  useEffect(() => {
    if (state.phase === 'done' || state.phase === 'error') {
      process.exit(state.phase === 'error' ? 1 : 0);
    }
  }, [state.phase]);

  useEffect(() => {
    const run = async () => {
      try {
        const result = await messageBus.request('skills.list', { cwd });
        if (!result.success) {
          setState({ phase: 'error', error: 'Failed to list skills' });
          return;
        }
        setState({ phase: 'done', skills: result.data.skills });
      } catch (error: any) {
        setState({ phase: 'error', error: error.message });
      }
    };
    run();
  }, [messageBus, cwd]);

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
    ...skills.map((s) => {
      const sourceEnum = sourceStringToEnum[s.source];
      return sourceEnum ? sourceLabels[sourceEnum].length : s.source.length;
    }),
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
      {skills.map((skill) => {
        const sourceEnum = sourceStringToEnum[skill.source];
        const label = sourceEnum ? sourceLabels[sourceEnum] : skill.source;
        const color = sourceEnum ? sourceColors[sourceEnum] : 'white';
        return (
          <Box key={`${skill.source}-${skill.name}`}>
            <Text>{skill.name.padEnd(maxNameLen + 2)}</Text>
            <Text color={color as any}>{label}</Text>
          </Box>
        );
      })}
    </Box>
  );
};

interface RemoveSkillUIProps {
  name: string;
  targetDir: string;
  messageBus: MessageBus;
  cwd: string;
}

interface InteractiveAddSkillUIProps {
  source: string;
  messageBus: MessageBus;
  cwd: string;
  options: {
    global?: boolean;
    claude?: boolean;
    overwrite?: boolean;
    name?: string;
    target?: string;
  };
}

const InteractiveAddSkillUI: React.FC<InteractiveAddSkillUIProps> = ({
  source,
  messageBus,
  cwd,
  options,
}) => {
  const [state, setState] = useState<InteractiveAddState>({ phase: 'cloning' });
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(
    new Set(),
  );
  const [cursorIndex, setCursorIndex] = useState(0);

  useEffect(() => {
    const run = async () => {
      try {
        const result = await messageBus.request('skills.preview', {
          cwd,
          source,
        });
        if (!result.success) {
          setState({ phase: 'error', error: result.error || 'Unknown error' });
          setTimeout(() => process.exit(1), 2000);
          return;
        }
        const { previewId, skills, errors } = result.data;
        if (skills.length === 0) {
          setState({
            phase: 'error',
            error: errors.length > 0 ? errors[0].message : 'No skills found',
          });
          setTimeout(() => process.exit(1), 2000);
          return;
        }
        // Pre-select all skills
        setSelectedIndices(
          new Set(skills.map((_: PreviewSkill, i: number) => i)),
        );
        setState({ phase: 'selecting', previewId, skills });
      } catch (error: any) {
        setState({ phase: 'error', error: error.message });
        setTimeout(() => process.exit(1), 2000);
      }
    };
    run();
  }, [source, messageBus, cwd]);

  useInput(
    (input, key) => {
      if (state.phase !== 'selecting') return;

      const { previewId, skills } = state;

      if (key.upArrow) {
        setCursorIndex((prev) => (prev > 0 ? prev - 1 : skills.length - 1));
      } else if (key.downArrow) {
        setCursorIndex((prev) => (prev < skills.length - 1 ? prev + 1 : 0));
      } else if (input === ' ') {
        setSelectedIndices((prev) => {
          const next = new Set(prev);
          if (next.has(cursorIndex)) {
            next.delete(cursorIndex);
          } else {
            next.add(cursorIndex);
          }
          return next;
        });
      } else if (key.return) {
        if (selectedIndices.size === 0) {
          setState({ phase: 'cancelled' });
          setTimeout(() => process.exit(0), 1000);
          return;
        }

        const selectedSkillNames = skills
          .filter((_: PreviewSkill, i: number) => selectedIndices.has(i))
          .map((s: PreviewSkill) => s.name);
        setState({ phase: 'installing' });

        messageBus
          .request('skills.install', {
            cwd,
            previewId,
            selectedSkills: selectedSkillNames,
            source,
            global: options.global,
            claude: options.claude,
            overwrite: options.overwrite,
            name: options.name,
            targetDir: options.target,
          })
          .then((result) => {
            if (!result.success) {
              setState({
                phase: 'error',
                error: result.error || 'Unknown error',
              });
              setTimeout(() => process.exit(1), 2000);
              return;
            }
            setState({ phase: 'done', result: result.data });
            setTimeout(() => process.exit(0), 1500);
          })
          .catch((error: any) => {
            setState({ phase: 'error', error: error.message });
            setTimeout(() => process.exit(1), 2000);
          });
      } else if (key.escape || input === 'q') {
        setState({ phase: 'cancelled' });
        setTimeout(() => process.exit(0), 1000);
      }
    },
    { isActive: state.phase === 'selecting' },
  );

  if (state.phase === 'cloning') {
    return (
      <Box>
        <Text color="cyan">
          <Spinner type="dots" />
        </Text>
        <Text> Fetching skills from {source}...</Text>
      </Box>
    );
  }

  if (state.phase === 'error') {
    return <Text color="red">✗ Error: {state.error}</Text>;
  }

  if (state.phase === 'cancelled') {
    return <Text dimColor>No skills selected.</Text>;
  }

  if (state.phase === 'installing') {
    return (
      <Box>
        <Text color="cyan">
          <Spinner type="dots" />
        </Text>
        <Text> Installing {selectedIndices.size} skill(s)...</Text>
      </Box>
    );
  }

  if (state.phase === 'selecting') {
    const { skills } = state;
    return (
      <Box flexDirection="column">
        <Text bold>Select skills to install:</Text>
        <Text dimColor>
          (↑/↓ navigate, space toggle, enter confirm, q/esc cancel)
        </Text>
        <Box flexDirection="column" marginTop={1}>
          {skills.map((skill: PreviewSkill, i: number) => {
            const isSelected = selectedIndices.has(i);
            const isCursor = cursorIndex === i;
            return (
              <Box key={skill.skillPath}>
                <Text color={isCursor ? 'cyan' : undefined}>
                  {isCursor ? '❯ ' : '  '}
                </Text>
                <Text color={isSelected ? 'green' : 'gray'}>
                  {isSelected ? '◉' : '○'}
                </Text>
                <Text> {skill.name}</Text>
                <Text dimColor> - {skill.description}</Text>
              </Box>
            );
          })}
        </Box>
        <Box marginTop={1}>
          <Text dimColor>
            {selectedIndices.size} of {skills.length} selected
          </Text>
        </Box>
      </Box>
    );
  }

  // phase === 'done'
  const { result } = state;
  const installDir =
    result.installed.length > 0
      ? path.dirname(path.dirname(result.installed[0].path))
      : null;
  return (
    <Box flexDirection="column">
      {result.installed.length > 0 && (
        <Box flexDirection="column">
          <Text color="green" bold>
            ✓ Installed {result.installed.length} skill(s) to {installDir}:
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

const RemoveSkillUI: React.FC<RemoveSkillUIProps> = ({
  name,
  targetDir,
  messageBus,
  cwd,
}) => {
  const [state, setState] = useState<RemoveState>({ phase: 'removing' });

  useEffect(() => {
    const run = async () => {
      try {
        const result = await messageBus.request('skills.remove', {
          cwd,
          name,
          targetDir,
        });
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
  }, [name, targetDir, messageBus, cwd]);

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
  --claude         Install to Claude skills directory (.claude/skills/)
  --overwrite      Overwrite existing skill with the same name
  --name <name>    Install with a custom local name
  -i, --interactive  Interactively select which skills to install

List Options:
  --target <dir>   Target directory for skills
  --json           Output as JSON

Remove Options:
  --target <dir>   Target directory for skills

Examples:
  ${p} skill add user/repo                    Add skill from GitHub
  ${p} skill add user/repo/path               Add skill from subpath
  ${p} skill add -g user/repo                 Add skill globally
  ${p} skill add --claude user/repo           Add skill to .claude/skills/
  ${p} skill add --claude -g user/repo        Add skill to ~/.claude/skills/
  ${p} skill add --name my-skill user/repo    Add with custom name
  ${p} skill add -i user/repo                 Add skill interactively
  ${p} skill list                             List all skills
  ${p} skill list --json                      List as JSON
  ${p} skill remove my-skill                  Remove skill from project
  ${p} skill remove -g my-skill               Remove skill from global
    `.trim(),
  );
}

function resolveTargetDir(
  argv: { target?: string; global?: boolean; claude?: boolean },
  paths: Paths,
): string {
  if (argv.target) return path.resolve(argv.target);
  if (argv.claude && argv.global)
    return path.join(path.dirname(paths.globalConfigDir), '.claude', 'skills');
  if (argv.claude)
    return path.join(path.dirname(paths.projectConfigDir), '.claude', 'skills');
  if (argv.global) return path.join(paths.globalConfigDir, 'skills');
  return path.join(paths.projectConfigDir, 'skills');
}

interface SkillArgv {
  _: string[];
  help?: boolean;
  global?: boolean;
  claude?: boolean;
  overwrite?: boolean;
  json?: boolean;
  interactive?: boolean;
  target?: string;
  name?: string;
}

function createMessageBus(context: Context): MessageBus {
  const nodeBridge = new NodeBridge({
    contextCreateOpts: {
      productName: context.productName,
      version: context.version,
      argvConfig: {},
      plugins: context.plugins,
    },
  });

  const [clientTransport, nodeTransport] = DirectTransport.createPair();
  const messageBus = new MessageBus();
  messageBus.setTransport(clientTransport);
  nodeBridge.messageBus.setTransport(nodeTransport);

  return messageBus;
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
      interactive: 'i',
    },
    boolean: ['help', 'global', 'overwrite', 'json', 'claude', 'interactive'],
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

  const messageBus = createMessageBus(context);
  const cwd = context.cwd;

  if (command === 'add') {
    const source = argv._[1] as string | undefined;
    if (!source) {
      console.error('Error: Missing source argument');
      console.error(`Usage: ${productName} skill add <source>`);
      process.exit(1);
    }

    if (argv.interactive) {
      render(
        <InteractiveAddSkillUI
          source={source}
          messageBus={messageBus}
          cwd={cwd}
          options={{
            global: argv.global,
            claude: argv.claude,
            overwrite: argv.overwrite,
            name: argv.name,
            target: argv.target,
          }}
        />,
        { patchConsole: true, exitOnCtrlC: true },
      );
      return;
    }

    render(
      <AddSkillUI
        source={source}
        messageBus={messageBus}
        cwd={cwd}
        options={{
          global: argv.global,
          claude: argv.claude,
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
      const result = await messageBus.request('skills.list', { cwd });
      if (result.success) {
        console.log(JSON.stringify(result.data.skills, null, 2));
      } else {
        console.error('Error: Failed to list skills');
        process.exit(1);
      }
      return;
    }

    render(<SkillListUI messageBus={messageBus} cwd={cwd} />, {
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
        messageBus={messageBus}
        cwd={cwd}
      />,
      { patchConsole: true, exitOnCtrlC: true },
    );
    return;
  }

  console.error(`Error: Unknown command "${command}"`);
  printHelp(productName);
  process.exit(1);
}
