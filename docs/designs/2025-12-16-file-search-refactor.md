# 文件搜索功能重构 - 支持大型项目与模糊搜索

**Date:** 2025-12-16

## Context

当前 `src/ui/useFileSuggestion.ts` 存在文件数量限制，当项目文件超过 6000 个时无法正常搜索。该限制来源于一次性加载所有文件路径到前端的架构设计。随着项目规模增长，这个限制越来越成为瓶颈。

参考 `subagent-@path.md` 文档中的实现方案，我们希望对文件建议功能进行全面重构，解决以下核心问题：

1. **突破文件数量限制** - 支持超过 6000 个文件的大型项目
2. **添加模糊搜索能力** - 使用 fzf 算法，提供智能匹配（如 'ucfs' 能匹配 'useFileSuggestion'）
3. **优化搜索性能** - 添加缓存机制、支持增量搜索和搜索取消
4. **保持向后兼容** - `useFileSuggestion` hook 的外部 API 不变

## Discussion

### 核心目标确认

经过讨论，确定重构需要全面解决以下问题：
- 支持超过 6000 个文件的项目（无上限）
- 添加模糊搜索能力（基于 fzf）
- 改善搜索性能（缓存、取消、超时）
- 自适应不同规模的项目（小型/中型/大型）

### 架构方案选择

探索了三个架构方案：

**方案 A: 增强型后端搜索架构（已选择）**
- 在 `src/utils/` 下创建完整的 FileSearch 模块
- 添加新的 `utils.searchFiles` API
- `useFileSuggestion` 改为调用搜索 API
- 优点：完全解决文件限制、性能最优、扩展性强
- 复杂度：中等（2-3天实现）

**方案 B: 渐进式增量搜索**
- 保留 `utils.getPaths` 但支持分页和过滤
- 前端实现懒加载和虚拟滚动
- 优点：改动最小、快速实现
- 缺点：性能提升有限、大型项目仍可能卡顿

**方案 C: 混合索引架构**
- 后端维护全局文件索引（定期更新）
- 前端首次加载部分索引
- 优点：响应速度最快、支持实时文件变化
- 缺点：实现复杂度高、需要维护索引状态

### 技术细节确认

1. **实现位置**: 后端搜索（像 subagent 一样）
2. **实现方式**: 参考 subagent 重写，但适配当前项目架构
3. **代码组织**: 单文件实现（`src/utils/fileSearch.ts`）
4. **复用现有逻辑**: 使用 `src/utils/ignore.ts` 处理 gitignore
5. **模块加载**: 使用动态导入 `await import()` 优化启动性能
6. **兼容性**: 保持 `useFileSuggestion` API 不变

## Approach

采用**方案 A - 增强型后端搜索架构的简化版本**，核心策略如下：

### 整体架构

```
src/utils/fileSearch.ts       # 单文件实现（300-400 行）
   ├── FileCache              # 结果缓存类
   ├── crawlAllFiles()        # 文件爬取（复用 listDirectory）
   ├── fuzzySearch()          # fzf 模糊搜索
   └── searchFiles()          # 主搜索函数

src/nodeBridge.ts
   └── utils.searchFiles      # 新增 API handler（动态导入）

src/ui/useFileSuggestion.ts  
   └── useSearchPaths()       # 新增 hook，调用后端搜索
```

### 自适应策略

根据项目规模自动选择最优算法：
- **小型项目** (< 5000 文件): fzf v2 算法（更精确）
- **中型项目** (5000-20000 文件): fzf v2 算法
- **大型项目** (> 20000 文件): fzf v1 算法（更快）+ 简化缓存

### 关键特性

1. **多层缓存机制**
   - 文件列表缓存（60秒 TTL）
   - fzf 实例缓存（避免重复构建索引）
   - LRU 清理策略（最多缓存 10 个目录）

2. **搜索优化**
   - 150ms debounce 减少请求频率
   - AbortController 支持搜索取消
   - 10秒超时 + 降级到简单字符串匹配
   - 空模式直接返回排序文件列表

3. **错误处理**
   - 文件系统权限错误 → 返回空数组
   - 目录不存在 → 返回空数组
   - 搜索超时 → 降级到简单匹配
   - 并发搜索 → 取消旧请求

4. **向后兼容**
   - `useFileSuggestion` 外部 API 保持不变
   - 内部实现从 `usePaths` 切换到 `useSearchPaths`
   - 保留 `utils.getPaths` 供其他功能使用

## Architecture

### 类型定义

```typescript
// src/utils/fileSearch.ts

interface SearchOptions {
  pattern: string;          // 搜索模式
  maxResults?: number;      // 最大结果数（默认 100）
  signal?: AbortSignal;     // 支持取消
}

interface SearchResult {
  paths: string[];          // 匹配的路径
  hasMore: boolean;         // 是否有更多结果
  totalMatched: number;     // 总匹配数
}

interface FileSearchConfig {
  cwd: string;              // 工作目录
  maxFiles?: number;        // 最大爬取文件数（默认 50000）
  cache?: CacheConfig;      // 缓存配置
  useGitignore?: boolean;   // 是否使用 gitignore（默认 true）
  disableFuzzy?: boolean;   // 禁用模糊搜索（默认 false）
}
```

### API 设计

```typescript
// src/nodeBridge.types.ts

type UtilsSearchFilesInput = {
  cwd: string;
  pattern: string;
  maxResults?: number;
};

type UtilsSearchFilesOutput = {
  success: boolean;
  data: {
    paths: string[];
    hasMore: boolean;
    totalMatched: number;
  };
  error?: string;
};

// HandlerMap 新增
'utils.searchFiles': { 
  input: UtilsSearchFilesInput; 
  output: UtilsSearchFilesOutput 
};
```

### 核心实现

#### 1. 文件缓存类

```typescript
class FileCache {
  private cache = new Map<string, {
    files: string[];
    timestamp: number;
    fzf?: AsyncFzf<string>;
  }>();
  
  private maxEntries = 10; // LRU 限制
  
  get(cwd: string, ttl: number): string[] | null;
  set(cwd: string, files: string[], fzf?: AsyncFzf<string>);
  getFzf(cwd: string): AsyncFzf<string> | null;
  setFzf(cwd: string, fzf: AsyncFzf<string>);
  invalidate(cwd: string);
  cleanup(ttl: number);
}
```

#### 2. 文件爬取

```typescript
async function crawlAllFiles(cwd: string, maxFiles: number): Promise<string[]> {
  // 1. 检查目录存在性和权限
  // 2. 调用 listDirectory(cwd, cwd, maxFiles)
  // 3. 错误处理：返回空数组
}
```

#### 3. 模糊搜索

```typescript
async function fuzzySearch(
  files: string[],
  pattern: string,
  options: { signal?, maxResults?, cwd? }
): Promise<string[]> {
  // 1. 空模式：直接返回排序文件
  // 2. 复用缓存的 fzf 实例（如果存在）
  // 3. 自适应选择算法版本（v1/v2）
  // 4. 执行搜索并返回结果
  // 5. 缓存 fzf 实例供下次使用
}
```

#### 4. 搜索超时处理

```typescript
async function fuzzySearchWithTimeout(...): Promise<string[]> {
  // Promise.race([搜索, 超时])
  // 超时后降级到简单字符串匹配
}
```

#### 5. 主搜索函数

```typescript
export async function searchFiles(
  config: FileSearchConfig,
  options: SearchOptions
): Promise<SearchResult> {
  // 1. 尝试从缓存获取文件列表
  // 2. 缓存未命中 → 爬取文件 → 缓存
  // 3. 执行搜索（模糊搜索或简单匹配）
  // 4. 排序和截断结果
  // 5. 返回 SearchResult
}
```

### 后端集成

```typescript
// src/nodeBridge.ts

this.messageBus.registerHandler(
  'utils.searchFiles',
  async (input) => {
    // 动态导入模块
    const { searchFiles } = await import('./utils/fileSearch');
    
    const context = await this.getContext(input.cwd);
    const config = context.config;
    
    const result = await searchFiles(
      {
        cwd: input.cwd,
        maxFiles: 50000,
        cache: { ttl: 60000, maxSize: 100 },
        useGitignore: config?.getFileFilteringOptions()?.respectGitIgnore ?? true,
        disableFuzzy: config?.getFileFilteringDisableFuzzySearch() ?? false,
      },
      {
        pattern: input.pattern,
        maxResults: input.maxResults ?? 100,
      }
    );
    
    return { success: true, data: result };
  }
);
```

### 前端改造

```typescript
// src/ui/useFileSuggestion.ts

function useSearchPaths(query: string, hasQuery: boolean) {
  const [paths, setPaths] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const searchPaths = useCallback(async (searchQuery: string) => {
    // 1. 取消之前的搜索
    abortControllerRef.current?.abort();
    
    // 2. 创建新的 AbortController
    const controller = new AbortController();
    abortControllerRef.current = controller;
    
    setIsLoading(true);
    
    try {
      // 3. 调用后端搜索 API
      const res = await bridge.request('utils.searchFiles', {
        cwd,
        pattern: searchQuery,
        maxResults: 100,
      });
      
      if (!controller.signal.aborted && res.success) {
        setPaths(res.data.paths);
        setError(null);
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        setError(error.message);
        setPaths([]);
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [bridge, cwd]);
  
  // 4. 150ms debounce
  useEffect(() => {
    if (!hasQuery) {
      setPaths([]);
      return;
    }
    
    const timeoutId = setTimeout(() => {
      searchPaths(query);
    }, 150);
    
    return () => clearTimeout(timeoutId);
  }, [query, hasQuery, searchPaths]);
  
  return { paths, isLoading, error, searchPaths };
}

// 在 useFileSuggestion 中替换
export function useFileSuggestion(inputState, forceTabTrigger = false) {
  // ... 解析逻辑不变
  
  // 使用新的 useSearchPaths 替代 usePaths
  const { paths, isLoading } = useSearchPaths(queryForSearch, hasQuery);
  
  // ... 其余逻辑保持不变
}
```

### 性能优化

1. **fzf 实例复用**
   - 首次搜索构建索引，后续搜索复用
   - 大项目（>1000 文件）才缓存实例

2. **内存优化**
   - 限制搜索结果数量（maxResults * 2）
   - LRU 缓存清理（最多 10 个目录）
   - fzf 设置 limit 参数

3. **响应速度优化**
   - 空模式快速返回（无需 fzf）
   - 150ms debounce 减少请求
   - 支持搜索取消（快速输入时）

4. **降级策略**
   - 搜索超时（10秒）→ 简单字符串匹配
   - 模糊搜索失败 → 简单字符串匹配
   - 文件系统错误 → 返回空数组

### 错误处理清单

- ✅ 搜索超时 → 降级到简单匹配
- ✅ 文件系统权限错误 → 返回空数组
- ✅ 目录不存在 → 返回空数组
- ✅ 缓存溢出 → LRU 清理
- ✅ 并发搜索 → AbortController 取消旧请求
- ✅ 空模式搜索 → 返回排序文件列表
- ✅ 模糊搜索失败 → 降级到简单匹配

### 数据流

```
用户输入 @src/ut
    ↓
150ms debounce
    ↓
bridge.request('utils.searchFiles', { pattern: 'src/ut' })
    ↓
动态导入 fileSearch 模块
    ↓
检查缓存 → 缓存命中/未命中
    ↓
缓存未命中 → crawlAllFiles() → 缓存结果
    ↓
fuzzySearchWithTimeout()
    ↓
复用 fzf 实例（如果存在）或创建新实例
    ↓
执行搜索 → 排序 → 截断
    ↓
返回 SearchResult { paths, hasMore, totalMatched }
    ↓
前端更新建议列表
```

## Implementation Checklist

- [ ] 创建 `src/utils/fileSearch.ts` 文件
- [ ] 实现 `FileCache` 类
- [ ] 实现 `crawlAllFiles()` 函数
- [ ] 实现 `fuzzySearch()` 和 `fuzzySearchWithTimeout()`
- [ ] 实现 `searchFiles()` 主函数
- [ ] 在 `src/nodeBridge.types.ts` 添加类型定义
- [ ] 在 `src/nodeBridge.ts` 添加 `utils.searchFiles` handler
- [ ] 修改 `src/ui/useFileSuggestion.ts` 实现 `useSearchPaths`
- [ ] 测试小型项目（< 1000 文件）
- [ ] 测试中型项目（5000-10000 文件）
- [ ] 测试大型项目（> 20000 文件）
- [ ] 测试搜索取消功能
- [ ] 测试超时降级功能
- [ ] 测试缓存失效和清理
- [ ] 更新相关文档

## Future Enhancements

1. **文件监听**：监听文件系统变化，自动失效缓存
2. **智能预加载**：预加载常用目录（src、lib、components）
3. **搜索历史**：记录用户常用搜索模式
4. **上下文感知**：根据当前文件推荐相关文件
5. **配置增强**：支持更多自定义配置（算法选择、缓存策略等）
