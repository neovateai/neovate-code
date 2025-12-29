# SubAgent 多目录加载支持

**Date:** 2025-12-29

## Context

当前项目中已经实现了 SubAgent 系统（`src/agent/`），但 SubAgent 定义只能通过代码注册（内置或插件）。

**当前代码结构：**
- `src/agent/agentManager.ts` - 核心 AgentManager 类，负责 agent 注册和执行
- `src/agent/types.ts` - 已包含 `AgentSource` 枚举和 `AgentDefinition` 接口
- `src/agent/builtin/` - 内置 agent（如 explore），使用 `AgentSource.BuiltIn`
- `AgentManager` 构造函数中调用 `registerBuiltinAgents()` 注册内置 agent

项目中存在 `skill.ts`，它实现了从多个目录加载 skill 配置文件的能力，支持项目级和用户级两个层次，以及 `.claude` 和 `.neovate` 两种配置目录。

用户希望为 SubAgent 添加类似的文件加载能力，使 SubAgent 可以通过配置文件定义，而不仅仅通过代码注册。这将提高 SubAgent 的可配置性和可扩展性，让用户能够更方便地创建和管理自定义的 SubAgent。

## Discussion

### 核心目标确认
经过讨论，明确了实现目标是：**参考 `skill.ts` 为 SubAgent 添加多目录支持**，而不是创建独立的文件夹管理系统或仅实现单一配置加载。

### 文件结构选择
讨论了三种文件结构方案：
1. **文件夹 + 固定名称文件**（如 skill 的 `SKILL.md`）
2. **直接 .md 文件**（选定）
3. **混合模式**

最终选择了**直接 .md 文件**的方式，即在 `agents/` 目录下直接放置 `.md` 文件，文件名即为 agent 名称。这种方式比 skill 的文件夹方式更简洁，适合 SubAgent 的使用场景。

### 目录优先级策略
确定使用与 skill 一致的四层目录优先级：
```
Global (~/.neovate/agents/)
  ↓
GlobalClaude (~/.claude/agents/)
  ↓
Project (.neovate/agents/)
  ↓
ProjectClaude (.claude/agents/)  ← 最高优先级
```

同名 SubAgent 时，后加载的覆盖先加载的，因此项目级别的配置会覆盖全局配置。

### 实现方案比较
讨论了三种实现方案：

**方案一：完全参考 skill.ts**
- 创建新的 `SubAgentManager` 类
- 几乎完全复制 `SkillManager` 的逻辑
- 优点：实现简单，风险低，与 skill 保持一致
- 缺点：增加代码量，需要与现有 `AgentManager` 整合

**方案二：扩展现有 AgentManager**（选定）
- 在现有 `AgentManager` 类中添加文件加载功能
- 优点：代码更集中，所有 agent 统一管理
- 缺点：`AgentManager` 职责增加

**方案三：混合模式 - Manager 分离 + Loader 复用**
- 创建独立的 `SubAgentManager` 但抽取通用的文件加载逻辑
- 优点：代码复用性最高
- 缺点：工作量大，需要重构现有代码

最终选择了**方案二**，在现有 `AgentManager` 中添加文件加载能力，保持代码集中和 API 一致性。

## Approach

通过扩展现有的 `AgentManager` 类实现多目录 SubAgent 配置文件加载：

1. **扩展类型定义**：在 `AgentDefinition` 中增加文件来源的 source 类型（`project-claude`、`project`、`global-claude`、`global`）

2. **添加文件加载方法**：
   - 在构造函数中自动调用 `loadAgentsFromFiles()`
   - 遍历四个配置目录，按优先级顺序加载
   - 读取 `.md` 文件，使用 `safeFrontMatter` 解析 YAML 前置内容
   - 验证必需字段（name、description）和可选字段（tools、model）

3. **保持向后兼容**：
   - 不改变现有的内置和插件 agent 注册机制
   - `executeTask()` 等现有 API 保持不变
   - 自动整合文件定义的 agents 到统一的 agents Map 中

4. **完善错误处理**：
   - 添加 `errors` 数组记录加载过程中的错误
   - 提供 `getErrors()` 方法供外部查询
   - 单个文件加载失败不影响其他文件

## Architecture

### 1. 类型定义扩展

在 `src/agent/types.ts` 中：

```typescript
// AgentSource 枚举已存在
export enum AgentSource {
  BuiltIn = 'built-in',
  Plugin = 'plugin',
  User = 'user',
  ProjectClaude = 'project-claude',
  Project = 'project',
  GlobalClaude = 'global-claude',
  Global = 'global',
}

// AgentDefinition 已使用 AgentSource 类型，需添加 path 字段
export interface AgentDefinition {
  agentType: string;
  whenToUse: string;
  systemPrompt: string;
  model: string;
  source: AgentSource;  // 已存在
  tools?: string[];
  disallowedTools?: string[];
  forkContext?: boolean;
  color?: string;
  path?: string;  // 新增：记录文件路径
}

// 新增接口
export interface AgentLoadError {
  path: string;
  message: string;
}
```

### 2. AgentManager 类扩展

在 `src/agent/agentManager.ts` 中添加：

**新增属性：**
```typescript
private errors: AgentLoadError[] = [];
```

**新增方法：**
```typescript
// 主加载方法
async loadAgentsFromFiles(): Promise<void>

// 目录扫描
private loadAgentsFromDirectory(dir: string, source: AgentSource): void

// 单文件加载
private loadAgentFile(filePath: string, source: AgentSource): void

// 文件解析
private parseAgentFile(content: string, filePath: string): 
  Omit<AgentDefinition, 'source' | 'path'> | null

// 错误查询
getErrors(): AgentLoadError[]
```

### 3. 加载流程

```
应用启动
   ↓
AgentManager 构造函数
   ↓
registerBuiltinAgents()
   ↓
loadAgentsFromFiles()
   ↓
遍历 4 个目录（Global → GlobalClaude → Project → ProjectClaude）
   ↓
每个目录：
  - 检查目录是否存在
  - 读取所有 .md 文件
  - 解析 YAML frontmatter
  - 验证必需字段
  - 存入 agents Map（同名覆盖）
   ↓
加载完成
```

### 4. 文件格式

**YAML 前置内容字段：**
- `name`（必需）：agent 标识符，小写字母+连字符，最大 64 字符，单行
- `description`（必需）：自然语言描述，最大 1024 字符，单行
- `tools`（可选）：逗号分隔的工具列表，省略则继承所有工具
- `disallowedTools`（可选）：逗号分隔的禁用工具列表
- `model`（可选）：模型别名或 'inherit'
- `forkContext`（可选）：布尔值，是否继承上下文
- `color`（可选）：agent 显示颜色

**Body 部分：** 作为 `systemPrompt` 使用（必需，不能为空）

**文件示例：**
```markdown
---
name: code-reviewer
description: Reviews code changes and provides feedback on code quality
tools: read, grep, bash
disallowedTools: write, edit
model: sonnet
forkContext: false
color: purple
---

You are a code review assistant. Your role is to:

1. Analyze code changes carefully
2. Identify potential bugs and security issues
3. Suggest improvements following best practices
```

### 5. 验证规则

- `name` 和 `description` 必需且为单行
- `name` 长度 ≤ 64 字符
- `description` 长度 ≤ 1024 字符
- `systemPrompt`（body）不能为空
- 只处理 `.md` 文件
- YAML 解析失败时记录错误并跳过

### 6. 错误处理

**加载阶段：**
- 目录不存在：跳过，不记录错误
- 文件读取/解析失败：记录到 errors 数组，继续加载其他文件
- 字段验证失败：记录具体错误，跳过该文件

**运行时：**
- agent 不存在：抛出异常，提示可用的 agent 类型
- tools 配置错误：在执行前验证并报错

### 7. 工具过滤

如果 agent 定义了 `tools` 字段：
```typescript
const allowedTools = definition.tools 
  ? context.tools.filter(t => definition.tools!.includes(t.name))
  : context.tools;
```

### 8. 集成点

- **Context**：使用 `context.paths.globalConfigDir` 和 `context.paths.projectConfigDir`
- **工具**：`src/tools/task.ts` 无需修改，自动支持文件定义的 agents
- **系统提示**：`getAgentDescriptions()` 自动包含文件定义的 agents

### 9. 测试策略

创建 `src/agent/agentManager.test.ts`，覆盖：
- 有效文件加载
- 必需字段验证
- 长度限制验证
- 同名覆盖逻辑
- tools/model 字段解析
- 错误处理（目录不存在、YAML 解析失败等）
- 非 .md 文件跳过

### 10. 向后兼容性

- 内置/插件 agent 注册机制不变
- 所有现有 API 保持不变
- 新增 `getErrors()` 方法（可选调用）
- 文件加载失败不影响已注册的 agents
