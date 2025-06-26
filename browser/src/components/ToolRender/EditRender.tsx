import type { ToolMessage } from '@/types/message';
import CodeDiffOutline from '../CodeDiffOutline';

const mockData = {
  type: 'tool',
  toolCallId: '8fbe8c31-292b-483e-ae45-c3a3fc855e44',
  toolName: 'edit',
  args: {
    file_path: 'CHANGELOG.md',
    old_string:
      '## 0.0.34\n\n`2025-05-22`\n\n\n## 0.0.33\n\n`2025-05-22`\n\n- refactor: extract query context logic into separate function by [@sorrycc](https://github.com/sorrycc)',
    new_string:
      '# Changelog\n\nAll notable changes to this project will be documented in this file.\n\n## [Unreleased]\n\n### Added\n- TBD\n\n### Changed\n- TBD\n\n### Fixed\n- TBD\n\n## [0.0.34] - 2025-05-22\n\n## [0.0.33] - 2025-05-22\n\n### Refactored\n- Extracted query context logic into separate function by [@sorrycc](https://github.com/sorrycc)',
  },
  state: 'result',
  step: 1,
  result: 'File CHANGELOG.md successfully edited.',
};

export default function EditRender({ message }: { message: ToolMessage }) {
  const { args } = mockData || message;
  const { file_path, old_string, new_string } = args as {
    file_path: string;
    old_string: string;
    new_string: string;
  };

  const handleChangeCode = (newCode: string) => {
    console.log('newCode', newCode);
    // TODO: 更新代码
  };

  return (
    <CodeDiffOutline
      path={file_path}
      originalCode={old_string}
      modifiedCode={new_string}
      onChangeCode={handleChangeCode}
    />
  );
}
