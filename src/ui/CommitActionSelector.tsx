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
  key: string;
  disabled?: boolean;
  disabledReason?: string;
}

const BASE_ACTIONS: ActionItem[] = [
  { value: 'copy', label: 'Copy to clipboard', key: '1' },
  { value: 'commit', label: 'Commit changes', key: '2' },
  { value: 'push', label: 'Commit and push', key: '3' },
  { value: 'checkout', label: 'Create branch and commit', key: '4' },
  { value: 'checkoutPush', label: 'Create branch, commit and push', key: '5' },
];

const PR_ACTION: ActionItem = {
  value: 'checkoutPushPR',
  label: 'Create branch, push and PR',
  key: '6',
};

const TAIL_ACTIONS: ActionItem[] = [
  { value: 'edit', label: 'Edit message', key: '7' },
  { value: 'editBranch', label: 'Edit branch name', key: '8' },
  { value: 'cancel', label: 'Cancel', key: 'q' },
];

export interface CommitActionSelectorProps {
  onSelect: (action: CommitAction) => void;
  onCancel: () => void;
  disabled?: boolean;
  defaultAction?: CommitAction;
  hasGhCli?: boolean;
  isGitHubRemote?: boolean;
  hasRemote?: boolean;
}

export const CommitActionSelector: React.FC<CommitActionSelectorProps> = ({
  onSelect,
  onCancel,
  disabled = false,
  defaultAction = 'push',
  hasGhCli = false,
  isGitHubRemote = false,
  hasRemote = true,
}) => {
  const actions = useMemo(() => {
    const showPRAction = hasGhCli && isGitHubRemote;
    const remoteRequiredActions = ['push', 'checkoutPush', 'checkoutPushPR'];
    const noRemoteReason = 'no remote';

    const baseActionsWithRemoteCheck = BASE_ACTIONS.map((action) => {
      if (!hasRemote && remoteRequiredActions.includes(action.value)) {
        return { ...action, disabled: true, disabledReason: noRemoteReason };
      }
      return action;
    });

    let allActions = baseActionsWithRemoteCheck;
    if (showPRAction) {
      const prActionWithCheck = !hasRemote
        ? { ...PR_ACTION, disabled: true, disabledReason: noRemoteReason }
        : PR_ACTION;
      allActions = [...allActions, prActionWithCheck];
    }

    // Re-number keys based on final position
    const numbered = allActions.map((a, i) => ({ ...a, key: String(i + 1) }));
    return [...numbered, ...TAIL_ACTIONS];
  }, [hasGhCli, isGitHubRemote, hasRemote]);

  const defaultIndex = actions.findIndex(
    (a) => a.value === defaultAction && !a.disabled,
  );
  const [selectedIndex, setSelectedIndex] = useState(
    defaultIndex >= 0
      ? defaultIndex
      : actions.findIndex((a) => !a.disabled) || 0,
  );

  useInput(
    (input, key) => {
      if (disabled) return;

      if (key.escape || input === 'q') {
        onCancel();
        return;
      }

      if (key.return) {
        const selectedAction = actions[selectedIndex];
        if (!selectedAction.disabled) {
          onSelect(selectedAction.value);
        }
        return;
      }

      if (key.upArrow) {
        setSelectedIndex((prev) => {
          let newIndex = prev - 1;
          if (newIndex < 0) newIndex = actions.length - 1;
          while (actions[newIndex]?.disabled && newIndex !== prev) {
            newIndex--;
            if (newIndex < 0) newIndex = actions.length - 1;
          }
          return newIndex;
        });
        return;
      }

      if (key.downArrow) {
        setSelectedIndex((prev) => {
          let newIndex = prev + 1;
          if (newIndex >= actions.length) newIndex = 0;
          while (actions[newIndex]?.disabled && newIndex !== prev) {
            newIndex++;
            if (newIndex >= actions.length) newIndex = 0;
          }
          return newIndex;
        });
        return;
      }

      // Quick select by key
      const action = actions.find((a) => a.key === input);
      if (action && !action.disabled) {
        onSelect(action.value);
      }
    },
    { isActive: !disabled },
  );

  return (
    <Box flexDirection="column">
      <Text>Actions:</Text>
      <Box flexDirection="column">
        {actions.map((action, index) => {
          const isSelected = index === selectedIndex;
          const isDisabled = action.disabled || disabled;
          const prefix = isSelected ? '>' : ' ';
          const keyLabel = `[${action.key}]`;

          return (
            <Box key={action.value}>
              <Text
                color={isSelected ? 'cyan' : isDisabled ? 'gray' : undefined}
                dimColor={isDisabled}
              >
                {prefix} {keyLabel} {action.label.padEnd(28)}
                {isDisabled && action.disabledReason && (
                  <Text dimColor>({action.disabledReason})</Text>
                )}
              </Text>
            </Box>
          );
        })}
      </Box>
      <Text> </Text>
      <Text dimColor>↑↓ select enter confirm q cancel</Text>
    </Box>
  );
};

export default CommitActionSelector;
