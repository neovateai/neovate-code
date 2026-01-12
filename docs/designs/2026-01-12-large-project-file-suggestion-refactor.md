# Large Project File Suggestion Refactor

**Date:** 2026-01-12

## Context

当前的 `@` 文件提及和 Tab 文件补全功能对于超过 6000 文件的项目存在严重问题：超出限制的文件完全无法被搜索到。

现有实现的核心问题：
1. `utils.getPaths` 使用 `listDirectory` 同步遍历整个目录树，默认限制 6000 个文件
2. 一次性加载所有文件路径到内存，然后在前端通过 `filter` 做字符串匹配
3. 对于超大项目（>6000 文件），超出部分的文件完全无法被搜索到

## Discussion

### 搜索体验选择

探讨了三种搜索体验模式：
- **增量搜索**（选定）: 用户输入时动态搜索匹配文件，类似 VSCode 的 Ctrl+P
- 一次性加载: 保持当前模式但提高文件数量上限并优化性能
- 混合模式: 常用文件预加载 + 按需深度搜索

### 方案对比

评估了三种技术方案：

| 方案 | 核心思路 | 优点 | 缺点 | 复杂度 |
|------|----------|------|------|--------|
| **A: Git + ripgrep**（选定） | 使用 `rg --files` 获取文件，后端模糊匹配 | 无文件数量限制，利用现有 ripgrep | 每次按键发请求（需 debounce） | 中等 |
| B: 流式加载 | 后端流式返回路径，前端持续接收并本地搜索 | 用户体验流畅 | 内存占用高，实现复杂 | 高 |
| C: 分层缓存 | 热缓存常用路径 + 冷搜索深度查找 | 兼顾性能和覆盖率 | 逻辑复杂 | 高 |

### 忽略逻辑处理

ripgrep 自动支持 `.gitignore`，但不支持 product-specific ignore（如 `.neovateignore`）。需要在 ripgrep 结果上二次过滤。

| 层级 | 忽略规则 | 处理方式 |
|------|----------|----------|
| `.gitignore` | Git 标准 | ripgrep 自动处理 |
| `.git/info/exclude` | Git 仓库级 | ripgrep 自动处理 |
| `~/.gitignore_global` | Git 全局 | ripgrep 自动处理 |
| `.neovateignore` | Product-specific | 需要手动过滤 |

## Approach

采用 **Git感知 + ripgrep 后端搜索** 方案：

1. 使用 `ripgrep --files` 获取所有文件（自动遵守 .gitignore）
2. 在后端应用 product-specific ignore 过滤
3. 后端接收 query 参数，执行模糊匹配并返回排序后的结果
4. 前端使用 debounce 机制（150ms）减少请求频率
5. 空 query 时保持根目录结构显示的现有体验

## Architecture

### 整体数据流

```
┌─────────────────────────────────────────────────────────┐
│                     前端 (React/Ink)                      │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  useFileSuggestion                                  │ │
│  │  - 用户输入 → debounce (150ms) → 发起搜索请求       │ │
│  │  - 接收结果 → 更新 matchedPaths                     │ │
│  └─────────────────────────────────────────────────────┘ │
└───────────────────────────┬─────────────────────────────┘
                            │ bridge.request('utils.searchPaths', {query})
                            ▼
┌─────────────────────────────────────────────────────────┐
│                     后端 (NodeBridge)                     │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  utils.searchPaths handler                          │ │
│  │  1. 使用 rg --files 获取文件列表                    │ │
│  │  2. 应用 product-specific ignore 过滤              │ │
│  │  3. 模糊匹配 query                                  │ │
│  │  4. 限制返回结果数量 (maxResults: 100)              │ │
│  │  5. 排序 (相关度 + 路径深度)                         │ │
│  └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### 新增 API

```typescript
// nodeBridge.types.ts
interface UtilsSearchPathsInput {
  cwd: string;
  query: string;
  maxResults?: number;  // 默认 100
}

interface UtilsSearchPathsOutput {
  paths: string[];
  truncated: boolean;
}

// Handler 映射
'utils.searchPaths': {
  input: UtilsSearchPathsInput;
  output: UtilsSearchPathsOutput;
};
```

### 后端搜索逻辑

```typescript
import { isIgnored } from './utils/ignore';

async function searchPaths(opts: {
  cwd: string;
  query: string;
  maxResults: number;
  productNames: string[];
}) {
  const { cwd, query, maxResults, productNames } = opts;
  
  // 1. 使用 ripgrep 获取所有文件（自动遵守 .gitignore）
  const args = [
    '--files',
    '--hidden',
    '--glob', '!.git',
    '--glob', '!node_modules',
  ];
  const allFiles = await execRipgrep(args, cwd);
  
  // 2. 过滤：product-specific ignore
  const filteredFiles = allFiles.filter(file => {
    const fullPath = join(cwd, file);
    return !isIgnored(fullPath, cwd, productNames);
  });
  
  // 3. 空 query 时返回根目录结构
  if (!query) {
    return {
      paths: listRootDirectory(cwd),
      truncated: false,
    };
  }
  
  // 4. 模糊匹配
  const matched = filteredFiles
    .filter(f => fuzzyMatch(f, query))
    .slice(0, maxResults);
  
  // 5. 排序返回
  return {
    paths: sortByRelevance(matched, query),
    truncated: matched.length >= maxResults,
  };
}
```

### 前端 Hook 重构

```typescript
export function usePaths(query: string, hasQuery: boolean) {
  const { bridge, cwd } = useAppStore();
  const [isLoading, setIsLoading] = useState(false);
  const [paths, setPaths] = useState<string[]>([]);
  
  // debounce 搜索请求
  const debouncedQuery = useDebounce(query, 150);
  
  const searchPaths = useCallback(async (q: string) => {
    if (!hasQuery) return;
    
    setIsLoading(true);
    try {
      const res = await bridge.request('utils.searchPaths', {
        cwd,
        query: q,
        maxResults: 100,
      });
      setPaths(res.data.paths);
    } finally {
      setIsLoading(false);
    }
  }, [bridge, cwd, hasQuery]);
  
  useEffect(() => {
    if (hasQuery) {
      searchPaths(debouncedQuery);
    }
  }, [debouncedQuery, hasQuery, searchPaths]);
  
  return { paths, isLoading };
}
```

### 文件变更清单

| 文件 | 变更类型 |
|------|----------|
| `src/nodeBridge.types.ts` | 新增类型定义 |
| `src/nodeBridge.ts` | 新增 `utils.searchPaths` handler |
| `src/ui/useFileSuggestion.ts` | 重构 `usePaths` hook |
| `src/utils/ripgrep.ts` | 复用现有 ripgrep 工具 |

### 兼容性

| 场景 | 当前行为 | 新行为 |
|------|----------|--------|
| `@` 不带 query | 显示根目录结构 | 保持不变 |
| `@src` 搜索 | 前端 filter | 后端搜索 |
| Tab 补全 | 前端 filter | 后端搜索 |
| 超过6000文件项目 | 部分文件丢失 | 全量搜索 ✓ |

### 风险与缓解

| 风险 | 缓解措施 |
|------|----------|
| 每次按键发请求 | debounce 150ms |
| ripgrep 不可用 | 回退到 listDirectory |
| 首次搜索慢 | 显示 loading 状态 |

---

# 超大项目文件建议重构计划 v2 (In-Memory Cache)

**Date:** 2026-01-12
**Previous Plan:** v1 (Failed) - see above

## Context & Problem
v1 方案（实时 ripgrep 搜索）在超大项目（>100k 文件）中导致了严重的 **UI 卡顿 (Freeze)** 和 **结果延迟**。
原因在于：
1. 每次按键都触发 `rg --files`，产生大量子进程开销。
2. Node.js 主线程在每次搜索时都要解析和过滤 100k+ 行字符串，导致事件循环阻塞。

## Goal
彻底消除搜索时的 UI 卡顿，实现 "Instant" (即时) 的搜索体验。

## Solution: In-Memory Caching + Pre-loading

采用 **内存缓存 (In-Memory Cache)** 策略。
不再每次搜索都访问磁盘，而是将文件列表加载到内存中。

### Core Logic
1.  **FileCacheManager**: 后端单例，负责管理每个 `cwd` 的文件列表。
2.  **Lazy Loading & Pre-loading**: 
    - 首次调用 `utils.searchPaths` (无论是否有 query) 即触发加载。
    - 前端在应用启动时静默触发一次，实现 "预加载"。
3.  **Smart Update**: 
    - 设置 TTL (例如 30秒)。
    - 命中过期缓存：**立即返回旧数据** (保证响应速度)，同时**后台异步更新**。
4.  **Memory Search**: 
    - 搜索仅在内存数组中进行 (`Array.filter`)。
    - V8 引擎处理 100k 字符串遍历极快 (<10ms)，不会阻塞 UI。

## Architecture

```
Frontend (React)                Backend (NodeBridge)
      │                                  │
      │ (App Mount)                      │
      ├─────────────────────────────────►│ FileCacheManager.ensure(cwd)
      │ utils.searchPaths(empty)         │ ├─► Spawns `rg --files` (Async)
      │                                  │ └─► Filters & Stores in Memory
      │                                  │
      │ (User types '@src')              │
      ├─────────────────────────────────►│ FileCacheManager.search(cwd, 'src')
      │ utils.searchPaths('src')         │ ├─► Memory Filter (Instant)
      │                                  │ └─► Returns top 100 paths
      ▼                                  ▼
   Render UI (No Lag)               Background Update (if stale)
```

## Tasks

### Task 1: 实现 FileCacheManager
**File:** `src/nodeBridge/fileCache.ts` (New)
- 实现 `FileCacheManager` 类。
- 维护 `Map<cwd, CacheEntry>`。
- 实现 `getFiles(cwd)`: 处理 TTL 和后台更新逻辑。
- 实现 `_loadFiles(cwd)`: 调用 `ripgrep` 并应用 ignore 规则。

### Task 2: 重构 utils.searchPaths Handler
**File:** `src/nodeBridge.ts`
- 引入 `FileCacheManager`。
- 修改 `utils.searchPaths` handler：
  - 调用 `cache.getFiles(cwd)` 获取全量列表。
  - 如果 `query` 为空，返回根目录结构（使用全量列表计算，或者优化）。
  - 如果 `query` 不为空，在内存中执行模糊匹配/包含匹配。
  - 返回前 100 个结果。

### Task 3: 优化前端预加载
**File:** `src/ui/useFileSuggestion.ts`
- 保持 `usePaths` 的 `if (!hasQuery)` 逻辑，避免在不需要时显示建议。
- 添加独立的 `usePreloadPaths` hook (或 `useEffect`)：
  ```typescript
  // 新增预加载逻辑
  useEffect(() => {
    // 组件挂载时触发一次预加载（空查询）
    bridge.request('utils.searchPaths', { 
      cwd, 
      query: '', 
      maxResults: 1 // 我们不需要结果，只需要触发缓存
    }).catch(console.error);
  }, [cwd, bridge]);
  ```

### Task 4: 性能验证
- 在包含 100k+ 文件的目录中测试。
- 验证 UI 是否不再卡顿。
- 验证新增/删除文件后，缓存是否在 TTL 后更新。

## Trade-offs
- **Memory**: 100k 文件路径约占用 10-20MB 内存，完全可接受。
- **Freshness**: 文件变更后可能有最长 30秒 (TTL) 的延迟才能搜索到，这是为了性能做出的合理妥协。用户可以等待或手动触发（通过重试）。

---

# 超大项目文件建议重构计划 v3 (ripgrep 流式直接搜索)

**Date:** 2026-01-12
**Previous Plan:** v2 (In-Memory Cache) - 首次输入和 Tab 搜索仍存在卡顿

## Context & Problem

v2 方案（内存缓存 + 预加载）在大项目中仍存在以下问题：

1. **首次输入卡顿**: `FileCacheManager.getFiles()` 首次调用需要完整执行 ripgrep 遍历，在大项目中耗时数秒。虽有 warmup 机制，但用户可能在缓存构建完成前开始输入。

2. **`isIgnored` 性能问题**: 每个文件都单独调用 `isIgnored`，该函数每次都重新读取并解析所有 ignore 文件（`.gitignore`, `.neovateignore` 等），在大项目中造成数万次重复磁盘 I/O。

3. **Tab 搜索延迟**: 每次搜索即使缓存存在，也可能触发 stale-while-revalidate 后台更新。

## Goal

- 消除首次输入卡顿
- 消除 Tab 搜索卡顿  
- 删除 FileCacheManager 缓存机制
- 设置 6000 文件扫描上限保护

## Solution: ripgrep 流式直接搜索

采用**每次搜索直接调用 ripgrep 流式匹配**的策略。

核心思路：
- 每次搜索时 spawn ripgrep `--files`
- 流式读取输出，实时做 query 匹配
- 找到足够匹配 (100个) 或扫描达到上限 (6000个) 后立即 kill 进程
- 无需预加载、无需缓存完整文件列表

### 性能实测

| 场景 | 文件数 | 耗时 |
|------|--------|------|
| 小项目 | 429 | **24ms** |
| Home 目录 (极大) | 740,532 | **3.7s** |
| Home 目录 + 提前终止 (head 100) | 100 | **88ms** |

关键发现：**提前终止生效** - 通过 pipe 或 kill 进程可让 ripgrep 在输出足够后立即停止。

## Architecture

```
Before (v2):
┌─────────────┐    ┌───────────────────┐    ┌──────────────┐
│ usePaths    │───►│ utils.searchPaths │───►│FileCacheManager│
│ + warmup    │    │ (read from cache) │    │ (hold all files)│
└─────────────┘    └───────────────────┘    └──────────────┘

After (v3):
┌─────────────┐    ┌───────────────────────────────────────┐
│ usePaths    │───►│ utils.searchPaths                     │
│ (no warmup) │    │ - spawn ripgrep --files               │
└─────────────┘    │ - stream read + realtime match        │
                   │ - kill when enough matches OR 6000 cap│
                   └───────────────────────────────────────┘
```

## Detailed Implementation

### 1. `src/nodeBridge.ts` - 重写 handler

```typescript
this.messageBus.registerHandler('utils.searchPaths', async (data) => {
  const { cwd, query, maxResults = 100 } = data;
  const context = await this.getContext(cwd);

  // 空 query: 返回根目录结构
  if (!query) {
    const { listRootDirectory } = await import('./utils/list');
    return {
      success: true,
      data: {
        paths: listRootDirectory(context.cwd),
        truncated: false,
      },
    };
  }

  const { spawn } = await import('child_process');
  const { ripgrepPath } = await import('./utils/ripgrep');
  const { relative } = await import('pathe');
  const { parseProductIgnorePatterns, matchesAnyPattern } = await import('./utils/ignore');
  
  // 预解析 product ignore patterns（只读一次文件）
  const productPatterns = parseProductIgnorePatterns(context.cwd, ['neovate', 'takumi', 'kwaipilot']);
  
  const rgPath = ripgrepPath();
  const args = [
    '--files',
    '--hidden',
    '--glob', '!.git',
    '--glob', '!node_modules',
    context.cwd,
  ];

  return new Promise((resolve) => {
    const rg = spawn(rgPath, args, {
      cwd: context.cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const matches: string[] = [];
    const lowerQuery = query.toLowerCase();
    let filesScanned = 0;
    const MAX_FILES_TO_SCAN = 6000;
    let buffer = '';

    rg.stdout.on('data', (chunk: Buffer) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // 保留最后一个不完整的行

      for (const line of lines) {
        if (!line) continue;
        filesScanned++;

        if (filesScanned >= MAX_FILES_TO_SCAN || matches.length >= maxResults) {
          rg.kill();
          return;
        }

        const relativePath = relative(context.cwd, line);
        
        // 检查 product ignore
        if (matchesAnyPattern(relativePath, productPatterns)) continue;

        if (relativePath.toLowerCase().includes(lowerQuery)) {
          matches.push(relativePath);
        }
      }
    });

    rg.on('close', () => {
      // 排序：匹配位置靠前 > 路径更短
      const sorted = matches.sort((a, b) => {
        const aLower = a.toLowerCase();
        const bLower = b.toLowerCase();
        const aIndex = aLower.indexOf(lowerQuery);
        const bIndex = bLower.indexOf(lowerQuery);
        if (aIndex !== bIndex) return aIndex - bIndex;
        return a.length - b.length;
      });

      resolve({
        success: true,
        data: {
          paths: sorted.slice(0, maxResults),
          truncated: filesScanned >= MAX_FILES_TO_SCAN,
        },
      });
    });

    rg.on('error', () => {
      resolve({
        success: true,
        data: { paths: [], truncated: false },
      });
    });
  });
});
```

### 2. `src/utils/ignore.ts` - 新增优化函数

```typescript
/**
 * 预解析 product ignore patterns（只读一次文件）
 */
export function parseProductIgnorePatterns(
  rootPath: string,
  productNames: string[],
): string[] {
  const patterns: string[] = [];
  
  for (const productName of productNames) {
    const ignorePath = join(rootPath, `.${productName.toLowerCase()}ignore`);
    try {
      const content = fs.readFileSync(ignorePath, 'utf8');
      const { patterns: parsed } = parseIgnoreContent(content);
      patterns.push(...parsed);
    } catch (_e) {
      // 文件不存在
    }
  }
  
  return patterns;
}

/**
 * 快速检查路径是否匹配任意 pattern
 */
export function matchesAnyPattern(filePath: string, patterns: string[]): boolean {
  for (const pattern of patterns) {
    if (matchesPattern(filePath, pattern)) {
      return true;
    }
  }
  return false;
}
```

### 3. `src/ui/useFileSuggestion.ts` - 删除 warmup

删除第 26-35 行的 warmup useEffect：

```typescript
// 删除这段代码
useEffect(() => {
  bridge
    .request('utils.searchPaths', {
      cwd,
      query: '',
      maxResults: 1,
    })
    .catch(() => {
      // Ignore warmup errors
    });
}, [bridge, cwd]);
```

### 4. 删除文件

- `src/utils/fileCache.ts` - 完全删除

## File Changes Summary

| 文件 | 操作 |
|------|------|
| `src/nodeBridge.ts` | 重写 `utils.searchPaths` handler |
| `src/utils/ignore.ts` | 新增 `parseProductIgnorePatterns`, `matchesAnyPattern` |
| `src/ui/useFileSuggestion.ts` | 删除 warmup useEffect |
| `src/utils/fileCache.ts` | **删除** |

## Expected Results

| 场景 | Before (v2) | After (v3) |
|------|--------|-------|
| 首次 `@` 输入 | 等待完整缓存构建 | 立即响应（根目录列表） |
| 首次 `@node` 搜索 | 等待缓存 + 过滤 | ~50-100ms ripgrep 流式匹配 |
| Tab 搜索 | 同上 | 同上 |
| 大项目无匹配 query | 可能超时 | 最多扫描 6000 文件后返回 |

## Trade-offs

- **每次搜索有 ripgrep 进程开销**: 但流式读取+提前终止使实际延迟很低 (~50-100ms)
- **无法搜索超过 6000 文件的深层文件**: 保护性限制，避免无限等待
- **文件变化实时反映**: 无缓存意味着每次都是最新结果（这是优点）

---

# 超大项目文件建议重构计划 v4 (ripgrep glob 模式过滤)

**Date:** 2026-01-12
**Previous Plan:** v3 (ripgrep 流式直接搜索) - 6000 文件扫描上限导致大项目搜索结果不完整

## Context & Problem

v3 方案存在以下问题：

1. **6000 文件扫描上限**: ripgrep 按目录顺序输出文件，如果匹配的文件在第 6001 个之后就会被漏掉
2. **大项目搜索结果不完整**: 81664 文件的项目中，VS Code 能搜到 20+ 个结果，Neovate 只搜到 2 个
3. **目录搜索不工作**: 输入 `kaleido-testcase` 无法匹配到该目录下的文件

## Goal

- 支持超大项目 (80000+ 文件) 的完整搜索
- 同时支持文件名搜索和目录名搜索
- 移除 6000 文件扫描上限
- 支持跨平台路径分隔符

## Solution: ripgrep --iglob 模式过滤

核心思路：**让 ripgrep 在遍历时就按文件名/路径过滤**，而非输出全部文件再手动过滤。

### 关键改进

1. **使用 `--iglob` 参数**: ripgrep 会遍历全部文件但只输出匹配的结果
2. **双 glob 模式**: 同时匹配文件名和目录名
3. **路径分隔符检测**: 使用 `pathe` 的 `sep` 支持跨平台
4. **提前终止**: 找到 `maxResults` 个匹配后立即 kill 进程

### Glob 模式设计

| 查询类型 | 示例 | Glob 模式 | 说明 |
|---------|------|-----------|------|
| 文件名 | `MockApp` | `**/*MockApp*` + `**/*MockApp*/**` | 匹配文件名 + 目录下所有文件 |
| 路径 | `src/ui` | `**/src/ui**` | 精确目录路径匹配 |

## Architecture

```
用户输入 query
    ↓
debounce 150ms
    ↓
utils.searchPaths handler
    ↓
检测 query 是否包含路径分隔符 (sep 或 /)
    ├─ 包含: globPatterns = [`**/${normalizedQuery}**`]
    └─ 不包含: globPatterns = [`**/*${query}*`, `**/*${query}*/**`]
    ↓
执行: rg --files --iglob pattern1 --iglob pattern2 cwd
    ↓
流式读取输出，应用 product ignore 过滤
    ↓
匹配到 maxResults 个后立即 kill 进程
    ↓
排序并返回结果
```

## Implementation

### `src/nodeBridge.ts` - handler 实现

```typescript
this.messageBus.registerHandler('utils.searchPaths', async (data) => {
  const { cwd, query, maxResults = 100 } = data;
  const context = await this.getContext(cwd);

  if (!query) {
    const { listRootDirectory } = await import('./utils/list');
    return {
      success: true,
      data: {
        paths: listRootDirectory(context.cwd),
        truncated: false,
      },
    };
  }

  const { spawn } = await import('child_process');
  const { ripgrepPath } = await import('./utils/ripgrep');
  const { relative, sep, normalize } = await import('pathe');
  const { parseProductIgnorePatterns, matchesAnyPattern } = await import('./utils/ignore');

  const productPatterns = parseProductIgnorePatterns(context.cwd, [
    'neovate', 'takumi', 'kwaipilot',
  ]);

  const rgPath = ripgrepPath();
  
  // 构建 glob 模式
  let globPatterns: string[];
  if (query.includes(sep) || query.includes('/')) {
    // 包含路径分隔符: 精确目录匹配
    const normalizedQuery = normalize(query).replace(/\\/g, '/');
    globPatterns = [`**/${normalizedQuery}**`];
  } else {
    // 不包含路径分隔符: 同时匹配文件名和目录名
    globPatterns = [`**/*${query}*`, `**/*${query}*/**`];
  }

  const args = [
    '--files',
    '--hidden',
    '--glob', '!.git',
    '--glob', '!node_modules',
    ...globPatterns.flatMap((p) => ['--iglob', p]),
    context.cwd,
  ];

  return new Promise((resolve) => {
    const rg = spawn(rgPath, args, {
      cwd: context.cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const matches: string[] = [];
    const lowerQuery = query.toLowerCase();
    let buffer = '';
    let killed = false;

    rg.stdout.on('data', (chunk: Buffer) => {
      if (killed) return;
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line || killed) continue;

        if (matches.length >= maxResults) {
          killed = true;
          rg.kill();
          return;
        }

        const relativePath = relative(context.cwd, line);
        if (matchesAnyPattern(relativePath, productPatterns)) continue;
        matches.push(relativePath);
      }
    });

    rg.on('close', () => {
      const sorted = matches.sort((a, b) => {
        const aLower = a.toLowerCase();
        const bLower = b.toLowerCase();
        const aIndex = aLower.indexOf(lowerQuery);
        const bIndex = bLower.indexOf(lowerQuery);
        if (aIndex !== bIndex) return aIndex - bIndex;
        return a.length - b.length;
      });

      resolve({
        success: true,
        data: {
          paths: sorted.slice(0, maxResults),
          truncated: matches.length >= maxResults,
        },
      });
    });

    rg.on('error', () => {
      resolve({ success: true, data: { paths: [], truncated: false } });
    });
  });
});
```

### UI 增强: Loading 状态

`src/ui/ChatInput.tsx` 中添加搜索中提示:

```tsx
{fileSuggestion.isLoading && fileSuggestion.matchedPaths.length === 0 && (
  <Box marginLeft={2}>
    <Text color="dim">Searching...</Text>
  </Box>
)}
```

## File Changes Summary

| 文件 | 操作 |
|------|------|
| `src/nodeBridge.ts` | 使用 `--iglob` 模式，支持双 glob 匹配 |
| `src/utils/ignore.ts` | 新增 `parseProductIgnorePatterns`, `matchesAnyPattern` |
| `src/ui/useFileSuggestion.ts` | 删除 warmup，Tab 搜索也传递 query |
| `src/ui/ChatInput.tsx` | 添加 "Searching..." loading 提示 |
| `src/utils/fileCache.ts` | **已删除** |

## Expected Results

| 场景 | Before (v3) | After (v4) |
|------|-------------|------------|
| `MockApp` 搜索 | 只匹配前 6000 个文件中的 | 匹配所有文件名包含 MockApp 的 |
| `kaleido-testcase` 目录 | 无结果 | 匹配该目录下所有文件 |
| `src/ui` 路径 | 无结果 | 匹配 src/ui/ 目录下所有文件 |
| 81664 文件项目 | 结果不完整 | 完整搜索 ✓ |

## Trade-offs

- **每次搜索有 ripgrep 进程开销**: 但 ripgrep 极快，用户无感知
- **glob 模式有局限**: 复杂模糊匹配不如手动 `includes()` 灵活，但对于文件搜索足够
- **Windows 兼容**: 使用 `pathe` 的 `sep` 和 `normalize` 确保跨平台支持
