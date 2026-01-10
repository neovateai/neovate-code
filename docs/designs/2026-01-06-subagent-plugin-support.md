# Subagent 插件支持 (Subagent Plugin Support)

**Date:** 2026-01-06

## Context
目前 Neovate 的 Subagent (子智能体) 仅支持通过内置 (Built-in) 和本地配置文件 (Global/Project .md files) 进行加载。为了增强扩展性，需要参考 Slash Command 的实现方式，为 Plugin 系统增加 `agent` 钩子，允许插件注册自定义的 Subagent。

## Discussion
在设计过程中，主要讨论了以下关键点：

1.  **加载优先级 (Loading Priority)**
    *   **问题**：插件定义的 Subagent 与内置、全局配置、项目配置之间的覆盖关系应该是怎样的？
    *   **结论**：遵循与 Slash Command 相同的优先级逻辑，即后加载的覆盖先加载的。具体顺序为：
        `Builtin` -> `Plugin` -> `Global` -> `Project`
    *   这意味着项目级别的配置拥有最高优先级，可以覆盖插件和内置的定义；插件可以覆盖内置定义。

2.  **接口设计**
    *   需要在 `Plugin` 接口中新增 `agent` 钩子，使其能返回 `AgentDefinition` 列表。

## Approach
通过扩展 Plugin 系统和重构 AgentManager 来实现此功能。

1.  **扩展 Plugin 接口**：在 `Plugin` 类型定义中增加 `agent` 方法。
2.  **重构 AgentManager**：修改加载逻辑，在加载本地文件之前，先从所有已注册的插件中加载 Subagent。
3.  **集成**：在 `Context` 初始化时调用更新后的加载方法。

## Architecture

### 1. Plugin Interface Update (`src/plugin.ts`)
在 `Plugin` 接口中添加 `agent` 钩子：

```typescript
export type Plugin = {
  // ... existing hooks
  
  // Subagent hook
  agent?: (
    this: PluginContext,
  ) => Promise<AgentDefinition[]> | AgentDefinition[];
};
```

### 2. AgentManager Refactor (`src/agent/agentManager.ts`)
*   重命名 `loadAgentsFromFiles` 为 `loadAgents` (或保留原名并扩展功能，但语义上 `loadAgents` 更准确)。
*   新增 `loadAgentsFromPlugins` 方法，通过 `context.pluginManager` 调用所有插件的 `agent` 钩子 (使用 `SeriesMerge` 策略)。
*   调整加载顺序：
    1.  `registerBuiltinAgents()` (最先加载)
    2.  `loadAgentsFromPlugins()` (覆盖 Builtin)
    3.  `loadAgentsFromDirectory` (Global/Project) (覆盖 Plugin)

### 3. Integration (`src/context.ts`)
更新 `Context.create` 方法中的初始化代码，调用新的加载逻辑。
