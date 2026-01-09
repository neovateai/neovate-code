# ApprovalModal Edit Preview Fix

**Date:** 2026-01-09

## Context

在 `src/ui/ApprovalModal.tsx` 中，当显示 edit 工具的预览 diff 时，某些场景下会显示 "no changes"，即使实际 edit 操作会成功执行。

问题来源于预览逻辑与实际执行逻辑的不一致：
- **预览逻辑**（`getDiffParams`）使用简单的 `String.prototype.replace(old_string, new_string)`
- **实际执行**（`edit.ts` → `applyEdits`）使用 6 种匹配策略（精确匹配、行首尾空白容忍、块锚点匹配、空白归一化、转义归一化、缩进弹性匹配）

当 `old_string` 存在缩进差异或空白差异时，简单 `replace()` 找不到匹配，导致 `newContent === oldContent`，DiffViewer 显示 "No changes detected"。

## Discussion

### 方案选择

**方案 A: 复用 applyEdit 逻辑** ✅ 选中
- 在预览时调用 applyEdits 的匹配策略，确保预览与实际执行一致

**方案 B: 简化显示逻辑**
- 当简单 replace 不匹配时，直接显示 old_string → new_string 的对比
- 缺点：不能真实反映文件变化

### 实现方式选择

**A1: 直接调用 applyEdits** ✅ 选中
- 改动最小，直接在预览时调用 applyEdits，有异常则 fallback
- 优点：预览与实际执行逻辑完全一致，代码改动量小
- 缺点：applyEdits 读取文件（同步 IO），但影响可接受

**A2: 抽取纯函数匹配逻辑**
- 从 applyEdits 中抽取 `findActualMatch(content, oldStr)` 纯函数
- 需要重构 applyEdit.ts，改动量中等

**A3: dry-run 模式**
- 给 applyEdits 增加 dryRun 选项
- 影响面较大，需改动签名

## Approach

在 `ApprovalModal.tsx` 的 `getDiffParams` 函数中，将 edit 分支的简单 `replace()` 替换为调用 `applyEdits`。当 `applyEdits` 抛出异常时，fallback 到简单 replace（此时预览显示 no changes 与实际执行失败结果一致）。

## Architecture

### 修改文件

`src/ui/ApprovalModal.tsx`

### 代码变更

```typescript
// 新增导入
import { applyEdits } from '../utils/applyEdit';

// getDiffParams 函数修改
function getDiffParams(toolUse: ToolUseType, cwd: string) {
  // ... 现有代码 ...
  
  try {
    const oldContent = existsSync(fullFilePath)
      ? readFileSync(fullFilePath, 'utf-8')
      : '';

    let newContent: string;

    if (toolUse.name === 'edit') {
      const { old_string = '', new_string = '', replace_all } = toolUse.params;
      try {
        // 使用 applyEdits 获取实际的编辑结果
        const { updatedFile } = applyEdits(cwd, fullFilePath, [
          { old_string, new_string, replace_all }
        ]);
        newContent = updatedFile;
      } catch {
        // fallback: 若匹配失败，直接用简单 replace
        newContent = oldContent.replace(old_string, new_string);
      }
    } else {
      // write 工具逻辑保持不变
      const { content = '' } = toolUse.params;
      newContent = content;
    }
    // ... 
  }
}
```

### 数据流

```
ApprovalModal
  └── getDiffParams()
        ├── 读取文件 oldContent
        ├── edit 工具场景:
        │     ├── 调用 applyEdits() → updatedFile
        │     └── 异常时 fallback 到 replace()
        └── 返回 { originalContent, newContent, fileName }
              ↓
        DiffViewer ← 接收正确的 diff 数据
```

### 错误处理

| 场景 | 处理方式 |
|------|----------|
| applyEdits 成功 | 使用 updatedFile 作为 newContent |
| applyEdits 匹配失败抛错 | fallback 到简单 replace |
| 文件不存在 | 已有逻辑处理，oldContent = '' |

### 后续优化（可选）

`applyEdits` 内部会读取文件，而 `getDiffParams` 也在读取，存在重复 IO。可后续给 applyEdits 增加 `content` 参数，直接传入已读取的内容。
