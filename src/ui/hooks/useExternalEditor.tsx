import { execFileSync } from 'node:child_process';
import path from 'path';
import { useEffect, useMemo, useState } from 'react';
import { useAppContext } from '../AppContext';
import { openInExternalEditor } from '../utils/external-editor';
import {
  type EditParams,
  type WriteParams,
  getDiffParams,
} from '../utils/get-diff-params';

type EditorType =
  | 'cursor'
  | 'surf'
  | 'code'
  | 'codium'
  | 'wstorm'
  | 'trae'
  | 'no_support';

const VSCODE_EDITORS = {
  CURSOR: 'Cursor',
  SURF: 'Windsurf',
  TRAE: 'Trae',
  CODIUM: 'VSCodium',
} as const;

const NO_SUPPORT = 'no_support' as const;

/**
 * Hook to detect and get external editor information
 */
export function useExternalEditor() {
  const [externalEditor, setExternalEditor] = useState<EditorType>(NO_SUPPORT);
  const { state, dispatch, services } = useAppContext();

  const isSupportExternalEditor = useMemo(() => {
    return externalEditor !== NO_SUPPORT;
  }, [externalEditor]);

  useEffect(() => {
    const editor = getExternalEditor();
    setExternalEditor(editor);
  }, []);

  const openWithExternalEditor = async (
    toolName: string,
    params: EditParams | WriteParams,
  ) => {
    if (toolName !== 'edit' && toolName !== 'write') {
      throw new Error('External editor is only supported for edit tool');
    }

    try {
      // Set modifying state
      dispatch({
        type: 'SET_APPROVAL_PENDING',
        payload: {
          pending: true,
          callId: state.approval.callId,
          toolName,
          params,
          resolve: state.approval.resolve,
          isModifying: true,
        },
      });

      // Get current content and open in external editor
      // Use new_string if it exists (from previous modifications), otherwise old_string
      const { originalContent, newContent } = getDiffParams(
        toolName,
        params,
        services.context.cwd,
      );

      const fileName = params.file_path
        ? path.basename(params.file_path)
        : undefined;
      const fileExtension = fileName
        ? path.extname(fileName) || '.txt'
        : '.txt';

      const modifiedContent = await openInExternalEditor({
        content: newContent,
        fileName,
        fileExtension,
        originalContent,
        showDiff: true,
        editorCommand: externalEditor,
      });

      // Update params with modified content
      const updatedParams = {
        ...params,
        new_string: modifiedContent,
      };

      // Reset modifying state and update params
      dispatch({
        type: 'SET_APPROVAL_PENDING',
        payload: {
          pending: true,
          callId: state.approval.callId,
          toolName,
          params: updatedParams,
          resolve: state.approval.resolve,
          isModifying: false,
        },
      });

      return true;
    } catch (error) {
      // Reset modifying state on error
      dispatch({
        type: 'SET_APPROVAL_PENDING',
        payload: {
          pending: true,
          callId: state.approval.callId,
          toolName,
          params,
          resolve: state.approval.resolve,
          isModifying: false,
        },
      });

      console.error('External editor error:', error);
      throw error;
    }
  };

  return { externalEditor, isSupportExternalEditor, openWithExternalEditor };
}

/**
 * Get the current terminal/IDE environment
 */
function getTerminal(): EditorType {
  const terminal = process.env.TERM_PROGRAM;
  const gitAskpassMain = process.env.VSCODE_GIT_ASKPASS_MAIN || '';
  const bundleId = process.env.__CFBundleIdentifier?.toLowerCase() || '';

  // VSCode and its variants
  if (terminal === 'vscode') {
    if (gitAskpassMain.includes(VSCODE_EDITORS.CURSOR)) return 'cursor';
    if (gitAskpassMain.includes(VSCODE_EDITORS.SURF)) return 'surf';
    if (gitAskpassMain.includes(VSCODE_EDITORS.TRAE)) return 'trae';
    if (gitAskpassMain.includes(VSCODE_EDITORS.CODIUM)) return 'codium';
    return 'code';
  }

  // JetBrains IDEs
  if (bundleId.includes('webstorm') || terminal === 'JetBrains-JediTerm') {
    return 'wstorm';
  }

  return NO_SUPPORT;
}

/**
 * Get the available external editor
 */
function getExternalEditor(): EditorType {
  const terminal = getTerminal();

  if (terminal === NO_SUPPORT) {
    return NO_SUPPORT;
  }

  return isEditorAvailable(terminal) ? terminal : NO_SUPPORT;
}

/**
 * Check if the editor command is available in the system
 */
function isEditorAvailable(command: string): boolean {
  try {
    if (command === 'no_set') return true;
    execFileSync('which', [command], { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}
