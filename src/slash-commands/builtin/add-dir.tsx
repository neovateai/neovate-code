/** biome-ignore lint/correctness/useExhaustiveDependencies: Complex hook dependencies are intentionally managed with useCallback to prevent infinite loops */
import { Box, Text, useInput } from 'ink';
import Spinner from 'ink-spinner';
import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppStore } from '../../ui/store';
import {
  formatValidationMessage,
  validateDirectoryPath,
} from '../../utils/path';
import type { LocalJSXCommand } from '../types';

interface DirectoryManagerProps {
  onExit: (result: string | null) => void;
  initialPath?: string;
}

type ViewMode = 'list' | 'input' | 'confirm-remove';

function useDirectoryManager(cwd: string, sessionId: string | null) {
  const { bridge } = useAppStore();
  const [directories, setDirectories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDirectories = useCallback(async () => {
    if (!sessionId) {
      setError('No active session');
      setLoading(false);
      return;
    }

    try {
      const result = await bridge.request(
        'session.config.getAdditionalDirectories',
        { cwd, sessionId },
      );
      if (result.success) {
        setDirectories(result.data.directories);
        setError(null);
      } else {
        setError('Failed to load directory list');
      }
    } catch (e) {
      setError(`Load failed: ${String(e)}`);
    } finally {
      setLoading(false);
    }
  }, [bridge, cwd, sessionId]);

  const addDirectory = useCallback(
    async (directory: string): Promise<string> => {
      if (!sessionId) {
        return 'No active session';
      }

      // Validate path
      const existingDirs = [cwd, ...directories];
      const validationResult = validateDirectoryPath(directory, existingDirs);

      if (validationResult.resultType !== 'success') {
        return formatValidationMessage(validationResult);
      }

      // Add to configuration
      try {
        const result = await bridge.request('session.config.addDirectory', {
          cwd,
          sessionId,
          directory: validationResult.absolutePath,
        });

        if (result.success) {
          await loadDirectories();
          return formatValidationMessage(validationResult);
        } else {
          return 'Failed to add directory';
        }
      } catch (e) {
        return `Add failed: ${String(e)}`;
      }
    },
    [bridge, cwd, sessionId, directories, loadDirectories],
  );

  const removeDirectory = useCallback(
    async (directory: string): Promise<string> => {
      if (!sessionId) {
        return 'No active session';
      }

      try {
        const result = await bridge.request('session.config.removeDirectory', {
          cwd,
          sessionId,
          directory,
        });

        if (result.success) {
          await loadDirectories();
          return `Removed ${directory}`;
        } else {
          return 'Failed to remove directory';
        }
      } catch (e) {
        return `Remove failed: ${String(e)}`;
      }
    },
    [bridge, cwd, sessionId, loadDirectories],
  );

  return {
    directories,
    loading,
    error,
    loadDirectories,
    addDirectory,
    removeDirectory,
  };
}

const DirectoryManagerComponent: React.FC<DirectoryManagerProps> = ({
  onExit,
  initialPath,
}) => {
  const { cwd, sessionId, productName } = useAppStore();
  const {
    directories,
    loading,
    error,
    loadDirectories,
    addDirectory,
    removeDirectory,
  } = useDirectoryManager(cwd, sessionId);

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedIndex, setSelectedIndex] = useState(1); // 0 = cwd, 1 = Add directory...
  const [inputValue, setInputValue] = useState(initialPath || '');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [processingAction, setProcessingAction] = useState(false);
  const [confirmSelection, setConfirmSelection] = useState(0); // 0 = Yes, 1 = No
  const [directoryToRemove, setDirectoryToRemove] = useState<string | null>(
    null,
  );

  // Use ref to track if auto-add has been executed
  const autoAddExecuted = useRef(false);

  // Initial load
  useEffect(() => {
    loadDirectories();
  }, [loadDirectories]);

  // Auto-add if initial path provided
  useEffect(() => {
    if (initialPath && !loading && !autoAddExecuted.current) {
      autoAddExecuted.current = true;
      setProcessingAction(true);
      addDirectory(initialPath).then((message) => {
        onExit(message);
      });
    }
  }, [initialPath, loading, addDirectory, onExit]);

  useInput((input, key) => {
    if (processingAction) return;

    // Global shortcuts
    if (key.escape) {
      if (viewMode === 'input') {
        setViewMode('list');
        setInputValue('');
        setErrorMessage(null);
      } else if (viewMode === 'confirm-remove') {
        setViewMode('list');
        setDirectoryToRemove(null);
        setConfirmSelection(0);
      } else {
        onExit(null);
      }
      return;
    }

    // Confirm remove mode
    if (viewMode === 'confirm-remove') {
      if (key.upArrow || key.downArrow) {
        setConfirmSelection(confirmSelection === 0 ? 1 : 0);
      } else if (key.return) {
        if (confirmSelection === 0 && directoryToRemove) {
          // Yes - remove directory
          setProcessingAction(true);
          removeDirectory(directoryToRemove).then(() => {
            setProcessingAction(false);
            setViewMode('list');
            setDirectoryToRemove(null);
            setConfirmSelection(0);
            if (selectedIndex > directories.length) {
              setSelectedIndex(Math.max(1, directories.length));
            }
          });
        } else {
          // No - cancel
          setViewMode('list');
          setDirectoryToRemove(null);
          setConfirmSelection(0);
        }
      }
      return;
    }

    // List mode
    if (viewMode === 'list') {
      const totalItems = 1 + directories.length + 1; // cwd + directories + "Add directory..."

      if (key.upArrow) {
        setSelectedIndex(Math.max(0, selectedIndex - 1));
      } else if (key.downArrow) {
        setSelectedIndex(Math.min(totalItems - 1, selectedIndex + 1));
      } else if (key.return) {
        if (selectedIndex === 0) {
          // Selected working directory - do nothing
          return;
        } else if (selectedIndex === directories.length + 1) {
          // Selected "Add directory..."
          setViewMode('input');
          setInputValue('');
          setErrorMessage(null);
        } else {
          // Selected an additional directory - show confirmation dialog
          const dirToRemove = directories[selectedIndex - 1];
          setDirectoryToRemove(dirToRemove);
          setConfirmSelection(0);
          setViewMode('confirm-remove');
        }
      }
      return;
    }

    // Input mode
    if (viewMode === 'input') {
      if (key.return && inputValue.trim()) {
        setProcessingAction(true);
        setErrorMessage(null);
        addDirectory(inputValue.trim()).then((message) => {
          setProcessingAction(false);
          if (message.includes('Success')) {
            // Find the index of the newly added directory
            const newDirIndex = directories.length + 1; // Will be at this position after reload
            setSelectedIndex(newDirIndex);
            setViewMode('list');
            setInputValue('');
          } else {
            // On error, stay in input mode and show error
            setErrorMessage(message);
          }
        });
      } else if (key.backspace || key.delete) {
        setInputValue(inputValue.slice(0, -1));
      } else if (input && !key.ctrl && !key.meta) {
        setInputValue(inputValue + input);
      }
    }
  });

  // Loading state
  if (loading && !initialPath) {
    return (
      <Box flexDirection="column">
        <Text>
          <Spinner type="dots" />
          <Text> Loading...</Text>
        </Text>
      </Box>
    );
  }

  // Error state
  if (error && !initialPath) {
    return (
      <Box flexDirection="column">
        <Text color="red">Error: {error}</Text>
        <Text></Text>
        <Text color="gray">Press Esc to exit</Text>
      </Box>
    );
  }

  // Processing initial path
  if (initialPath) {
    return (
      <Box flexDirection="column">
        <Text>
          <Spinner type="dots" />
          <Text> Adding directory...</Text>
        </Text>
      </Box>
    );
  }

  // Confirm remove mode - show confirmation dialog
  if (viewMode === 'confirm-remove' && directoryToRemove) {
    return (
      <Box flexDirection="column">
        <Box
          borderStyle="round"
          borderColor="red"
          flexDirection="column"
          paddingX={1}
          width={80}
        >
          <Text bold color="red">
            Remove directory from workspace?
          </Text>
          <Text></Text>
          <Text>{directoryToRemove}</Text>
          <Text></Text>
          <Text>
            {productName.toLowerCase()} will no longer have access to files in
            this directory.
          </Text>
          <Text></Text>
          <Box flexDirection="column">
            <Text color={confirmSelection === 0 ? 'white' : 'gray'}>
              {confirmSelection === 0 ? '❯ ' : '  '}1. Yes
            </Text>
            <Text color={confirmSelection === 1 ? 'white' : 'gray'}>
              {confirmSelection === 1 ? '❯ ' : '  '}2. No
            </Text>
          </Box>
        </Box>

        <Text></Text>

        {/* Processing indicator */}
        {processingAction && (
          <>
            <Text color="gray">
              <Spinner type="dots" />
              <Text> Processing...</Text>
            </Text>
            <Text></Text>
          </>
        )}

        {/* Help text */}
        <Text color="gray">
          ↑/↓ to select • Enter to confirm • Esc to cancel
        </Text>
      </Box>
    );
  }

  // List mode - show directories with "Add directory..." option
  if (viewMode === 'list') {
    return (
      <Box flexDirection="column">
        {/* Working directory */}
        <Box>
          <Text color={selectedIndex === 0 ? 'white' : 'gray'}>
            {selectedIndex === 0 ? '› ' : '  '}─ {cwd}
          </Text>
          <Text color="gray"> (Original working directory)</Text>
        </Box>

        {/* Additional directories */}
        {directories.map((dir, index) => {
          const itemIndex = index + 1;
          const isSelected = selectedIndex === itemIndex;
          return (
            <Text key={dir} color={isSelected ? 'white' : 'gray'}>
              {isSelected ? '› ' : '  '}
              {itemIndex}. {dir}
            </Text>
          );
        })}

        {/* Add directory option */}
        <Text
          color={selectedIndex === directories.length + 1 ? 'cyan' : 'gray'}
        >
          {selectedIndex === directories.length + 1 ? '› ' : '  '}
          {directories.length + 1}. Add directory…
        </Text>

        <Text></Text>

        {/* Processing indicator */}
        {processingAction && (
          <>
            <Text color="gray">
              <Spinner type="dots" />
              <Text> Processing...</Text>
            </Text>
            <Text></Text>
          </>
        )}

        {/* Help text */}
        <Text color="gray">Enter to confirm • Esc to cancel</Text>
      </Box>
    );
  }

  // Input mode - show input box
  return (
    <Box flexDirection="column">
      <Box
        borderStyle="round"
        borderColor="gray"
        flexDirection="column"
        paddingX={1}
        paddingY={1}
        width={80}
      >
        <Text bold>Add directory to workspace</Text>
        <Text></Text>

        <Text color="gray">
          {productName.toLowerCase()} will be able to read files in this
          directory.
        </Text>
        <Text></Text>

        <Text>Enter the path to the directory:</Text>
        <Text></Text>

        <Box borderStyle="round" paddingX={1} borderColor="white">
          <Text color={inputValue ? 'white' : 'gray'}>
            {inputValue || 'Directory path…'}
          </Text>
        </Box>
      </Box>

      <Text></Text>

      {/* Error message */}
      {errorMessage && (
        <>
          <Text color="red">{errorMessage}</Text>
          <Text></Text>
        </>
      )}

      {/* Processing indicator */}
      {processingAction && (
        <>
          <Text color="gray">
            <Spinner type="dots" />
            <Text> Processing...</Text>
          </Text>
          <Text></Text>
        </>
      )}

      {/* Help text */}
      <Text color="gray">Enter to add • Esc to cancel</Text>
    </Box>
  );
};

export function createAddDirCommand(): LocalJSXCommand {
  return {
    type: 'local-jsx',
    name: 'add-dir',
    description: 'Add or manage additional working directories',
    async call(onDone, _context, args) {
      const initialPath = args || undefined;
      return (
        <DirectoryManagerComponent onExit={onDone} initialPath={initialPath} />
      );
    },
  };
}
