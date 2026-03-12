# Neovate 插件系统完整设计：Manifest + 安装管理 + Marketplace

**Date:** 2026-02-26

## Context

Neovate Code 已有一套成熟的 Plugin hooks 系统（25+ hooks，5 种执行策略），但缺少 Claude Code 那样的插件**分发、安装、管理、市场**机制。本次设计的目标是参考 Claude Code 的插件实现，为 Neovate 补齐 hooks 之外的完整插件生态能力。

## Discussion

### 设计聚焦

经讨论确认：**全面对标 Claude Code**，涵盖 Marketplace 浏览、插件发现、安装管理、四级作用域等全套能力，同时保持与 Neovate 现有 Plugin 接口的向下兼容。

### 三种方案对比

| 方案             | 核心思路                                   | 复杂度 |
| ---------------- | ------------------------------------------ | ------ |
| A: 完全对标      | 1:1 复刻 Claude Code 全套                  | 高     |
| B: 轻量 Registry | 本地优先 + Git 扩展，不引入 marketplace    | 中     |
| C: 渐进式        | 第一期 Manifest + 安装，第二期 Marketplace | 中高   |

**最终选择方案 C: 渐进式**——分两期交付，控制风险、逐步验证。

### 关键设计决策

1. **现有 Plugin 接口和 PluginManager 完全不变**——新增的是"插件如何被发现、安装、加载"这一层
2. **plugin.json manifest 支持两种模式**——`main` 代码入口 + 声明式组件可共存
3. **本地插件用 symlink**（开发时实时生效），Git 插件用 shallow clone
4. **Scope 简化为三级**：global > project > local（对比 Claude Code 的四级）
5. **注册表 V1/V2 分版本**——第一期 V1，第二期引入 marketplace 升级为 V2

## Approach

### 两期交付策略

**第一期（独立可用）**: plugin.json manifest 格式 + 多源安装（git/github/local/npm）+ Scope 管理 + `/plugin` 命令（install/uninstall/list/enable/disable/update）

**第二期**: Marketplace 插件市场 + marketplace.json + 浏览/搜索 + `plugin@marketplace` ID + `extraKnownMarketplaces` 团队配置

### 核心原则

- 安装后的插件最终转换为标准 `Plugin` 对象，交给现有系统处理
- 单个插件加载失败不影响其他插件和系统启动
- 使用 zod 做运行时验证、pathe 处理路径（沿用项目惯例）

## Architecture

### 整体架构

```
┌─────────────────────────────────────────────┐
│              用户交互层                       │
│  /plugin install|uninstall|list|search|...   │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│          MarketplaceManager (第二期)          │
│  - 管理多个 marketplace 源                    │
│  - 搜索/发现插件                              │
│  - 同步 marketplace 索引                      │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│           PluginInstaller (第一期)            │
│  - 多源下载: git / github / local / npm      │
│  - 安装/卸载/更新                             │
│  - Manifest 验证                             │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│           PluginRegistry (第一期)             │
│  - installed_plugins.json 持久化             │
│  - 启用/禁用状态管理                          │
│  - Scope 管理 (global/project)               │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│           PluginLoader (第一期)               │
│  - 解析 plugin.json manifest                 │
│  - manifest → Plugin 对象转换                │
│  - 合并 main 入口 + 声明式组件               │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│     现有 Plugin 系统 (不修改)                 │
│  - PluginManager: 排序 + hook 执行           │
│  - Context.create: 插件加载 + 初始化         │
│  - 各 hook: config/tool/skill/agent/...      │
└─────────────────────────────────────────────┘
```

### 核心模块

#### 1. 类型定义 (`src/pluginRegistry/types.ts`)

- **PluginSource**: discriminatedUnion — `local | git | github | npm`
- **PluginScope**: `global | project`
- **PluginManifest** (plugin.json): `name`, `version`, `main`, `commands`, `agents`, `skills`, `outputStyles`, `mcpServers`, `hooks`, `dependencies`
- **InstalledPlugin**: 包含 name, source, scope, installPath, version, enabled 等
- **PluginRegistryFile**: V1 格式，`{ version: 1, plugins: Record<string, InstalledPlugin> }`
- 第二期新增: **Marketplace**, **PluginId** (`plugin@marketplace`), **MarketplaceRegistryEntry**, V2 注册表

#### 2. PluginInstaller (`src/pluginRegistry/installer.ts`)

- `install()`: 根据 source.type 分发到 local/git/npm 安装逻辑
- `uninstall()`: 删除 installPath
- `update()`: git pull 或重新安装
- 本地插件创建 symlink，Git 用 `--depth 1` shallow clone
- 自动检测并安装 npm 依赖
- 强制读取并验证 plugin.json

#### 3. PluginRegistry (`src/pluginRegistry/registry.ts`)

- 持久化到 `~/.neovate/installed_plugins.json`
- CRUD: `register`, `unregister`, `get`, `getAll`, `getEnabled`, `getByScope`
- `setEnabled()`: 启用/禁用
- 启动时 zod 验证，格式错误时回退到空注册表

#### 4. PluginLoader (`src/pluginRegistry/loader.ts`)

- `loadInstalled()`: 读取 manifest → 调用 `#manifestToPlugin()`
- `#manifestToPlugin()`:
  - 如果有 `main`: 用 jiti 加载 JS/TS 入口，获得基础 Plugin 对象
  - 声明式 `skills`: 包装为 `plugin.skill` hook
  - 声明式 `outputStyles`: 包装为 `plugin.outputStyle` hook
  - 声明式 `commands`: 包装为 `plugin.slashCommand` hook
  - 声明式 `mcpServers`: 包装为 `plugin.config` hook 注入
  - 声明式 `agents`: 存储路径供 AgentManager 使用
  - main + 声明式互相叠加，声明式追加在 main 之后

#### 5. Context 集成 (`src/context.ts` 改动)

插件加载优先级（从低到高）:

1. builtin — checkpoint, truncation
2. **registered** — 通过 `/plugin install` 安装的（新增）
3. global scan — `~/.neovate/plugins/*.ts`
4. project scan — `.neovate/plugins/*.ts`
5. config — config.json 中的 `plugins` 数组
6. argv — 命令行 `--plugin` 参数

#### 6. Config 扩展 (`src/config.ts`)

- 第一期: 新增 `enabledPlugins?: Record<string, boolean>` — 可覆盖 installed_plugins.json 中的 enabled 状态
- 第二期: 新增 `extraKnownMarketplaces` — 团队项目确保成员访问必要插件市场

#### 7. `/plugin` 命令 (`src/slash-commands/builtin/plugin.tsx`)

已实现为 `LocalJSXCommand` 类型，采用 **CLI + 回退 UI** 模式：
- 带参数时（如 `/plugin install xxx`）→ 直接执行 CLI 命令，返回文本结果
- 无参数时（`/plugin`）→ 渲染交互式 UI（Discover / Installed / Marketplaces 三个 Tab）

**实现架构**：`createPluginCommand.call()` 中根据 `args` 是否存在做路由，有 args 时委托给独立的 `handlePluginCliCommand()` 函数处理所有子命令解析和 bridge API 调用。

##### 插件管理命令

```
/plugin install <name@marketplace> [--scope user|project|local]
/plugin uninstall <name@marketplace>
/plugin enable <name@marketplace>
/plugin disable <name@marketplace>
```

- 插件标识符格式为 `plugin-name@marketplace-name`，使用 `lastIndexOf('@')` 解析
- `--scope` 默认 `user`，支持 `user | project | local` 三个值
- 通过 `parsePluginIdentifier()` 和 `extractScope()` 辅助函数解析参数

##### Marketplace 管理命令

```
/plugin marketplace add <source>       # 添加市场（别名: /plugin market add）
/plugin marketplace list               # 列出已配置市场
/plugin marketplace update <name>      # 更新市场插件列表
/plugin marketplace remove <name>      # 删除市场（别名: rm）
```

- `marketplace` 可简写为 `market`
- `remove` 可简写为 `rm`
- Source 支持多种格式：`owner/repo`（GitHub）、Git URL（HTTPS/SSH）、本地路径、远程 marketplace.json URL

##### 错误处理

- 缺少必要参数 → 返回 Usage 提示信息
- 无效的 `name@marketplace` 格式 → 返回格式说明
- Bridge API 调用失败 → try/catch 返回 `"Failed to <action>: <error message>"`
- 未知子命令 → 返回完整的命令帮助信息

##### 关键实现细节

- 非 React 组件上下文中通过 `useAppStore.getState()` 获取 `bridge`、`cwd`、`productName`
- 所有 bridge 调用均为 typed（`plugin.install`、`plugin.marketplace.add` 等），类型定义在 `src/nodeBridge.types.ts`
- CLI 命令返回 `null`（不渲染 JSX），通过 `onDone(result)` 回调传递文本结果

#### 8. MarketplaceManager (第二期, `src/pluginRegistry/marketplace.ts`)

- `add()`: clone marketplace 仓库，验证 marketplace.json
- `remove()`: 删除缓存
- `search()`: 跨所有 marketplace 搜索（按 name/description/tags/category 匹配）
- `findPlugin()`: 精确查找
- `update()`: git pull 更新索引
- 缓存位置: `~/.neovate/marketplaces/`

### Scope 覆盖规则

```
local (.neovate/config.local.json)  >  project (.neovate/config.json)  >  global (~/.neovate/config.json)
```

`enabledPlugins` 在每级都可配置，`false` 值可覆盖上层的 `true`。

### 错误处理

- 安装时: zod 验证失败、git clone 失败、路径不存在等均抛出明确错误
- 加载时: 单个插件失败仅打印 warning，不影响其他插件和系统启动
- 运行时: 由现有 PluginManager 的 hook 策略处理

### 文件清单与改动量

| 阶段     | 新增文件 | 修改文件 | 估计代码量   |
| -------- | -------- | -------- | ------------ |
| 第一期   | 9        | 2        | ~800 行      |
| 第二期   | 2        | 3        | ~400 行      |
| 测试     | 5        | 0        | ~600 行      |
| **合计** | **16**   | **5**    | **~1800 行** |

详细设计（含完整类型定义和代码示例）见 `plugin-system-design.md`。
