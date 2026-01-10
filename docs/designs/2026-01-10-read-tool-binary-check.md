# Read Tool Binary Filtering (Read Tool 二进制文件过滤)

**Date:** 2026-01-10

## Context
当前 `src/tools/read.ts` 缺乏对非文本文件（如二进制可执行文件、压缩包等）的有效过滤。这导致工具可能意外读取无法解析的内容，浪费 Token 并可能引发异常。本次设计旨在通过引入明确的黑名单机制来增强 Read Tool 的安全性。

## Discussion
在头脑风暴中，我们探讨了以下核心问题与决策：

1.  **优化方向优先级**:
    *   选项包括：行号增强、Notebook 支持、安全与过滤、PDF 支持。
    *   **决策**: 优先解决 **安全与过滤** 问题，这是基础的防御机制。

2.  **过滤策略**:
    *   选项包括：扩展名黑名单、内容字节检测、Git 规则集成、混合策略。
    *   **决策**: 采用 **扩展名黑名单 (Extension Blacklist)**。该方案实现简单，性能开销最小，且足以覆盖绝大多数误读场景。

3.  **阻断行为**:
    *   选项包括：严格报错、友好提示、仅警告。
    *   **决策**: 采用 **严格报错 (Strict Error)**。当命中黑名单时抛出异常，明确告知 AI 该操作被禁止，促使 AI 修正路径或放弃读取，避免 AI 误以为读取成功但内容为空。

4.  **黑名单覆盖范围**:
    *   **决策**: 确认覆盖以下类别：
        *   二进制可执行文件 (`.exe`, `.dll`, `.class` 等)
        *   压缩/归档文件 (`.zip`, `.tar`, `.gz` 等)
        *   非图片媒体文件 (`.mp3`, `.mp4` 等)
        *   数据库与大文件 (`.db`, `.sqlite` 等)

5.  **检查顺序**:
    *   **决策**: 逻辑顺序应为 `路径验证 -> 图片检查 -> PDF 检查 -> 黑名单检查 -> 文本读取`。这确保了像 `.png` 这样的合法二进制文件能被正确处理，而不会被黑名单误拦截。

## Approach
通过在 `src/constants.ts` 中定义统一的扩展名黑名单，并在 `src/tools/read.ts` 的执行流程中插入拦截逻辑来实现。

## Architecture

### 1. 常量定义 (`src/constants.ts`)
新增 `BINARY_EXTENSIONS` 集合，统一管理受限后缀。

```typescript
export const BINARY_EXTENSIONS = new Set([
  // Executables
  '.exe', '.dll', '.so', '.dylib', '.bin', '.class', '.o', '.obj',
  // Archives
  '.zip', '.tar', '.gz', '.rar', '.7z', '.jar', '.war',
  // Database
  '.db', '.sqlite', '.sqlite3', '.parquet', '.h5',
  // Media (Non-image)
  '.mp3', '.mp4', '.wav', '.avi', '.mov', '.mkv',
  // System
  '.ds_store', 'thumbs.db'
]);
```

### 2. 拦截逻辑 (`src/tools/read.ts`)
在 `execute` 方法中实施拦截。关键在于检查的时机：必须在 **图片处理** 之后，**文本读取** 之前。

**执行流程**:
1.  **路径与存在性检查**: 确保文件存在且位于 CWD 内。
2.  **图片处理 (Image Handling)**: 检查 `IMAGE_EXTENSIONS`。如果是图片，正常读取并返回 Base64。
3.  **PDF 处理**: (保留现有的 PDF 分支)。
4.  **黑名单拦截 (Blocklist Check)**:
    *   获取文件扩展名并转小写。
    *   检查是否存在于 `BINARY_EXTENSIONS`。
    *   **Action**: 如果存在，抛出 `Error`，包含明确的提示信息 (e.g., "Extension is restricted")。
5.  **文本读取**: 仅当通过上述检查后，才尝试以 `utf-8` 读取文件内容。

此设计能有效防止 AI 意外读取二进制文件，同时保持对合法媒体文件（图片）的支持。
