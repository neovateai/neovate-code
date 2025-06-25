# Browser 项目国际化使用指南

## 概述

本项目已集成 `react-i18next` 国际化解决方案，支持中文和英文两种语言。

## 功能特性

- ✅ 支持中文（简体）和英文
- ✅ 自动语言检测（基于浏览器设置）
- ✅ 语言切换组件
- ✅ 本地存储语言偏好
- ✅ TypeScript 支持

## 文件结构

```
src/
├── i18n/
│   ├── index.ts          # 国际化配置
│   └── locales/
│       ├── en.json       # 英文语言包
│       └── zh.json       # 中文语言包
├── components/
│   ├── I18nProvider/     # 国际化提供者组件
│   └── LanguageSwitcher/ # 语言切换组件
└── types/
    └── i18n.d.ts         # TypeScript 类型声明
```

## 使用方法

### 1. 在组件中使用翻译

```tsx
import { useTranslation } from 'react-i18next';

const MyComponent = () => {
  const { t } = useTranslation();
  
  return (
    <div>
      <h1>{t('chat.welcomeTitle')}</h1>
      <p>{t('chat.welcomeDescription')}</p>
    </div>
  );
};
```

### 2. 切换语言

用户可以通过侧边栏底部的语言切换按钮来切换语言。语言偏好会自动保存到本地存储。

### 3. 添加新的翻译内容

在 `src/i18n/locales/` 目录下的 JSON 文件中添加新的翻译键值对：

**en.json**
```json
{
  "newSection": {
    "title": "New Title",
    "description": "New Description"
  }
}
```

**zh.json**
```json
{
  "newSection": {
    "title": "新标题",
    "description": "新描述"
  }
}
```

### 4. 语言检测顺序

系统会按以下顺序检测语言：
1. localStorage 中保存的语言设置
2. sessionStorage 中的语言设置
3. 浏览器语言设置
4. HTML 标签的 lang 属性
5. 默认语言（英文）

## 已国际化的组件

- ✅ 侧边栏组件（Sider）
- ✅ 欢迎页面（Welcome）
- ✅ 聊天发送组件（ChatSender）
- ✅ 语言切换组件（LanguageSwitcher）

## 注意事项

1. 所有硬编码的文本都应该使用 `t()` 函数包装
2. 翻译键应该使用有意义的命名空间结构
3. 添加新语言时，需要在 `src/i18n/index.ts` 中注册相应的资源

## 开发建议

- 保持翻译键的一致性和可读性
- 为新功能添加相应的翻译内容
- 定期检查翻译内容的准确性和完整性
- 考虑使用翻译管理工具来维护大型项目的翻译内容

## 启动项目

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev
```

启动后，您可以在侧边栏底部看到语言切换按钮，点击即可切换语言。 
