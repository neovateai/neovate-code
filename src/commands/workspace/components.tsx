import { Box, Text, useApp, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import React, { useState } from 'react';
import type { Worktree } from '../../worktree';

// Success message after creating a workspace
export function WorkspaceSuccessMessage({
  name,
  path,
  originalBranch,
}: {
  name: string;
  path: string;
  originalBranch: string;
}) {
  const { exit } = useApp();

  React.useEffect(() => {
    const timer = setTimeout(() => exit(), 100);
    return () => clearTimeout(timer);
  }, [exit]);

  return (
    <Box flexDirection="column" paddingY={1}>
      <Box>
        <Text bold color="green">
          ✓ Workspace created successfully!
        </Text>
      </Box>
      <Box marginTop={1} flexDirection="column">
        <Box>
          <Text dimColor>Name: </Text>
          <Text bold>{name}</Text>
        </Box>
        <Box>
          <Text dimColor>Path: </Text>
          <Text>{path}</Text>
        </Box>
        <Box>
          <Text dimColor>Original branch: </Text>
          <Text>{originalBranch}</Text>
        </Box>
      </Box>
      <Box marginTop={1} flexDirection="column">
        <Text bold>Next steps:</Text>
        <Text dimColor> cd {path}</Text>
        <Text dimColor> # Make your changes...</Text>
        <Text dimColor> neo workspace complete</Text>
      </Box>
    </Box>
  );
}

// List of workspaces
export function WorkspaceList({
  worktrees,
  verbose,
}: {
  worktrees: (Worktree & { createdAt?: string })[];
  verbose?: boolean;
}) {
  const { exit } = useApp();

  React.useEffect(() => {
    const timer = setTimeout(() => exit(), 100);
    return () => clearTimeout(timer);
  }, [exit]);

  return (
    <Box flexDirection="column" paddingY={1}>
      <Box>
        <Text bold>Active Workspaces:</Text>
      </Box>
      <Box marginTop={1} flexDirection="column">
        {worktrees.map((wt) => (
          <Box key={wt.name} flexDirection="column" marginBottom={1}>
            <Box>
              <Text bold color="cyan">
                {wt.name}
              </Text>
              <Text dimColor> ({wt.isClean ? 'clean' : 'has changes'})</Text>
            </Box>
            <Box paddingLeft={2} flexDirection="column">
              <Box>
                <Text dimColor>Branch: </Text>
                <Text>{wt.branch}</Text>
              </Box>
              <Box>
                <Text dimColor>Original: </Text>
                <Text>{wt.originalBranch}</Text>
              </Box>
              <Box>
                <Text dimColor>Path: </Text>
                <Text>{wt.path}</Text>
              </Box>
              {verbose && wt.createdAt && (
                <Box>
                  <Text dimColor>Created: </Text>
                  <Text>{new Date(wt.createdAt).toLocaleString()}</Text>
                </Box>
              )}
            </Box>
          </Box>
        ))}
      </Box>
      <Box marginTop={1}>
        <Text dimColor>
          Complete a workspace: cd into it and run 'neo workspace complete'
        </Text>
      </Box>
    </Box>
  );
}

// Confirmation prompt
export function ConfirmPrompt({
  message,
  onConfirm,
  onCancel,
}: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [confirmed, setConfirmed] = useState<boolean | null>(null);

  useInput((input, key) => {
    if (confirmed !== null) return;

    if (input === 'y' || input === 'Y') {
      setConfirmed(true);
      onConfirm();
    } else if (input === 'n' || input === 'N' || key.escape) {
      setConfirmed(false);
      onCancel();
    }
  });

  return (
    <Box flexDirection="column">
      <Box>
        <Text>{message} </Text>
        <Text dimColor>(y/N)</Text>
      </Box>
      {confirmed === true && (
        <Box marginTop={1}>
          <Text color="green">Confirmed</Text>
        </Box>
      )}
      {confirmed === false && (
        <Box marginTop={1}>
          <Text color="yellow">Cancelled</Text>
        </Box>
      )}
    </Box>
  );
}

// Workspace selector
export function WorkspaceSelector({
  worktrees,
  onSelect,
  onCancel,
}: {
  worktrees: Worktree[];
  onSelect: (worktree: Worktree) => void;
  onCancel: () => void;
}) {
  const items = [
    ...worktrees.map((wt) => ({
      label: `${wt.name} (${wt.branch})${!wt.isClean ? ' - has changes' : ''}`,
      value: wt.name,
    })),
    {
      label: 'Cancel',
      value: '__cancel__',
    },
  ];

  const handleSelect = (item: { value: string }) => {
    if (item.value === '__cancel__') {
      onCancel();
    } else {
      const worktree = worktrees.find((wt) => wt.name === item.value);
      if (worktree) {
        onSelect(worktree);
      }
    }
  };

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold>Select a workspace to complete:</Text>
      </Box>
      <SelectInput items={items} onSelect={handleSelect} />
    </Box>
  );
}

// Completion choice menu
export function CompletionChoice({
  originalBranch,
  worktreeName,
  onMerge,
  onPR,
  onCancel,
}: {
  originalBranch: string;
  worktreeName: string;
  onMerge: () => void;
  onPR: () => void;
  onCancel: () => void;
}) {
  const items = [
    {
      label: `Merge to original branch (${originalBranch})`,
      value: 'merge',
    },
    {
      label: 'Create PR to remote',
      value: 'pr',
    },
    {
      label: 'Cancel',
      value: 'cancel',
    },
  ];

  const handleSelect = (item: { value: string }) => {
    switch (item.value) {
      case 'merge':
        onMerge();
        break;
      case 'pr':
        onPR();
        break;
      case 'cancel':
        onCancel();
        break;
    }
  };

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold>Complete workspace '{worktreeName}':</Text>
      </Box>
      <SelectInput items={items} onSelect={handleSelect} />
    </Box>
  );
}
