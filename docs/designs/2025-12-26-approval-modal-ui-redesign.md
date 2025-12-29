# ApprovalModal UI 交互改版设计文档

**Date:** 2025-12-26

## Context

本次改版的目标是对 `src/ui/ApprovalModal.tsx` 组件进行 UI 交互升级，主要动机包括：

1. **增强拒绝反馈机制**：当前实现中，用户拒绝工具执行时只能简单选择"No"，无法提供具体的拒绝理由，导致 LLM 难以理解用户意图并做出改进。

2. **参考业界最佳实践**：Claude Code CLI 的交互模式，通过内联输入框让用户可以直接表达修改建议。

3. **支持特定工具的增强交互**：针对 `bash`、`edit`、`write` 三个核心工具，提供"拒绝并输入理由"的功能，帮助 LLM 更好地理解用户需求。

4. **统一视觉风格**：按照提供的参考图片调整 UI 样式，使其与整体产品设计保持一致。

## Discussion

### 核心问题与决策

**Q1: 拒绝操作的交互流程应该如何设计？**

探索了三种方案：
- **两步式**：先选择拒绝选项 → 弹出输入界面
- **内联式**：聚焦到拒绝选项时直接展开输入框（✅ 最终选择）
- **混合式**：拒绝选项默认显示输入框

**决策理由**：内联式交互保持了选项列表的连贯性，用户体验更流畅，与 Claude Code CLI 的实现方式一致。

**Q2: 哪些工具需要支持拒绝理由输入？**

探索了三种范围：
- 仅 bash、edit、write 三个工具（✅ 最终选择）
- 所有需要审批的工具
- 可配置的工具列表

**决策理由**：这三个工具是最常用且最需要用户反馈的场景，避免过度设计。

**Q3: 应该创建新组件还是改造现有实现？**

探索了三种实现方式：
- **方案 1**：创建通用的 S0 组件（类似 Claude Code 的 InteractiveOptionsList）
- **方案 2**：直接在 ApprovalModal 中添加逻辑
- **方案 3**：混合方案，提取轻量级 InputOption 组件

**最终决策**：直接复用现有的 `SelectInput` 组件（✅ 最优方案）
- `SelectInput` 已支持 `type: 'input'` 的选项类型
- `AskQuestionModal` 中已有成熟的使用案例
- 无需重复造轮子，保持代码简洁

**Q4: 如何提交拒绝理由？**

- 用户在输入框中输入后按 **Enter** 提交（✅ 最终选择）
- 按 **Esc** 取消并返回选项列表
- SelectInput 内部已处理这些键盘事件

## Approach

### 总体方案

**核心思路**：
1. 将 `ink-select-input` 替换为项目现有的 `SelectInput` 组件
2. 为 bash/edit/write 工具的 deny 选项配置 `type: 'input'`
3. 按照参考图片调整 UI 布局和样式
4. 通过 `resolve` 回调将拒绝理由传递给上层处理

**技术路线**：
- 移除 `ink-select-input` 依赖
- 使用 `SelectInput` 的 single 模式
- 通过 `onChange` 回调处理用户选择和输入
- 拒绝理由通过 `resolve('deny', { denyReason: value })` 传递

## Architecture

### 组件结构

```
ApprovalModal (业务层)
  ├─ TopDivider (全宽分隔线)
  ├─ Title (工具类型标题)
  ├─ ToolPreview (内容预览)
  │   ├─ DottedDivider (虚线 - 仅 edit/write)
  │   ├─ DiffViewer (diff 展示 - edit/write)
  │   ├─ DottedDivider (虚线 - 仅 edit/write)
  │   └─ CommandPreview (命令内容 - bash)
  ├─ QuestionText (问题提示)
  ├─ SelectInput (选项列表 + 输入框)
  └─ BottomHint (底部提示)
```

### 核心组件修改

#### 1. 标题渲染逻辑

```typescript
function renderTitle(toolUse: ToolUseType, cwd: string) {
  const { name, params } = toolUse;
  
  if (name === 'edit') {
    return (
      <Box marginBottom={1}>
        <Text bold color={UI_COLORS.ASK_PRIMARY}>Edit file </Text>
        <Text>{getRelativePath(params.file_path, cwd)}</Text>
      </Box>
    );
  }
  
  if (name === 'write') {
    const isNew = !existsSync(fullPath);
    const action = isNew ? 'Create file ' : 'Update ';
    return (
      <Box marginBottom={1}>
        <Text bold color={UI_COLORS.ASK_PRIMARY}>{action}</Text>
        <Text>{getRelativePath(params.file_path, cwd)}</Text>
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
  
  return (
    <Box marginBottom={1}>
      <Text bold color={UI_COLORS.ASK_PRIMARY}>Tool use</Text>
    </Box>
  );
}
```

#### 2. 虚线分隔符

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

#### 3. ToolPreview 增强

```typescript
function ToolPreview({ toolUse, cwd }: ToolPreviewProps) {
  const { name, params } = toolUse;

  // Edit/Write 工具：显示 diff，上下加虚线
  if (name === 'edit' || name === 'write') {
    const { originalContent, newContent, fileName } = getDiffParams(toolUse, cwd);
    return (
      <Box flexDirection="column">
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

  // Bash 工具：显示命令内容
  if (name === 'bash') {
    return (
      <Box flexDirection="column" marginBottom={1}>
        <Box marginLeft={2}>
          <Text>{params.command}</Text>
        </Box>
      </Box>
    );
  }

  // 其他工具：显示参数
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box marginLeft={2}>
        <Text dimColor>{JSON.stringify(params, null, 2)}</Text>
      </Box>
    </Box>
  );
}
```

#### 4. 选项列表配置

```typescript
const selectOptions: SelectOption[] = useMemo(() => {
  const { name, params } = approvalModal.toolUse;
  const category = approvalModal.category;
  
  // 选项 1: Yes (once)
  const option1: SelectOption = {
    type: 'text',
    value: 'approve_once',
    label: 'Yes',
  };
  
  // 选项 2: Yes, allow all... (根据 category 动态生成)
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
  
  // 选项 3: Type here... (仅 bash/edit/write 支持输入)
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
```

#### 5. SelectInput 集成

```typescript
<SelectInput
  options={selectOptions}
  mode="single"
  onChange={(value) => {
    if (typeof value === 'string') {
      const option = selectOptions.find(opt => opt.value === 'deny');
      
      // 如果是输入类型的 deny 且 value 不等于 'deny'，说明是用户输入的理由
      if (option?.type === 'input' && value !== 'deny') {
        approvalModal.resolve('deny', { denyReason: value });
      } else {
        // 普通选择
        approvalModal.resolve(value as ApprovalResult);
      }
    }
  }}
  onCancel={() => approvalModal.resolve('deny')}
/>
```

### UI 布局结构

#### Edit/Write 工具完整布局

```
─────────────────────────────────────────────── ← TopDivider (全宽实线)
Edit file src/layouts/index.tsx                 ← bold紫色 + 普通白色
·············································· ← DottedDivider (全宽虚线)
  5      return (                                   
  6        <div className="kmi-layout">
  7          <nav>
  8 -        <Link to="/">Home</Link>             ← DiffViewer 内容
  8 +        <Link to="/">Home</Link> | <Link...
  9          </nav>
·············································· ← DottedDivider (全宽虚线)
Do you want to make this edit to index.tsx?    ← 问题文本
> 1. Yes                                            
  2. Yes, allow all edits during this session   ← SelectInput
  3. Type here to tell Claude what to do differently
     [输入框展开区域]                             ← 选中时展开
                                                    
Esc to exit                                     ← 底部提示（灰色）
```

#### Bash 工具完整布局

```
───────────────────────────────────────────────
Bash command                                    ← bold 紫色

  mkdir -p /Users/.../StudentManagement         ← 命令内容（无虚线）
  
Do you want to proceed?
> 1. Yes
  2. Yes, and don't ask again for mkdir commands...
  3. Type here to tell Claude what to do differently

Esc to exit
```

### 样式规范

| 元素 | 样式 |
|------|------|
| 顶部分隔线 | `'─'.repeat(columns)` + 灰色 |
| 标题操作部分 | `bold` + `UI_COLORS.ASK_PRIMARY` (紫色) |
| 文件路径 | 默认颜色（灰白色） |
| 虚线分隔 | `'·'.repeat(columns)` + `dimColor` + 灰色 |
| Diff 内容 | DiffViewer 原样式 |
| 命令内容 | 默认颜色 + `marginLeft={2}` |
| 问题文本 | 默认颜色 + `marginBottom={1}` |
| 选项列表 | SelectInput 内置样式 |
| 底部提示 | `dimColor` + `UI_COLORS.ASK_SECONDARY` |

### 数据流

```
用户交互
   ↓
SelectInput onChange
   ↓
判断选项类型和值
   ↓
┌─────────────────┬──────────────────┬─────────────────┐
│  普通选择       │  输入类型 deny   │  Esc 取消       │
│  (approve_*)    │  (带理由文本)    │                 │
└─────────────────┴──────────────────┴─────────────────┘
   ↓                ↓                  ↓
resolve(result)   resolve('deny',    resolve('deny')
                  { denyReason })
   ↓
approvalModal.resolve
   ↓
返回到 tool execution 层处理
```

### 拒绝理由处理机制

拒绝理由通过 `resolve` 的第二个参数传递：

```typescript
approvalModal.resolve('deny', { denyReason: userInputText });
```

在 store 层（`approveToolUse` 方法）中处理：

```typescript
resolve({
  approved: false,
  params: { denyReason: '...' }
});
```

```

### 移除的代码

需要删除现有的 `useInput` 键盘事件处理：

```typescript
// ❌ 删除这段代码
useInput((input, key) => {
  const inputNum = parseInt(input, 10);
  if (key.escape) {
    approvalModal!.resolve('deny');
  } else if (inputNum >= 1 && inputNum <= selectOptions.length) {
    const value = selectOptions[parseInt(input) - 1].value as ApprovalResult;
    approvalModal!.resolve(value);
  }
});
```

**原因**：`SelectInput` 内部已经处理了所有键盘导航逻辑。

## Implementation Notes

1. **兼容性考虑**：非 bash/edit/write 工具仍使用普通 text 类型的 deny 选项，保持向后兼容。

2. **状态管理**：SelectInput 内部管理输入框的显示/隐藏状态，ApprovalModal 无需额外状态。

3. **性能优化**：使用 `useMemo` 缓存选项列表配置，避免不必要的重渲染。

4. **可扩展性**：如需支持更多工具的输入功能，只需修改 `supportsDenyInput` 数组。

5. **测试要点**：
   - 验证三种工具的标题和布局正确性
   - 测试输入框的展开/收起交互
   - 确认拒绝理由正确传递到上层
   - 检查 Esc 和 Enter 键行为

## References

- `src/ui/SelectInput.tsx` - 复用的选项组件
- `src/ui/AskQuestionModal.tsx` - SelectInput 使用范例
- 参考图片 - UI 视觉设计规范
