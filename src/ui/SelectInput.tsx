import { Box, Text, useInput } from 'ink';
import React, { useCallback, useState } from 'react';
import { symbols } from '../utils/symbols';
import TextInput from './TextInput';
import { UI_COLORS } from './constants';

export type SelectOption = {
  type: 'text' | 'input';
  value: string;
  label: string;
  description?: string;
  placeholder?: string;
  initialValue?: string;
  onChange?: (value: string) => void;
};

interface SelectInputProps {
  options: SelectOption[];
  mode: 'single' | 'multi';
  defaultValue?: string | string[];
  onChange: (value: string | string[]) => void;
  onFocus?: (value: string) => void;
  onCancel?: () => void;
  onSubmit?: () => void;
  submitButtonText?: string;
}

export function SelectInput({
  options,
  mode,
  defaultValue,
  onChange,
  onFocus,
  onCancel,
  onSubmit,
  submitButtonText = 'Submit',
}: SelectInputProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedValues, setSelectedValues] = useState<string[]>(
    mode === 'multi' && Array.isArray(defaultValue) ? defaultValue : [],
  );
  const [singleSelectedValue, setSingleSelectedValue] = useState<string | null>(
    mode === 'single' && typeof defaultValue === 'string' ? defaultValue : null,
  );
  const [focusedInputValue, setFocusedInputValue] = useState('');

  // Check if current option is an input type and focused
  const currentOption = options[selectedIndex];
  const isInputFocused = currentOption?.type === 'input';

  // Handle single selection mode
  const handleSingleSelect = useCallback(
    (index: number) => {
      const option = options[index];
      if (option.type === 'text') {
        setSingleSelectedValue(option.value);
        onChange(option.value);
      } else if (option.type === 'input') {
        // For input type: use text input value, skip if empty
        const inputValue =
          focusedInputValue || option.initialValue || option.value;
        // Only trigger when there's actual input content
        if (focusedInputValue || option.initialValue) {
          setSingleSelectedValue(inputValue);
          onChange(inputValue);
        }
      }
    },
    [options, onChange, focusedInputValue],
  );

  // Handle multi-selection toggle
  const handleMultiToggle = useCallback(
    (index: number) => {
      const option = options[index];
      if (option.type === 'text') {
        const newValues = selectedValues.includes(option.value)
          ? selectedValues.filter((v) => v !== option.value)
          : [...selectedValues, option.value];
        setSelectedValues(newValues);
        onChange(newValues);
      }
    },
    [options, selectedValues, onChange],
  );

  // Keyboard event handling
  useInput(
    (input, key) => {
      // Navigation - always allow up/down arrow keys to switch options
      if (key.upArrow) {
        const newIndex = Math.max(0, selectedIndex - 1);
        setSelectedIndex(newIndex);
        onFocus?.(options[newIndex].value);
        return;
      } else if (key.downArrow) {
        const newIndex = Math.min(options.length - 1, selectedIndex + 1);
        setSelectedIndex(newIndex);
        onFocus?.(options[newIndex].value);
        return;
      }

      // Cancel
      if (key.escape && onCancel) {
        onCancel();
        return;
      }

      // If in input field, don't handle other keys (let ink-text-input handle them)
      if (isInputFocused) {
        return;
      }

      // Single selection mode: Enter to confirm
      if (mode === 'single' && key.return) {
        handleSingleSelect(selectedIndex);
      }

      // Multi-selection mode: Space to toggle, Enter to submit
      if (mode === 'multi') {
        if (input === ' ') {
          handleMultiToggle(selectedIndex);
        } else if (key.return && onSubmit) {
          onSubmit();
        }
      }
    },
    { isActive: true },
  );

  return (
    <Box flexDirection="column">
      {options.map((option, index) => {
        const isSelected = index === selectedIndex;
        const isChecked =
          mode === 'multi' && selectedValues.includes(option.value);

        // Determine if this option should be highlighted in green
        // For multi mode: checked items are green
        // For single mode: the selected value is green
        const isAnswered =
          mode === 'multi' ? isChecked : singleSelectedValue === option.value;

        // For input type options, show as regular option until selected
        const displayLabel =
          option.type === 'input'
            ? option.placeholder || 'Type something.'
            : option.label;

        return (
          <Box key={option.value} flexDirection="column">
            {/* Main option line */}
            {option.type === 'input' && isSelected ? (
              // When input option is selected, show the text input inline
              <Box>
                <Text color={isSelected ? UI_COLORS.ASK_PRIMARY : undefined}>
                  {isSelected ? '> ' : '  '}
                </Text>
                <Text
                  dimColor
                  color={isAnswered ? UI_COLORS.ASK_SUCCESS : undefined}
                >
                  {`${index + 1}. `}
                </Text>
                {mode === 'multi' && (
                  <Text
                    color={
                      isAnswered
                        ? UI_COLORS.ASK_SUCCESS
                        : isSelected
                          ? UI_COLORS.ASK_PRIMARY
                          : undefined
                    }
                  >
                    {isChecked ? `[${symbols.tick}] ` : '[ ] '}
                  </Text>
                )}
                <TextInput
                  value={focusedInputValue || option.initialValue || ''}
                  placeholder={option.placeholder}
                  onChange={(value) => {
                    setFocusedInputValue(value);
                    option.onChange?.(value);
                    onFocus?.(option.value);
                  }}
                  onSubmit={() => {
                    if (mode === 'single') {
                      handleSingleSelect(selectedIndex);
                    }
                  }}
                />
              </Box>
            ) : (
              // Regular option display (including unselected input type)
              <Box>
                <Text color={isSelected ? UI_COLORS.ASK_PRIMARY : undefined}>
                  {isSelected ? '> ' : '  '}
                </Text>
                <Text
                  dimColor
                  color={isAnswered ? UI_COLORS.ASK_SUCCESS : undefined}
                >
                  {`${index + 1}. `}
                </Text>
                {mode === 'multi' && (
                  <Text
                    color={
                      isAnswered
                        ? UI_COLORS.ASK_SUCCESS
                        : isSelected
                          ? UI_COLORS.ASK_PRIMARY
                          : undefined
                    }
                  >
                    {isChecked ? `[${symbols.tick}] ` : '[ ] '}
                  </Text>
                )}
                <Text
                  dimColor={option.type === 'input'}
                  color={
                    isAnswered
                      ? UI_COLORS.ASK_SUCCESS
                      : option.type === 'input'
                        ? undefined
                        : isSelected
                          ? UI_COLORS.ASK_PRIMARY
                          : undefined
                  }
                >
                  {displayLabel}
                </Text>
                {mode === 'single' && isAnswered && (
                  <Text
                    color={UI_COLORS.ASK_SUCCESS}
                  >{` ${symbols.tick}`}</Text>
                )}
              </Box>
            )}

            {/* Description - only for non-input types */}
            {option.description && option.type !== 'input' && (
              <Box marginLeft={mode === 'multi' ? 4 : 5}>
                <Text
                  dimColor
                  color={isAnswered ? UI_COLORS.ASK_SUCCESS : undefined}
                >
                  {option.description}
                </Text>
              </Box>
            )}
          </Box>
        );
      })}
    </Box>
  );
}
