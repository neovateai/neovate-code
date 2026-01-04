import { Box, Text, useInput } from 'ink';
import type React from 'react';
import { useMemo, useState } from 'react';

export type CommitAction =
  | 'copy'
  | 'commit'
  | 'push'
  | 'checkout'
  | 'checkoutPush'
  | 'checkoutPushPR'
  | 'edit'
  | 'editBranch'
  | 'cancel';

interface ActionItem {
  value: CommitAction;
  label: string;
  icon: string;
}

const BASE_ACTIONS: ActionItem[] = [
  { value: 'copy', label: 'Copy to clipboard', icon: '📋' },
  { value: 'commit', label: 'Commit changes', icon: '✅' },
  { value: 'push', label: 'Commit and push', icon: '🚀' },
  { value: 'checkout', label: 'Create branch and commit', icon: '🌿' },
  {
    value: 'checkoutPush',
    label: 'Create branch and commit and push',
    icon: '🌿',
  },
];

const PR_ACTION: ActionItem = {
  value: 'checkoutPushPR',
  label: 'Create branch, commit, push and create PR',
  icon: '🔀',
};

const TAIL_ACTIONS: ActionItem[] = [
  { value: 'edit', label: 'Edit commit message', icon: '✏️' },
  { value: 'editBranch', label: 'Edit branch name', icon: '🌿' },
  { value: 'cancel', label: 'Cancel', icon: '❌' },
];

export interface CommitActionSelectorProps {
  onSelect: (action: CommitAction) => void;
  onCancel: () => void;
  disabled?: boolean;
  defaultAction?: CommitAction;
  hasGhCli?: boolean;
  isGitHubRemote?: boolean;
}

export const CommitActionSelector: React.FC<CommitActionSelectorProps> = ({
  onSelect,
  onCancel,
  disabled = false,
  defaultAction = 'push', // Default to "Commit and push"
  hasGhCli = false,
  isGitHubRemote = false,
}) => {
  // Build actions list dynamically based on GitHub detection
  const actions = useMemo(() => {
    const showPRAction = hasGhCli && isGitHubRemote;
    if (showPRAction) {
      return [...BASE_ACTIONS, PR_ACTION, ...TAIL_ACTIONS];
    }
    return [...BASE_ACTIONS, ...TAIL_ACTIONS];
  }, [hasGhCli, isGitHubRemote]);

  const defaultIndex = actions.findIndex((a) => a.value === defaultAction);
  const [selectedIndex, setSelectedIndex] = useState(
    defaultIndex >= 0 ? defaultIndex : 2,
  );

  useInput(
    (input, key) => {
      if (disabled) return;

      if (key.escape) {
        onCancel();
        return;
      }

      if (key.return) {
        onSelect(actions[selectedIndex].value);
        return;
      }

      if (key.upArrow) {
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : actions.length - 1));
        return;
      }

      if (key.downArrow) {
        setSelectedIndex((prev) => (prev < actions.length - 1 ? prev + 1 : 0));
        return;
      }

      // Quick select by number (1-9)
      const num = Number.parseInt(input, 10);
      if (num >= 1 && num <= actions.length) {
        onSelect(actions[num - 1].value);
      }
    },
    { isActive: !disabled },
  );

  return (
    <Box flexDirection="column">
      <Text bold>What would you like to do?</Text>
      <Box flexDirection="column" marginTop={1}>
        {actions.map((action, index) => {
          const isSelected = index === selectedIndex;
          return (
            <Box key={action.value}>
              <Text
                color={isSelected ? 'cyan' : undefined}
                inverse={isSelected}
                dimColor={disabled}
              >
                {isSelected ? '● ' : '○ '}
                {action.icon} {action.label}
              </Text>
            </Box>
          );
        })}
      </Box>
      <Box marginTop={1}>
        <Text color="gray" dimColor>
          ↑↓ Navigate Enter Select Esc Cancel
        </Text>
      </Box>
    </Box>
  );
};

export default CommitActionSelector;
