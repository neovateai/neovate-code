# Read Tool 大文件优化方案

**日期:** 2026-02-04

## 背景

当前 Read Tool 在处理大文件时存在性能瓶颈：

1. **无预检机制**：所有文件都需要完整读取到内存后才能进行验证
2. **Token 计数开销大**：即使是小文件也会执行昂贵的 `countTokens()` 操作
3. **错误反馈不及时**：对于超大文件（如 1GB），需要等待完整读取后才报错

参考 CLI 版本（`read-tool-large-file-analysis.md`）的最佳实践，CLI 采用了三级防护机制：
- **Level 1**: 预检验证（通过文件元数据快速拒绝大文件）
- **Level 2**: 内容二次验证（防止编码差异）
- **Level 3**: 渐进式 Token 验证（25% 阈值优化）

该机制在 CLI 中实现了：
- 小文件性能提升 66%（跳过 token 计数）
- 大文件快速失败 99.9%（< 5ms 拦截）

**优化目标**：对标 CLI 版本，在保持完全后向兼容的前提下，显著提升大文件处理性能。

## 讨论

### 关键决策点

**1. 优化方向选择**

探索了三种方案：
- **方案 A（三级防护机制）**：对标 CLI，性能提升 90%，代码改动中等（~100 行）
- **方案 B（流式读取）**：适合极端大文件，性能提升 85%，代码改动大（~200 行）
- **方案 C（轻量优化）**：快速上线，性能提升 60%，代码改动小（~20 行）

**最终选择**: 方案 A
- ✅ 性能提升最显著
- ✅ 有 CLI 成熟实践可参考
- ✅ 代码改动可控
- ✅ 维护性高

**2. 兼容性要求**

选择**完全后向兼容**：
- 所有优化封装在内部
- 外部 API（`file_path`, `offset`, `limit`）不变
- 现有调用代码无需修改

**3. 测试策略**

采用精简版测试策略，仅覆盖 5 个核心场景：
- 大文件拦截
- 图片豁免
- 小文件性能优化
- Token 限制验证
- 分块读取支持

### 权衡分析

| 考虑因素 | 决策 | 理由 |
|---------|------|------|
| **性能 vs 复杂度** | 接受 30% 代码复杂度提升 | 换取 90% 性能提升值得 |
| **Token 估算精度** | 使用保守的 25% 阈值 | 误判率 < 1%，可接受 |
| **图片文件处理** | 跳过 256KB 限制 | 走独立的 3.75MB 限制 |
| **异步改造** | validateAndTruncateContent 改为 async | execute 本身已是 async，安全 |

## 方案概述

采用**三级防护机制**，渐进式验证文件：

```
┌─────────────────────────────────────┐
│  Level 1: 预检验证 (Pre-check)      │
│  • fs.statSync() 读取元数据         │
│  • file.size > 256KB? → 快速失败    │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  Level 2: 内容验证 (Content Check)  │
│  • content.length > 256KB?          │
│  • 捕获编码差异导致的大小问题       │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  Level 3: 渐进式 Token 验证         │
│  • 快速估算: tokens ≈ chars / 4     │
│  • 估算值 <= 6250? → 跳过精确计数   │
│  • 估算值 > 6250? → countTokens()   │
└─────────────────────────────────────┘
```

**核心原则**：
1. **快速失败优先** - Level 1 仅需 1 次系统调用
2. **渐进式验证** - 25% 阈值确保小文件零开销
3. **后向兼容** - 所有验证逻辑内部封装
4. **特殊文件豁免** - 图片文件跳过前两级检查

## 架构设计

### 1. 新增函数

#### 1.1 预检验证函数

```typescript
// 位置：src/tools/read.shared.ts

/**
 * Level 1: 预检验证 - 检查文件大小是否超限
 * @returns true = 通过验证, false = 文件过大
 */
export function validateFileSize(
  filePath: string,
  maxSize: number = MAX_FILE_LENGTH
): boolean {
  try {
    const stats = fs.statSync(filePath);
    return stats.size <= maxSize;
  } catch {
    return false; // 文件不存在或无权限
  }
}
```

#### 1.2 渐进式 Token 验证函数

```typescript
/**
 * Level 3: 渐进式 Token 验证
 * 采用快速估算 + 条件精确计数策略
 */
export async function validateTokenCount(
  content: string,
  maxTokens: number = MAX_TOKENS
): Promise<void> {
  // 步骤 1: 快速估算（字符数 / 4）
  const estimatedTokens = content.length / 4;
  
  // 步骤 2: 低于 25% 阈值 → 跳过精确计数
  const threshold = maxTokens / 4; // 6250 tokens
  if (estimatedTokens <= threshold) {
    return; // 性能优化：小文件直接通过
  }
  
  // 步骤 3: 精确计数
  const actualTokens = countTokens(content);
  if (actualTokens > maxTokens) {
    throw new MaxFileReadTokenExceededError(actualTokens, maxTokens);
  }
}
```

### 2. 修改现有函数

#### 2.1 validateAndTruncateContent（改为 async）

```typescript
export async function validateAndTruncateContent(
  content: string,
  selectedLines: string[],
): Promise<{
  processedContent: string;
  actualLinesRead: number;
}> {
  // Level 2: 内容长度验证
  if (content.length > MAX_FILE_LENGTH) {
    throw new MaxFileReadLengthExceededError(content.length, MAX_FILE_LENGTH);
  }

  // Level 3: 渐进式 Token 验证（新增）
  await validateTokenCount(content, MAX_TOKENS);

  // 原有的行截断逻辑保持不变
  const truncatedLines = selectedLines.map((line) =>
    line.length > MAX_LINE_LENGTH
      ? `${line.substring(0, MAX_LINE_LENGTH)}...`
      : line,
  );

  return {
    processedContent: truncatedLines.join('\n'),
    actualLinesRead: selectedLines.length,
  };
}
```

#### 2.2 主流程集成（read.ts）

```typescript
execute: async ({ file_path, offset, limit }) => {
  try {
    validateReadParams(offset, limit);
    const ext = path.extname(file_path).toLowerCase();
    checkFileType(ext, file_path);
    const fullFilePath = resolveFilePath(file_path, opts.cwd);

    // 🆕 Level 1: 预检验证（图片文件跳过）
    if (!isImageFile(ext)) {
      const isValidSize = validateFileSize(fullFilePath, MAX_FILE_LENGTH);
      if (!isValidSize) {
        const stats = fs.statSync(fullFilePath);
        throw new MaxFileReadLengthExceededError(
          stats.size,
          MAX_FILE_LENGTH
        );
      }
    }

    // 图片处理、空文件检查、内容读取（原逻辑不变）
    // ...

    // 🆕 Validate and truncate（调用改为 await）
    const { processedContent, actualLinesRead } =
      await validateAndTruncateContent(content, selectedLines);

    return createReadResult(/* ... */);
  } catch (e) {
    return {
      isError: true,
      llmContent: e instanceof Error ? e.message : 'Unknown error',
    };
  }
},
```

### 3. 错误消息优化

#### 3.1 新增字节格式化工具

```typescript
// src/utils/error.ts

function formatBytes(bytes: number): string {
  const kb = bytes / 1024;
  if (kb < 1) return `${bytes} bytes`;
  if (kb < 1024) return `${kb.toFixed(1).replace(/\.0$/, '')}KB`;
  
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1).replace(/\.0$/, '')}MB`;
  
  const gb = mb / 1024;
  return `${gb.toFixed(1).replace(/\.0$/, '')}GB`;
}
```

#### 3.2 优化错误类消息

```typescript
export class MaxFileReadLengthExceededError extends Error {
  constructor(
    public actualSize: number,
    public maxSize: number,
  ) {
    const actualSizeStr = formatBytes(actualSize);
    const maxSizeStr = formatBytes(maxSize);
    
    super(
      `File content (${actualSizeStr}) exceeds maximum allowed size (${maxSizeStr}). ` +
      `Please use offset and limit parameters to read specific portions of the file, ` +
      `or use the GrepTool to search for specific content.`
    );
    this.name = 'MaxFileReadLengthExceededError';
  }
}
```

### 4. 执行流程时序

```
1. validateReadParams()          // 参数验证
2. resolveFilePath()              // 路径解析
3. validateFileSize() ← 新增      // Level 1: 预检
4. fs.readFileSync()              // 读取文件
5. processFileContent()           // 行切片
6. validateAndTruncateContent()   // Level 2 & 3
   ├─ 内容长度检查
   └─ validateTokenCount()
      ├─ 快速估算
      └─ 条件精确计数
7. createReadResult()             // 返回结果
```

## 实施计划

### 开发步骤（估时 3-4 小时）

```
阶段 1: 核心验证逻辑（1-2 小时）
├─ 1.1 在 read.shared.ts 添加 validateFileSize()
├─ 1.2 在 read.shared.ts 添加 validateTokenCount()
├─ 1.3 修改 validateAndTruncateContent() 为 async
└─ 1.4 在 error.ts 添加 formatBytes() 工具函数

阶段 2: 主流程集成（30 分钟）
├─ 2.1 在 read.ts 的 execute 中添加 Level 1 预检
├─ 2.2 修改 validateAndTruncateContent 调用为 await
└─ 2.3 确保图片文件跳过预检

阶段 3: 错误消息优化（15 分钟）
├─ 3.1 优化 MaxFileReadLengthExceededError 消息
└─ 3.2 优化 MaxFileReadTokenExceededError 消息

阶段 4: 测试验证（1 小时）
├─ 4.1 编写 5 个核心测试用例
├─ 4.2 手动测试边缘情况
└─ 4.3 性能对比验证
```

### 测试用例（精简版）

```typescript
// src/tools/read.test.ts

describe('Read Tool - Three-Level Validation', () => {
  test('应拒绝超过 256KB 的文本文件', async () => {
    const largeFile = createTestFile(300 * 1024);
    const result = await readTool.execute({ file_path: largeFile });
    
    expect(result.isError).toBe(true);
    expect(result.llmContent).toContain('exceeds maximum allowed size');
  });

  test('图片文件应跳过 256KB 限制', async () => {
    const largeImage = createTestFile(500 * 1024, '.png');
    const result = await readTool.execute({ file_path: largeImage });
    
    expect(result.llmContent).not.toContain('256KB');
  });

  test('小文件应跳过精确 token 计数', async () => {
    const smallFile = createTestFile(20 * 1024);
    const countTokensSpy = jest.spyOn(tokenizer, 'countTokens');
    
    await readTool.execute({ file_path: smallFile });
    
    expect(countTokensSpy).not.toHaveBeenCalled();
  });

  test('超过 25000 tokens 应报错', async () => {
    const tokenHeavyFile = createLargeTokenFile();
    const result = await readTool.execute({ file_path: tokenHeavyFile });
    
    expect(result.isError).toBe(true);
    expect(result.llmContent).toContain('tokens');
  });

  test('使用 offset/limit 可读取大文件片段', async () => {
    const largeFile = createTestFile(300 * 1024);
    const result = await readTool.execute({
      file_path: largeFile,
      offset: 1,
      limit: 100
    });
    
    expect(result.isError).toBe(false);
  });
});
```

## 性能预期

### 性能提升指标

| 文件类型 | 优化前 | 优化后 | 提升幅度 |
|---------|--------|--------|---------|
| **小文件 (< 25KB)** | ~15ms | ~5ms | **66%** ↓ |
| **中文件 (100KB)** | ~80ms | ~60ms | **25%** ↓ |
| **大文件 (300KB)** | ~500ms | ~2ms | **99%** ↓ |
| **超大文件 (1MB)** | ~2000ms | ~2ms | **99.9%** ↓ |

### 关键优化点

- ✅ **小文件跳过 token 计数**：节省 ~10ms (countTokens 开销)
- ✅ **大文件快速失败**：从读取完整内容改为仅读元数据（< 5ms）
- ✅ **减少不必要的 I/O**：300KB+ 文件避免 ~500ms 的读取时间

## 风险评估

| 风险项 | 影响 | 缓解措施 |
|--------|------|---------|
| **Token 估算不准确** | 低 | 使用保守的 25% 阈值，误判率 < 1% |
| **异步函数兼容性** | 低 | execute 本身已是 async，改动安全 |
| **特殊编码文件** | 中 | Level 2 二次验证兜底 |
| **符号链接处理** | 低 | fs.statSync 默认跟随链接 |

## 完成标准

- ✅ 所有测试用例通过
- ✅ 现有功能无回归
- ✅ 错误消息清晰友好
- ✅ 性能提升 > 50%（小文件场景）
- ✅ 代码审查通过

## 未来优化方向（V2）

以下功能可在后续版本中考虑：

1. **环境变量支持**（对标 CLI）
   ```typescript
   export const MAX_TOKENS = 
     parseInt(process.env.TAKUMI_MAX_TOKENS) || 25000;
   ```

2. **自动分块建议**
   ```typescript
   if (fileSize > MAX_FILE_LENGTH) {
     const suggestedChunks = Math.ceil(totalLines / 2000);
     throw new Error(`File too large. Suggest reading in ${suggestedChunks} chunks...`);
   }
   ```

3. **智能采样**（巨型文件）
   ```typescript
   // 读取文件头 + 中间 + 尾部各 500 行
   const sampledContent = sampleLargeFile(filePath, 1500);
   ```

4. **并行验证**
   ```typescript
   await Promise.all([
     validateTokenCount(content),
     validateCustomRules(content)
   ]);
   ```

## 参考资料

- `read-tool-large-file-analysis.md` - CLI 版本大文件处理机制深度分析
- `src/tools/read.ts` - 当前 Read Tool 实现
- `src/tools/read.shared.ts` - 共享工具函数
- `src/utils/error.ts` - 错误类定义
