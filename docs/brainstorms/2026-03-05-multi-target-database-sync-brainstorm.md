---
title: 多目标数据库同步功能
type: feature
status: brainstorming
date: 2026-03-05
---

# 多目标数据库同步功能 - Brainstorm

## 需求概述

**问题:** 当前 bookmark-assistant 在用户 OAuth 连接时创建单一目标页面，用户无法灵活选择或更改同步目标。

**期望功能:** 支持将 Chrome 书签文件夹映射到不同的 Notion 数据库，实现多目标同步。

## 核心决策

### 1. 同步规则 - 基于文件夹映射

用户定义映射规则：`Chrome 文件夹 A → Notion 数据库 A`

示例：
```
Chrome: 工作文件夹/ProjectA  →  Notion: 工作数据库/ProjectA
Chrome: 个人文件夹/Reading  →  Notion: 阅读数据库
Chrome: (根目录书签)         →  Notion: 默认数据库
```

### 2. 实现方式

**推荐方案: 配置式映射**

在设置页面提供 UI 让用户：
1. 添加多个 Notion 数据库作为同步目标
2. 为每个目标设置文件夹匹配规则
3. 支持通配符或精确匹配

**备选方案: 模板继承**
- 保持现有 OAuth 流程
- 用户在 Notion 端创建多个模板页面
- 系统自动识别模板下的数据库

### 3. 技术实现要点

**数据库变更:**
- `User` 表新增 `syncMappings` JSON 字段存储映射规则
- 或新建 `SyncMapping` 表

**映射规则结构:**
```typescript
interface SyncMapping {
  id: string;
  notionDatabaseId: string;
  notionDataSourceId: string;
  folderPattern: string; // e.g., "工作/*", "个人/阅读"
  isDefault: boolean;
}
```

**同步流程变更:**
1. 读取 Chrome 书签及文件夹路径
2. 根据路径匹配映射规则
3. 对应发送到不同 Notion 数据库

### 4. 用户体验

**设置页面 UI:**
- 展示已配置的数据库列表
- 添加新映射按钮
- 文件夹路径输入 + 数据库选择器
- 测试映射按钮

### 5. 待定问题

1. **优先级**: 功能路线图中的位置待定

2. **免费版限制**: 是否限制映射数量？
   - 建议: Free 1个，Pro 无限

3. **冲突处理**: 同一书签匹配多条规则时的处理策略
   - 选项A: 精确匹配优先于通配符
   - 选项B: 按规则创建时间排序，优先匹配先创建的
   - 选项C: 同时同步到多个数据库

4. **现有数据**: 已同步书签是否需要迁移？
   - 建议: V2 初期不强制迁移，保持现有数据库为"默认"

## 为什么这个方案

**优点:**
- 用户灵活性高 - 可根据需求配置多个目标
- 易于理解 - 基于文件夹结构是自然映射方式
- 向后兼容 - 现有单数据库用户无需改变

**缺点:**
- 实现复杂度较高 - 需要改造成本
- UI 复杂度增加 - 设置页面需重新设计

## 下一步

1. 确定功能优先级
2. 详细技术设计
3. UI/UX 原型设计
4. 实现计划

---

*Created: 2026-03-05*
*Based on brainstorming with user*
