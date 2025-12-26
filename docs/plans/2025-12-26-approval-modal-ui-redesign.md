# ApprovalModal UI 交互改版实现计划

**目标:** 重新设计 ApprovalModal 组件的 UI 交互，使用 SelectInput 组件替换 ink-select-input，并为 bash/edit/write 工具添加拒绝理由输入功能。

**架构:** 复用现有的 SelectInput 组件（支持 input 类型选项），移除 ApprovalModal 的边框样式，使用分隔线布局，为特定工具类型（bash/edit/write）的 deny 选项添加内联输入框。

**技术栈:** React, Ink, TypeScript, SelectInput 组件

---

## Task 1: 添加辅助组件和工具函数

**文件:**
- Modify: `src/ui/ApprovalModal.tsx:1-238`

**Step 1: 导入 useTerminalSize hook**

在文件顶部添加导入：

```typescript
import { useTerminalSize } from './useTerminalSize';
```

位置：在现有 import 语句之后（约第 13 行）

**Step 2: 添加顶部分隔线组件**

在 `ApprovalModal.tsx` 中，在 `ToolPreview` 函数之前添加：

```typescript
function TopDivider() {
  const { columns } = useTerminalSize();
  return (
    <Box marginBottom={1}>
      <Text color={UI_COLORS.CHAT_BORDER}>
        {'─'.repeat(Math.max(0, columns))}
      </Text>
    </Box>
  );
}
```

**Step 3: 添加虚线分隔符组件**

在 `TopDivider` 之后添加：

```typescript
function DottedDivider() {
  const { columns } = useTerminalSize();
  return (
    <Box>
      <Text dimColor color="gray">
        {'·'.repeat(Math.max(0, columns))}
      </Text>
    </Box>
  );
}
```

**Step 4: 添加标题渲染函数**

在 `DottedDivider` 之后添加：

```typescript
function renderTitle(toolUse: ToolUseType, cwd: string): React.ReactNode {
  const { name, params } = toolUse;
  
  if (name === 'edit') {
    const relativeFilePath = getRelativePath(params.file_path, cwd);
    return (
      <Box marginBottom={1}>
        <Text bold color={UI_COLORS.ASK_PRIMARY}>Edit file </Text>
        <Text>{relativeFilePath}</Text>
      </Box>
    );
  }
  
  if (name === 'write') {
    const relativeFilePath = getRelativePath(params.file_path, cwd);
    const fullPath = path.isAbsolute(params.file_path) 
      ? params.file_path 
      : path.resolve(cwd, params.file_path);
    const isNew = !existsSync(fullPath);
    const action = isNew ? 'Create file ' : 'Update ';
    
    return (
      <Box marginBottom={1}>
        <Text bold color={UI_COLORS.ASK_PRIMARY}>{action}</Text>
        <Text>{relativeFilePath}</Text>
      </Box>
    );
  }
  
  if (name === 'bash') {
    return (
      <Box marginBottom={1}>
        <Text bold color={UI_COLORS.ASK_PRIMARY}>Bash command</Text>
      </Box>
    );
  }
  
  // 其他工具
  return (
    <Box marginBottom={1}>
      <Text bold color={UI_COLORS.ASK_PRIMARY}>Tool use</Text>
    </Box>
  );
}
```

**Step 5: 验证导入和组件添加**

运行 TypeScript 检查：
```bash
npm run typecheck
```

预期：无类型错误

---

## Task 2: 修改 ToolPreview 组件

**文件:**
- Modify: `src/ui/ApprovalModal.tsx:17-61` (ToolPreview 函数)

**Step 1: 为 edit/write 工具添加虚线分隔**

替换整个 `ToolPreview` 函数：

```typescript
function ToolPreview({ toolUse, cwd }: ToolPreviewProps) {
  const { name, params } = toolUse;

  if (name === 'edit' || name === 'write') {
    const { originalContent, newContent, fileName } = getDiffParams(
      toolUse,
      cwd,
    );

    return (
      <Box flexDirection="column" marginBottom={1}>
        <DottedDivider />
        <DiffViewer
          originalContent={originalContent}
          newContent={newContent}
          fileName={fileName}
        />
        <DottedDivider />
      </Box>
    );
  }

  if (name === 'bash') {
    return (
      <Box flexDirection="column" marginBottom={1}>
        <Box marginLeft={2}>
          <Text>{params.command}</Text>
        </Box>
      </Box>
    );
  }

  // 其他工具显示参数
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box marginLeft={2}>
        <Text dimColor>{JSON.stringify(params, null, 2)}</Text>
      </Box>
    </Box>
  );
}
```

**Step 2: 验证 ToolPreview 修改**

运行 TypeScript 检查：
```bash
npm run typecheck
```

预期：无类型错误

---

## Task 3: 添加问题文本生成函数

**文件:**
- Modify: `src/ui/ApprovalModal.tsx`

**Step 1: 在 ApprovalModalContent 函数之前添加问题生成函数**

```typescript
function getQuestionText(toolUse: ToolUseType, cwd: string): string {
  const { name, params } = toolUse;
  
  switch (name) {
    case 'bash':
      return 'Do you want to proceed?';
    case 'edit': {
      const fileName = path.basename(params.file_path);
      return `Do you want to make this edit to ${fileName}?`;
    }
    case 'write': {
      const fullPath = path.isAbsolute(params.file_path) 
        ? params.file_path 
        : path.resolve(cwd, params.file_path);
      const isNew = !existsSync(fullPath);
      const fileName = path.basename(params.file_path);
      return isNew 
        ? `Do you want to create ${fileName}?`
        : `Do you want to update ${fileName}?`;
    }
    default:
      return 'Do you want to proceed?';
  }
}
```

**Step 2: 验证函数添加**

运行 TypeScript 检查：
```bash
npm run typecheck
```

预期：无类型错误

---

## Task 4: 重构 ApprovalModalContent 组件

**文件:**
- Modify: `src/ui/ApprovalModal.tsx:115-176` (ApprovalModalContent 函数)

**Step 1: 导入 SelectInput 组件**

在文件顶部修改导入，移除 `SelectInput from 'ink-select-input'`，添加：

```typescript
import { SelectInput, type SelectOption } from './SelectInput';
```

**Step 2: 替换整个 ApprovalModalContent 函数**

```typescript
function ApprovalModalContent() {
  const { approvalModal, cwd } = useAppStore();

  const selectOptions = useMemo(() => {
    const { name, params } = approvalModal!.toolUse;
    const category = approvalModal!.category;
    
    // 选项 1：Yes
    const option1: SelectOption = {
      type: 'text',
      value: 'approve_once',
      label: 'Yes',
    };
    
    // 选项 2：根据 category 动态生成
    const option2: SelectOption = category === 'write'
      ? {
          type: 'text',
          value: 'approve_always_edit',
          label: 'Yes, allow all edits during this session',
        }
      : {
          type: 'text',
          value: 'approve_always_tool',
          label: `Yes, and don't ask again for ${name} commands in ${cwd}`,
        };
    
    // 选项 3：拒绝选项（bash/edit/write 支持输入）
    const supportsDenyInput = ['bash', 'edit', 'write'].includes(name);
    const option3: SelectOption = supportsDenyInput
      ? {
          type: 'input',
          value: 'deny',
          label: 'Type here to tell Claude what to do differently',
          placeholder: 'Type here to tell Claude what to do differently',
          initialValue: '',
        }
      : {
          type: 'text',
          value: 'deny',
          label: 'No, and tell Claude what to do differently (esc)',
        };
    
    return [option1, option2, option3];
  }, [approvalModal, cwd]);

  const questionText = useMemo(
    () => getQuestionText(approvalModal!.toolUse, cwd),
    [approvalModal, cwd]
  );

  const handleChange = useCallback((value: string | string[]) => {
    if (typeof value === 'string') {
      // 判断是否是输入类型的拒绝选项
      const denyOption = selectOptions.find(opt => opt.value === 'deny');
      if (denyOption?.type === 'input' && value !== 'deny') {
        // value 是用户输入的拒绝理由
        approvalModal!.resolve('deny', { denyReason: value });
      } else {
        // 普通选择
        approvalModal!.resolve(value as ApprovalResult);
      }
    }
  }, [selectOptions, approvalModal]);

  const handleCancel = useCallback(() => {
    approvalModal!.resolve('deny');
  }, [approvalModal]);

  return (
    <Box flexDirection="column">
      <TopDivider />
      
      {renderTitle(approvalModal!.toolUse, cwd)}
      
      <ToolPreview toolUse={approvalModal!.toolUse} cwd={cwd} />
      
      <Box marginBottom={1}>
        <Text>{questionText}</Text>
      </Box>
      
      <SelectInput
        options={selectOptions}
        mode="single"
        onChange={handleChange}
        onCancel={handleCancel}
      />
      
      <Box marginTop={1}>
        <Text dimColor color={UI_COLORS.ASK_SECONDARY}>
          Esc to exit
        </Text>
      </Box>
    </Box>
  );
}
```

**Step 3: 移除旧的 useInput 逻辑**

删除 `ApprovalModalContent` 中的 `useInput` 调用（如果还存在）

**Step 4: 验证组件重构**

运行 TypeScript 检查：
```bash
npm run typecheck
```

预期：无类型错误

---

## Task 5: 更新 store 中的拒绝理由处理

**文件:**
- Modify: `src/ui/store.ts:740-780` (approveToolUse 函数)

**Step 1: 查看当前 resolve 签名**

确认 `resolve` 函数已经支持 `params` 参数（已存在）：
```typescript
resolve: async (
  result: ApprovalResult,
  params?: Record<string, unknown>,
) => {
  // ...
}
```

**Step 2: 在 resolve 中处理 denyReason**

找到 `resolve` 函数的实现，在处理 `deny` 结果时添加日志（用于调试）：

```typescript
resolve: async (
  result: ApprovalResult,
  params?: Record<string, unknown>,
) => {
  set({ approvalModal: null });
  const isApproved = result !== 'deny';
  
  // 处理拒绝理由（如果存在）
  if (result === 'deny' && params?.denyReason) {
    // TODO: 将拒绝理由传递给 LLM
    // 暂时记录到日志
    get().log(`Tool denied with reason: ${params.denyReason}`);
  }
  
  if (result === 'approve_always_edit') {
    await bridge.request('session.config.setApprovalMode', {
      cwd,
      sessionId,
      approvalMode: 'autoEdit',
    });
  } else if (result === 'approve_always_tool') {
    await bridge.request('session.config.addApprovalTools', {
      cwd,
      sessionId,
      approvalTool: toolUse.name,
    });
  }
  resolve({
    approved: isApproved,
    params: isApproved ? params : undefined,
  });
},
```

**Step 3: 验证 store 修改**

运行 TypeScript 检查：
```bash
npm run typecheck
```

预期：无类型错误

---

## Task 6: 手动测试

**Step 1: 启动应用**

```bash
npm run dev
```

**Step 2: 测试 bash 工具拒绝输入**

1. 触发一个 bash 命令（例如输入需要审批的命令）
2. 使用方向键选择第 3 个选项 "Type here to tell Claude..."
3. 验证：输入框应该展开
4. 输入拒绝理由，例如："请使用更安全的命令"
5. 按 Enter 提交
6. 验证：日志中应显示 "Tool denied with reason: 请使用更安全的命令"

预期：✅ 拒绝理由被正确记录

**Step 3: 测试 edit 工具界面**

1. 触发一个文件编辑操作
2. 验证 UI 布局：
   - ✅ 顶部有全宽实线分隔
   - ✅ 标题："Edit file" (加粗紫色) + "文件名" (普通颜色)
   - ✅ diff 上方有虚线
   - ✅ diff 下方有虚线
   - ✅ 问题文本："Do you want to make this edit to xxx?"
   - ✅ 3 个选项，第 3 个支持输入
   - ✅ 底部显示 "Esc to exit"

* 4: 测试 write 工具界面（新建文件）**

1. 触发创建新文件操作
2. 验证标题显示："Create file xxx"
3. 验证问题文本："Do you want to create xxx?"

**Step 5: 测试 write 工具界面（更新文件）**

1. 触发更新现有文件操作
2. 验证标题显示："Update xxx"
3. 验证问题文本："Do you want to update xxx?"

**Step 6: 测试选项 2 的动态文本**

1. 触发 bash 工具审批
2. 验证选项 2 显示："Yes, and don't ask again for bash commands in /current/dir"
3. 触发 edit 工具审批
4. 验证选项 2 显示："Yes, allow all edits during this session"

**Step 7: 测试 Esc 取消功能**

1. 在审批n2. 验证：应该拒绝操作

**Step 8: 测试非支持工具的拒绝选项**

1. 触发非 bash/edit/write 工具的审批（如果有）
2. 验证选项 3 显示为 text 类型nd tell Claude what to do differently (esc)"
3. 验证：选择后直接拒绝，无输入框

---

## Task 7: 代码清理和优化

**Step 1: 移除未使用的导入**

检查并移除 `ApprovalModal.ts未使用的导入：
- 移除 `SelectInput from 'ink-select-input'`（如果还存在）

**Step 2: 添加类型注释**

确保所有新函数都有正确的类型注释：

```typeipt
function TopDivider(): React.ReactNode { /* ... */ ion DottedDivider(): React.ReactNode { /* ... */ }
functiTitle(toolUse: ToolUseType, cwd: string): React.ReactNode { /* ... */ }
function getQuestionText(toolUse: ToolUseType, cwd: string): string { /* ..n
**Step 3: 运行 linter**

```bash
npm run lint
```

预期：无 lint 错误

**Step 4: 格式化代码**

```bash
npm run format
`Step 5: 最终类型检查**

```bash
npm run typecheck
```

预期：✅ 无类型错误

---

## 完成检查清单

- [ ] TopDivider 组件已添加
- [ ] DottedDivider 组件已添加
- [ ] renderTitle 函数已实现
- [ ] getQuestionText 函数已实现
- [ ] ToolPreview 已修改，edit/write 工具显示虚线
- [ ] ApprovalModalContent 已重构使用 SelectInput
- [ ] bash/edit/write 工具的 deny 选项支持输入
- [ ] 其他工具的 deny 选项为 text 类型
- [ ] store 中的 resolve 处理 denyReason
- [ ] 所有手动测试通过
- [ ] 类型检查通过
- [ ] Lint 检查通过
- [ ] 代码已提交

---

## 后续优化建议

1. **拒绝理由传递给 LLM**: 当前只是记录到日志，需要将拒绝理由实际传递给 AI 助手
2. **快捷键提示**: 可以在底部提示中添加更多快捷键说明，如 "1-3 to select"
3. **动画效果**: 输入框展开时可以添加平滑过渡动画（如果 Ink 支持）
4. **输入验证**: 对拒绝理由的长度或格式进行验证
5. **国际化**: 支持多语言界面文本
