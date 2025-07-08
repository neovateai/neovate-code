import * as codeViewer from '@/state/codeViewer';
import * as fileChanges from '@/state/fileChanges';
import * as toolApproval from '@/state/toolApproval';

const useEditAll = (path?: string) => {
  const acceptAll = (modifiedCode: string) => {
    if (path) {
      codeViewer.actions.hideDiffActions(path);

      fileChanges.fileChangesActions.updateFileState(path, (prevFileState) => {
        return {
          ...prevFileState,
          content: modifiedCode,
          edits: prevFileState.edits.map((edit) =>
            !edit.editStatus ? { ...edit, editStatus: 'accept' } : edit,
          ),
        };
      });

      toolApproval.toolApprovalActions.approveToolUse(true, 'once');
    }
  };

  const rejectAll = (originalCode: string) => {
    if (path) {
      codeViewer.actions.hideDiffActions(path);

      fileChanges.fileChangesActions.updateFileState(path, (prevFileState) => {
        return {
          ...prevFileState,
          content: originalCode,
          edits: prevFileState.edits.map((edit) =>
            !edit.editStatus ? { ...edit, editStatus: 'reject' } : edit,
          ),
        };
      });

      fileChanges.fileChangesActions.writeFileContent(path, originalCode);
      toolApproval.toolApprovalActions.approveToolUse(false, 'once');
    }
  };

  return {
    acceptAll,
    rejectAll,
  };
};

export default useEditAll;
