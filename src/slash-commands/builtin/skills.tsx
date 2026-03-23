import { Box, Text, useInput } from 'ink';
import type React from 'react';
import { useEffect, useState } from 'react';
import { SkillSource, type SkillMetadata } from '../../skill';
import { Divider } from '../../ui/Divider';
import { useAppStore } from '../../ui/store';
import { countTokens } from '../../utils/tokenCounter';
import type { LocalJSXCommand } from '../types';

interface SkillInfo {
  name: string;
  source: SkillSource;
  descriptionTokens: number;
  pluginName?: string;
}

function getSourceLabel(source: SkillSource): string {
  switch (source) {
    case SkillSource.ProjectClaude:
      return 'Project skills (.claude/skills)';
    case SkillSource.Project:
      return 'Project skills';
    case SkillSource.GlobalClaude:
      return 'User skills (~/.claude/skills)';
    case SkillSource.Global:
      return 'User skills';
    case SkillSource.Plugin:
      return 'Plugin skills (plugin)';
    case SkillSource.Config:
      return 'Config skills';
    default:
      return 'Other skills';
  }
}

function isClaudeSource(source: SkillSource): boolean {
  return (
    source === SkillSource.ProjectClaude || source === SkillSource.GlobalClaude
  );
}

interface SkillGroups {
  normalGroups: { label: string; items: SkillInfo[] }[];
  claudeItems: { info: SkillInfo; scope: string }[];
  total: number;
}

function buildSkillGroups(skills: SkillMetadata[]): SkillGroups {
  const infos: SkillInfo[] = skills.map((skill) => ({
    name: skill.name,
    source: skill.source,
    descriptionTokens: countTokens(skill.description),
    pluginName: skill.name.includes(':') ? skill.name.split(':')[0] : undefined,
  }));

  const sourceOrder: SkillSource[] = [
    SkillSource.Project,
    SkillSource.Global,
    SkillSource.Config,
    SkillSource.Plugin,
  ];

  const grouped = new Map<SkillSource, SkillInfo[]>();
  for (const info of infos) {
    const list = grouped.get(info.source) || [];
    list.push(info);
    grouped.set(info.source, list);
  }
  for (const [, list] of grouped) {
    list.sort((a, b) => b.descriptionTokens - a.descriptionTokens);
  }

  const normalGroups: { label: string; items: SkillInfo[] }[] = [];
  for (const source of sourceOrder) {
    const list = grouped.get(source);
    if (list && list.length > 0) {
      normalGroups.push({ label: getSourceLabel(source), items: list });
    }
  }

  const claudeItems: { info: SkillInfo; scope: string }[] = [];
  const claudeSources = [SkillSource.ProjectClaude, SkillSource.GlobalClaude];
  for (const source of claudeSources) {
    const list = grouped.get(source);
    if (list) {
      for (const info of list) {
        claudeItems.push({
          info,
          scope: source === SkillSource.GlobalClaude ? 'global' : 'project',
        });
      }
    }
  }
  claudeItems.sort(
    (a, b) => b.info.descriptionTokens - a.info.descriptionTokens,
  );

  return { normalGroups, claudeItems, total: skills.length };
}

const SkillsDisplay: React.FC<{ onDone: (result: string | null) => void }> = ({
  onDone,
}) => {
  const { bridge, cwd } = useAppStore();
  const [data, setData] = useState<SkillGroups | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    bridge
      .request('skills.list', { cwd })
      .then((result: any) => {
        if (!result.success) {
          setError(result.error || 'Failed to load skills');
          return;
        }
        setData(buildSkillGroups(result.data.skills));
      })
      .catch((err: any) => {
        setError(err.message || 'Failed to load skills');
      });
  }, []);

  useInput((input, key) => {
    if (key.escape || (key.ctrl && input === 'c')) {
      onDone(null);
    }
  });

  if (error) {
    return (
      <Box flexDirection="column">
        <Text color="red">{error}</Text>
      </Box>
    );
  }

  if (!data) {
    return (
      <Box flexDirection="column">
        <Text>Loading skills...</Text>
      </Box>
    );
  }

  if (data.total === 0) {
    return (
      <Box flexDirection="column">
        <Divider />
        <Box flexDirection="column" paddingLeft={1} paddingTop={1}>
          <Text>No skills installed.</Text>
          <Text> </Text>
          <Text dimColor italic>
            Esc to close
          </Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Divider />
      <Box flexDirection="column" paddingLeft={1} paddingTop={1}>
        <Text bold color="cyan">
          Skills
        </Text>
        <Text dimColor>{data.total} skills</Text>
        <Text> </Text>

        {data.normalGroups.map((group) => (
          <Box key={group.label} flexDirection="column" marginBottom={1}>
            <Text bold>{group.label}</Text>
            {group.items.map((item) => (
              <Text key={item.name}>
                <Text bold>{item.name}</Text>
                <Text dimColor>
                  {item.pluginName && item.source === SkillSource.Plugin
                    ? ` · ${item.pluginName}`
                    : ''}
                  {` · ~${item.descriptionTokens} description tokens`}
                </Text>
              </Text>
            ))}
          </Box>
        ))}

        {data.claudeItems.length > 0 && (
          <Box flexDirection="column" marginBottom={1}>
            <Text bold color="yellow">
              Claude Code skills (.claude/skills, ~/.claude/skills)
            </Text>
            {data.claudeItems.map(({ info, scope }) => (
              <Text key={info.name}>
                <Text bold>{info.name}</Text>
                <Text
                  dimColor
                >{` · ${scope} · ~${info.descriptionTokens} description tokens`}</Text>
              </Text>
            ))}
          </Box>
        )}

        <Text dimColor italic>
          Esc to close
        </Text>
      </Box>
    </Box>
  );
};

export const skillsCommand: LocalJSXCommand = {
  type: 'local-jsx',
  name: 'skills',
  description: 'Show installed skills with source and token usage',
  async call(onDone) {
    return <SkillsDisplay onDone={onDone} />;
  },
};
