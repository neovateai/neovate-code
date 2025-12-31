# Recap Command Implementation

**Date:** 2025-12-31

## Context

用户希望能够长期查看使用 Neovate 进行开发的统计数据，包括代码行数变更、工具使用情况等。这是一个"年度回顾"性质的功能，用于了解自己通过 AI 辅助开发的产出量。

通过分析现有日志系统，发现 `~/.neovate/projects/*/` 下的 jsonl 文件已经记录了完整的 `write` 和 `edit` 工具调用数据，包含文件内容，具备统计代码行数变更的数据基础。

## Discussion

### 触发方式选择

讨论了四种触发方式：
1. `/stats` slash command - 手动执行查看
2. 每次会话结束时自动显示
3. 状态栏常驻显示
4. 多种方式组合

**决定**：采用手动命令方式，因为这不是核心流程功能。

### 实现方案对比

| 方案 | 优点 | 缺点 |
|-----|------|------|
| A: Slash Command | 最小改动，与现有架构一致 | 每次需扫描所有日志 |
| B: Plugin + 增量统计 | 查询速度快 | 需维护额外状态文件 |
| C: 独立 CLI 子命令 | 可在 shell 中使用，与其他命令风格一致 | 无法在会话中实时查看 |

**决定**：采用方案 C，因为这是偏产品层的"玩具性"功能，独立子命令更合适。

### 命名选择

原始命名 `stats` 可能与未来功能冲突，讨论了以下备选：
- `neovate recap` - 年度回顾/报告
- `neovate codestats` - 代码统计
- `neovate insights` - 使用分析
- `neovate usage` - 使用情况

**决定**：采用 `recap`，有"年度回顾"的语义。

## Approach

实现 `neovate recap` 独立子命令，从现有日志文件中解析统计数据，支持按项目和年份过滤。

### 命令接口

```bash
neovate recap                # 全局统计（所有项目）
neovate recap --project      # 当前目录项目
neovate recap --year 2025    # 按年过滤
neovate recap --json         # JSON 输出（方便脚本使用）
```

### 统计指标

1. **代码行数变更**：新增/删除/净变化
2. **工具调用次数**：各工具使用频率
3. **Token 使用量**：prompt/completion tokens
4. **按文件类型分布**：按扩展名分类统计

## Architecture

### 文件结构

```
src/commands/recap.ts    # 主逻辑
src/index.ts             # 注册命令
```

### 数据解析逻辑

**行数计算规则**：

| 工具 | 计算方式 |
|-----|---------|
| `write` | content 的行数（新增文件） |
| `edit` | new_string 行数 - old_string 行数 |

**Token 统计**：
从消息的 `usage` 字段累加 `input_tokens` / `output_tokens`

**数据源**：
扫描 `~/.neovate/projects/*/*.jsonl`，按文件 mtime 过滤年份

### 输出示例

```
📊 Neovate Code Recap (2025)

────────────────────────────────────────
  Projects:  19
  Sessions:  48
  Messages:  2.9K
────────────────────────────────────────

Code Changes:
  Lines added:    +27.6K
  Lines deleted:  -309
  Net change:     +27.3K

Tool Usage:
  read: 426    bash: 284    write: 241    edit: 240

By File Type:
  .ts            7.7K lines (28%)
  .md            7.6K lines (27%)
  .vue           4.1K lines (15%)

Token Usage:
  Prompt:     76.0M tokens
  Completion: 727.7K tokens
```
