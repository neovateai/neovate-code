import { useEffect, useState } from 'react';
import { listDirectory } from '../utils/list';
import { isProjectDirectory } from '../utils/project';
import { useAppStore } from './store';

// Random selection utility - selects one item from array
function randomSelect<T>(items: T[]): T | undefined {
  if (items.length === 0) return undefined;
  const randomIndex = Math.floor(Math.random() * items.length);
  return items[randomIndex];
}

// File type detection
function getFileType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (!ext) return 'unknown';

  if (
    ['test.ts', 'test.tsx', 'spec.ts', 'spec.tsx'].some((testExt) =>
      filename.endsWith(testExt),
    )
  ) {
    return 'test';
  }

  switch (ext) {
    case 'tsx':
      return 'react';
    case 'ts':
      return 'typescript';
    case 'js':
    case 'jsx':
      return 'javascript';
    case 'json':
      return 'config';
    case 'md':
      return 'documentation';
    case 'css':
    case 'scss':
    case 'less':
      return 'styles';
    default:
      return 'general';
  }
}

// Generate context-aware suggestion templates
function generateSuggestions(exampleFile?: string): string[] {
  const file = exampleFile || '<filepath>';
  const fileType = exampleFile ? getFileType(exampleFile) : 'general';

  // File-type specific suggestions
  const fileTypeSuggestions: Record<string, string[]> = {
    test: [
      `add edge case tests to ${file}`,
      `improve test coverage in ${file}`,
      `add mock setup for ${file}`,
      `create integration tests for ${file}`,
    ],
    react: [
      `add TypeScript props interface to ${file}`,
      `extract custom hook from ${file}`,
      `add error boundary to ${file}`,
      `optimize re-renders in ${file}`,
    ],
    typescript: [
      `add JSDoc comments to functions in ${file}`,
      `improve type safety in ${file}`,
      `extract utility functions from ${file}`,
      `add input validation to ${file}`,
    ],
    config: [
      `validate configuration schema in ${file}`,
      `add environment-specific settings to ${file}`,
      `document configuration options in ${file}`,
    ],
    documentation: [
      `update examples in ${file}`,
      `add troubleshooting section to ${file}`,
      `improve API documentation in ${file}`,
    ],
    general: [
      `analyze and explain ${file}`,
      `refactor and optimize ${file}`,
      `add comprehensive error handling to ${file}`,
    ],
  };

  // General development workflow suggestions
  const workflowSuggestions = [
    'fix lint errors and warnings',
    'fix typecheck errors',
    'run tests and fix any failures',
    'optimize bundle size and performance',
    'update dependencies and test compatibility',
    'review and improve code documentation',
  ];

  // Combine all suggestions
  const allSuggestions = [
    ...(fileTypeSuggestions[fileType] || fileTypeSuggestions.general),
    ...workflowSuggestions,
  ];

  return allSuggestions;
}

export function useTryTips() {
  const { cwd, status, messages } = useAppStore();
  const [currentTip, setCurrentTip] = useState<string | null>(null);

  // Check if we should show try tips (when input is empty and app is idle)
  const shouldShowTips = messages.length === 0 && status === 'idle';

  useEffect(() => {
    if (!shouldShowTips) {
      setCurrentTip(null);
      return;
    }
    if (!isProjectDirectory(cwd)) {
      setCurrentTip(null);
      return;
    }

    const generateTip = async () => {
      try {
        const files = listDirectory(cwd, cwd);

        // Filter out directories and get actual files
        const actualFiles = files.filter((file) => !file.endsWith('/'));

        // Generate suggestions and pick one randomly
        const randomFile = randomSelect(actualFiles);
        const suggestions = generateSuggestions(randomFile);
        const selectedSuggestion = randomSelect(suggestions);

        if (selectedSuggestion) {
          setCurrentTip(`Try "${selectedSuggestion}"`);
        }
      } catch (error) {
        console.error('Error discovering files for try tips:', error);
      }
    };

    generateTip();
  }, [shouldShowTips, cwd]);

  return {
    currentTip: shouldShowTips ? currentTip : null,
  };
}
