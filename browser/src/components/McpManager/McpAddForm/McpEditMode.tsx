import React from 'react';
import type { McpAddFormProps } from '@/types/mcp';
import { McpFormFields } from './McpFormFields';
import { McpScopeSelector } from './McpScopeSelector';
import styles from './index.module.css';

interface McpEditModeProps {
  addScope: McpAddFormProps['addScope'];
  onScopeChange: McpAddFormProps['onScopeChange'];
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
