# Slash Command UI 优化

**Date:** 2026-01-20

## Context

当前 Slash Command 列表的展示样式存在以下问题：

1. **Name 列宽度不一致**：每次搜索结果不同时，name 列的宽度会动态变化，导致视觉上不够整齐
2. **Description 未进行截断**：描述文本过长时会占据过多空间，影响整体美观度
3. **展示风格需要优化**：希望参考 Claude 的 slash command 展示风格，提升专业度和用户体验

**设计目标：**
- 参考 Claude 的 slash command 展示风格
- 确保 name 列宽度保持固定（表格对齐）
- 对超长描述进行单行截断 + 省略号处理

**使用场景：**
聊天输入框下拉建议（用户输入 `/` 时显示的命令列表）

## Discussion

### 关键问题与决策

**Q1: Slash Command 项需要包含哪些元素？**
- **决策**：保持现有结构 - Name + Description（无 icon）
- **理由**：最小改动，保持简洁

**Q2: 描述超长时如何处理？**
- **方案探讨**：
  - 单行截断 + 省略号 ✅（已选择）
  - 最多显示两行后截断
  - 单行截断 + Hover 显示全部
  - 动态高度完整显示
- **决策**：单行截断 + 省略号
- **理由**：最简洁，节省空间，保持列表紧凑

**Q3: Name 宽度一致的具体实现方式？**
- **方案探讨**：
  - 固定宽度（表格对齐）✅（已选择）
  - 动态宽度（现状）
  - 预设固定值
- **决策**：固定宽度（基于所有命令中最长 name 计算）
- **理由**：视觉整齐，符合表格对齐风格

### 方案对比

探讨了三种优化方案：

**方案 1：最小改动 - 基于当前代码优化** ✅（已选择）
- 保持现有 SuggestionItem 组件结构
- 将 firstColumnWidth 改为固定值
- 在 SuggestionItem 中添加 description 截断逻辑
- **优点**：改动最小，风险低，快速实现
- **缺点**：仍需遍历所有命令计算最大宽度

**方案 2：语义化组件 - 参考 Claude 风格重构**
- 创建专门的 SlashCommandItem 组件
- 采用固定的设计 token（如 name 固定 24 字符宽度）
- **优点**：更接近 Claude 设计风格，便于扩展
- **缺点**：代码变动较大

**方案 3：数据驱动 - 预处理 + 智能截断**
- 在 useSlashCommands 中预处理命令数据
- 添加 displayName 和 truncatedDescription 字段
- **优点**：关注点分离，可扩展性强
- **缺点**：增加数据处理层复杂度

**最终选择**：方案 1 - 最小改动
- 符合快速迭代需求
- 改动可控，不影响现有功能
- 未来可按需升级到方案 2

## Approach

采用**最小改动方案**，在现有代码基础上进行优化：

1. **固定 Name 列宽度**：在 `useSlashCommands` 中计算所有命令的最大 name 长度，并作为状态保存
2. **智能截断 Description**：在 `SuggestionItem` 组件中根据终端宽度和 name 列宽度，计算 description 的可用空间并截断
3. **保持向后兼容**：文件建议等其他场景保持原有逻辑

## Architecture

### 改动文件

1. **src/ui/useSlashCommands.ts** - 添加 maxNameWidth 计算
2. **src/ui/Suggestion.tsx** - 增强 SuggestionItem 支持截断
3. **src/ui/ChatInput.tsx** - 使用固定宽度和传递终端列数

### 组件设计

#### 1. useSlashCommands Hook

**新增返回值：**
```typescript
const maxNameWidth = useMemo(() => {
  if (slashCommands.length === 0) return 0;
  return Math.max(
    ...slashCommands.map((s) => s.command.name.length)
  ) + 1; // +1 for "/" prefix
}, [slashCommands]);

return {
  suggestions,
  selectedIndex: navigation.selectedIndex,
  isLoading,
  maxNameWidth, // 新增
  // ... 其他返回值
};
```

**设计要点：**
- 基于所有已加载的 slashCommands 计算最大宽度
- 使用 useMemo 避免重复计算
- 包含 "/" 前缀长度

#### 2. SuggestionItem 组件

**新增 props：**
```typescript
interface SuggestionItemProps {
  name: string;
  description: string;
  isSelected: boolean;
  firstColumnWidth: number;
  maxWidth: number; // 必需 prop
}

// 提取常量以消除魔法数字
const MARGIN_LEFT = 2;
const SPACING = 1;
const ELLIPSIS_WIDTH = 3;
const MIN_DESC_WIDTH = 20;
const MIN_MAIN_DESC_WIDTH = 10;
```

**截断逻辑：**
```typescript
// 计算 description 的最大显示宽度
const reservedWidth = MARGIN_LEFT + firstColumnWidth + SPACING + ELLIPSIS_WIDTH;
const maxDescriptionWidth = Math.max(
  MIN_DESC_WIDTH,
  maxWidth - reservedWidth
);

// ... source 提取逻辑 ...

// 截断 description
let truncatedDescription: string;
if (description.length > maxDescriptionWidth) {
  const availableForMain = maxDescriptionWidth - sourceSuffix.length - ELLIPSIS_WIDTH;
  
  if (availableForMain > MIN_MAIN_DESC_WIDTH) {
     // 优先保留 source 后缀
     truncatedDescription = 
       mainDescription.slice(0, availableForMain) + '...' + sourceSuffix;
  } else {
     // 空间极小时截断所有内容
     truncatedDescription = 
       description.slice(0, maxDescriptionWidth - ELLIPSIS_WIDTH) + '...';
  }
}
```

**渲染：**
```typescript
return (
  <Box key={name} flexDirection="row">
    <Box width={firstColumnWidth}>
      <Text color={isSelected ? 'cyan' : 'gray'}>{name}</Text>
    </Box>
    {truncatedDesc && (
      <Text color="dim" dimColor>
        {truncatedDesc}
      </Text>
    )}
  </Box>
);
```

#### 3. ChatInput 集成

**使用固定宽度并传递 maxWidth：**
```typescript
{slashCommands.suggestions.length > 0 && (
  <Suggestion
    suggestions={slashCommands.suggestions}
    selectedIndex={slashCommands.selectedIndex}
    maxVisible={10}
  >
    {(suggestion, isSelected, _visibleSuggestions) => {
      // 使用 maxNameWidth 而非动态计算
      const nameColumnWidth = slashCommands.maxNameWidth + 4; // +4 for spacing
      
      return (
        <SuggestionItem
          name={`/${suggestion.command.name}`}
          description={suggestion.command.description}
          isSelected={isSelected}
          firstColumnWidth={nameColumnWidth}
          maxWidth={columns} // 传递终端列数
        />
      );
    }}
  </Suggestion>
)}
```

### 数据流

```
slashCommands 加载完成
  ↓
计算 maxNameWidth（一次性）
  ↓
传递给 ChatInput
  ↓
计算 nameColumnWidth = maxNameWidth + 4
  ↓
传递给 SuggestionItem
  ↓
根据 maxWidth - firstColumnWidth 计算 description 可用空间
  ↓
截断 description 并添加 "..."
```

### 边界情况处理

**1. 终端宽度过小**
```typescript
const descMaxWidth = maxWidth 
  ? Math.max(10, maxWidth - firstColumnWidth - 2)  // 确保至少 10 字符
  : Infinity;

// 如果终端太窄，description 可能完全不显示
const truncatedDesc = descMaxWidth < 10 
  ? '' 
  : description.length > descMaxWidth
    ? description.slice(0, Math.max(0, descMaxWidth - 3)) + '...'
    : description;
```

**2. 空命令列表**
```typescript
const maxNameWidth = useMemo(() => {
  if (slashCommands.length === 0) return 0; // 返回 0
  return Math.max(...slashCommands.map((s) => s.command.name.length)) + 1;
}, [slashCommands]);
```

**3. 超长 name**
```typescript
// 限制 name 列最大宽度
const nameColumnWidth = Math.min(
  slashCommands.maxNameWidth + 4,
  Math.floor(columns * 0.4)  // name 列最多占 40% 终端宽度
);
```

**4. 描述为空字符串**
```typescript
{truncatedDesc && (
  <Text color="dim" dimColor>
    {truncatedDesc}
  </Text>
)}
```

**5. 文件建议的向后兼容**
```typescript
// 文件建议保持原有动态计算逻辑
{fileSuggestion.matchedPaths.length > 0 && (
  <Suggestion ...>
    {(suggestion, isSelected) => {
      const maxNameLength = Math.max(
        ...fileSuggestion.matchedPaths.map((s) => s.length),
      );
      return (
        <SuggestionItem
          name={suggestion}
          description={''}
          isSelected={isSelected}
          firstColumnWidth={Math.min(maxNameLength + 4, columns - 10)}
          maxWidth={columns}
        />
      );
    }}
  </Suggestion>
)}
```

## Implementation Notes

**实现效果：**
- ✅ Name 列宽度固定（基于所有命令最长 name）
- ✅ Description 超长自动截断 + `...`
- ✅ 保持表格对齐风格
- ✅ 最小改动，不影响现有功能
- ✅ 保持文件建议等其他场景的兼容性

**性能考虑：**
- maxNameWidth 使用 useMemo 缓存，仅在 slashCommands 变化时重新计算
- 避免在每次渲染时遍历所有命令

**可扩展性：**
- 未来可轻松添加 icon、source 标签等元素
- 为升级到方案 2（语义化组件）预留空间
