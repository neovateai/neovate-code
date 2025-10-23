import styles from './index.module.css';
import { McpFormFields } from './McpFormFields';
import { McpScopeSelector } from './McpScopeSelector';

interface McpEditModeProps {
  addScope: 'global' | 'project';
  onScopeChange: (scope: 'global' | 'project') => void;
}

/**
 * Edit mode component for editing existing MCP server configuration
 */
export const McpEditMode: React.FC<McpEditModeProps> = ({
  addScope,
  onScopeChange,
}) => {
  return (
    <>
      {/* Scope selector for edit mode */}
      <div className={styles.settingsRow}>
        <McpScopeSelector value={addScope} onChange={onScopeChange} />
      </div>

      {/* Form fields for editing */}
      <McpFormFields />
    </>
  );
};
