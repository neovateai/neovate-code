# AskUserQuestion Tool 实现设计

**Date:** 2025-12-03

## Context

在 AI 辅助编程过程中，常需要在执行任务时向用户询问选择题，以收集信息、澄清歧义、了解偏好或提供选项。当前项目缺少这样的交互工具。

我们需要在 Neovate Code 项目中实现一个类似的工具，并满足以下要求：

- Tool 放置在 `src/tools/` 目录下
- UI 组件放置在 `src/ui/` 目录下
- 保留良好的扩展性，方便未来支持多端实现（如 Web 等）
- 采用项目现有的技术栈和架构模式

参考的通信机制包括：
- 标准的 Tool Use 协议（tool_use / tool_result）
- Approval 机制用于用户交互
- React 组件渲染和状态管理

## Discussion

### 1. 数据通信机制选择

探索了三种方案：
- **方案 A**: 基于文件的通信（类似 Todo 工具）
- **方案 B**: 基于内存的通信 + Approval 机制 ✅
- **方案 C**: 混合方式（会话级别持久化）

**最终选择：方案 B**

理由：
- 完美契合项目现有的 approval 机制
- 符合 Tool Use 协议的交互模式
- 无需额外文件 I/O，更轻量快速
- 与 ApprovalModal 模式一致，技术实现清晰

### 2. 组件组织结构

探索了三种方案：
- **方案 A**: 扁平结构（所有组件平级）
- **方案 B**: 模块化结构（独立目录）
- **方案 C**: 混合结构（主组件集中，按需拆分）✅

**最终选择：方案 C**

理由：
- 保持代码简洁，避免过度拆分
- 便于快速开发和维护
- 后期可根据需要灵活拆分

### 3. 选项组件实现

探索了三种方案：
- **方案 A**: 复用并扩展现有 PaginatedSelectInput
- **方案 B**: 创建独立的多选组件
- **方案 C**: 统一的 SelectInput 组件 ✅

"Other" 输入选项实现：
- **方案 X**: 集成在选项列表中
- **方案 Y**: 单独放在列表下方
- **方案 Z**: 混合模式（选中后原地展开）✅

**最终选择：C + Z**

理由：
- 统一组件更灵活，避免代码重复
- 混合模式用户体验最佳，交互流畅

### 4. 整体实现方案

探索了三种技术方案：

**方案 1 - 轻量级实现（MVP）**
- 文件数：2 个
- 代码集中，快速验证
- 适合原型开发

**方案 2 - 模块化实现（生产级）✅**
- 文件数：4 个
- 职责分离清晰，易于测试
- 状态管理可复用
- 为多端扩展预留接口

**方案 3 - 高扩展性实现（面向未来）**
- 文件数：8+ 个
- 完全模块化，适配层设计
- 对当前需求来说过度设计

**最终选择：方案 2**

理由：
- 平衡了开发效率和代码质量
- useReducer 状态管理与参考实现一致
- 为多端扩展预留了清晰接口
- 符合项目现有工具的设计模式

## Approach

采用 **基于 Approval 机制的模块化实现**：

### 核心设计原则

1. **职责分离**：Tool 层只负责定义和结果处理，UI 层负责交互
2. **状态集中**：使用 useReducer 集中管理复杂的问答状态
3. **组件复用**：SelectInput 设计为可配置的通用组件
4. **扩展友好**：为多端实现预留清晰的接口

### 数据流向

```
Neovate 发起 tool_use
    ↓
askUserQuestion.ts (approval: needsApproval = true)
    ↓
触发 AskQuestionModal 渲染
    ↓
useQuestionState 管理状态（当前问题索引、答案集合、选择状态）
    ↓
SelectInput 渲染当前问题的选项（自动添加 "Other"）
    ↓
用户选择 → 更新状态 → 下一题/提交
    ↓
所有答案收集完成后，调用 tool.execute({ questions, answers })
    ↓
返回 tool_result 给 Neovate
```

### 工作流程

1. Neovate 调用 AskUserQuestion 工具
2. Tool 的 approval.needsApproval 返回 true，触发 approval 流程
3. AskQuestionModal 组件渲染问题界面
4. useQuestionState 管理状态（当前问题、答案、选择状态）
5. SelectInput 渲染当前问题的选项（单选/多选 + "Other"）
6. 用户通过键盘交互选择答案
7. 回答完所有问题后进入提交确认页
8. 用户确认提交，答案注入到 tool.execute 的 params
9. Tool 返回结果给 Neovate

## Architecture

### 文件结构

```
src/
├── tools/
│   └── askUserQuestion.ts          # Tool 定义和执行逻辑 (~100 行)
├── ui/
│   ├── AskQuestionModal.tsx        # 主容器组件 (~120 行)
│   ├── SelectInput.tsx             # 通用选择组件 (~150 行)
│   └── hooks/
│       └── useQuestionState.ts     # 状态管理 Hook (~80 行)
└── constants.ts                     # 添加 TOOL_NAMES.ASK_USER_QUESTION
```

**总代码量：约 450 行**

### 数据结构设计

#### Tool Schema

```typescript
// 问题选项
const QuestionOptionSchema = z.object({
  label: z.string().describe('选项显示文本（1-5 个词）'),
  description: z.string().describe('选项说明')
});

// 单个问题
const QuestionSchema = z.object({
  question: z.string().describe('完整的问题文本，应以问号结尾'),
  options: z.array(QuestionOptionSchema)
    .min(2).max(4)
    .describe('2-4 个预定义选项，不包含 "Other"'),
  multiSelect: z.boolean().describe('是否允许多选')
});

// Tool 输入
const InputSchema = z.object({
  questions: z.array(QuestionSchema).min(1).max(4),
  answers: z.record(z.string(), z.string()).optional()
});

// Tool 输出
const OutputSchema = z.object({
  questions: z.array(QuestionSchema),
  answers: z.record(z.string(), z.string())
});
```

**验证规则**：
- 问题文本必须唯一
- 每个问题内的选项标签必须唯一

#### UI 状态类型

```typescript
type QuestionState = {
  currentQuestionIndex: number;           // 当前问题索引
  answers: Record<string, string>;        // 已收集的答案
  questionStates: Record<string, {        // 每个问题的选择状态
    selectedValue?: string | string[];    // 单选 string，多选 string[]
    textInputValue: string;               // "Other" 输入框的值
  }>;
  isInTextInput: boolean;                 // 是否在文本输入模式
};
```

### 核心组件详解

#### 1. useQuestionState Hook

**职责**：集中管理问答流程的所有状态

**Action 类型**：
- `NEXT_QUESTION`：前进到下一题
- `PREV_QUESTION`：返回上一题
- `UPDATE_QUESTION_STATE`：更新特定问题的选择状态
- `SET_ANSWER`：保存答案，可选自动前进
- `SET_TEXT_INPUT_MODE`：标记是否在文本输入模式

**暴露接口**：
```typescript
{
  // 状态
  currentQuestionIndex,
  answers,
  questionStates,
  isInTextInput,
  
  // 操作方法
  nextQuestion(),
  prevQuestion(),
  updateQuestionState(questionText, updates, isMultiSelect),
  setAnswer(questionText, answer, shouldAdvance),
  setTextInputMode(isInInput)
}
```

#### 2. SelectInput 组件

**职责**：统一的选择输入组件，支持单选/多选/"Other"

**Props 接口**：
```typescript
interface SelectInputProps {
  options: SelectOption[];           // 预定义选项 + "Other"
  mode: 'single' | 'multi';          // 单选/多选模式
  defaultValue?: string | string[];
  onChange: (value: string | string[]) => void;
  onFocus?: (value: string) => void; // 焦点变化回调
  onCancel?: () => void;
  onSubmit?: () => void;             // 多选模式的提交按钮
}

type SelectOption = {
  type: 'text' | 'input';
  value: string;
  label: string;
  description?: string;
  placeholder?: string;              // input 类型
  initialValue?: string;             // input 类型
  onChange?: (value: string) => void; // input 类型
};
```

**交互行为**：
- 单选模式：上下键选择，Enter 确认
- 多选模式：Space 切换选中，Enter 提交
- "Other" 选项：选中后在原位置展开 TextInput
- 键盘导航：箭头键导航，Tab 跳转，Esc 取消

#### 3. AskQuestionModal 组件

**职责**：主容器组件，协调整个问答流程

**核心渲染逻辑**：
1. 解析输入参数（questions）
2. 使用 useQuestionState 管理状态
3. 计算当前状态（当前问题 / 提交页 / 是否全部回答）
4. 处理全局键盘事件（Tab/箭头键切换问题）
5. 条件渲染：
   - 当前问题页（QuestionView）
   - 提交确认页（SubmitView）

**QuestionView 包含**：
- 问题导航条（QuestionNav）
- 问题标题
- SelectInput 组件
- 操作提示

**SubmitView 包含**：
- 问题导航条
- 答案回顾列表
- 未完成警告（如有）
- 提交/取消按钮

#### 4. QuestionNav 导航条

**职责**：显示问题进度和导航提示

**特性**：
- 智能截断长标题以适应终端宽度
- 显示回答状态（☑ 已回答 / ○ 未回答）
- 高亮当前问题
- 响应式布局

**UI 示例**：
```
← ○ Q1  ☑ Choose Framework  ○ Q3  ✓ Submit →
```

### 交互特性

#### 键盘导航

- **全局导航**：
  - `Tab` / `→`：下一个问题
  - `Shift+Tab` / `←`：上一个问题
  - `Esc`：取消

- **选项选择**：
  - `↑↓`：导航选项
  - `Enter`：确认（单选）/ 提交（多选）
  - `Space`：切换选中（多选）

- **文本输入模式**：
  - 文本输入时全局键盘导航暂停
  - 退出输入框后恢复

#### 智能行为

1. **自动前进**：单问题单选模式下选择后直接提交
2. **宽度适配**：根据终端宽度智能截断导航标题
3. **状态保持**：切换问题时保留之前的选择状态
4. **未完成提示**：提交页显示未回答问题的警告

### 错误处理

1. **Schema 验证**：
   - 使用 Zod safeParse 验证输入格式
   - 检查问题文本唯一性
   - 检查选项标签唯一性

2. **运行时错误**：
   - 捕获并显示提交失败
   - 保持在提交页，允许重试

3. **边界情况**：
   - 超长文本截断处理
   - 终端宽度变化响应
   - 空问题列表处理

### 测试策略

- **单元测试**：useQuestionState reducer 逻辑
- **组件测试**：SelectInput 各模式功能
- **集成测试**：完整问答流程（1-4 题，单选/多选）
- **边界测试**：文本截断、宽度适配、错误处理

### 开发步骤

1. 实现 `useQuestionState` Hook 和类型定义
2. 实现 `SelectInput` 组件（先单选，再多选）
3. 实现 `AskQuestionModal` 基础流程
4. 添加问题导航条和提交页
5. Tool 注册和 Approval 集成
6. 完善错误处理和测试

### 扩展性设计

为未来多端支持预留的接口：

1. **UI 适配层**：
   - 当前实现基于 Ink（终端）
   - 未来可抽象出 `useQuestionState` 作为公共逻辑
   - Web 端只需重新实现渲染层，复用状态管理

2. **组件接口**：
   - SelectInput 的 props 设计为平台无关
   - 可为 Web 创建 `SelectInput.web.tsx`
   - 共享相同的 TypeScript 接口

3. **Tool 层**：
   - 完全平台无关
   - 只依赖标准的 Tool Use 协议
   - 可在任何环境中复用

## 核心特性总结

- ✅ 支持 1-4 个问题，每个 2-4 个选项
- ✅ 单选/多选模式自由切换
- ✅ 自动添加 "Other" 文本输入选项
- ✅ 智能问题导航（键盘友好）
- ✅ 答案回顾和提交确认
- ✅ 响应式终端宽度适配
- ✅ 完整的错误处理和验证
- ✅ 多端扩展预留接口

## 技术亮点

- React Hooks（useReducer + useInput + useMemo）
- Zod Schema 验证和类型安全
- Approval 机制集成
- 组件复用和模块化设计
- 状态集中管理
- 平台无关的架构设计
