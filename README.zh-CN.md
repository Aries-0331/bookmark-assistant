<p align="center">
  <img src="packages/extension/src/assets/logo_128x128.png" alt="Bookmark Assistant logo" width="96" height="96" />
</p>

<h1 align="center">Bookmark Assistant</h1>

<p align="center">
  用于收集、整理并同步书签到 Notion 的浏览器扩展。
</p>

<p align="center">
  <a href="README.md">English</a> · <a href="README.zh-CN.md">简体中文</a>
</p>

<p align="center">
  <a href="LICENSE"><img alt="License: AGPL-3.0-or-later" src="https://img.shields.io/badge/license-AGPL--3.0--or--later-blue.svg" /></a>
  <a href="https://chromewebstore.google.com/detail/khffaaemphidjmhokafmiilkcjpgiije?utm_source=item-share-cb"><img alt="Chrome Web Store" src="https://img.shields.io/badge/Chrome%20Web%20Store-available-16a34a.svg" /></a>
</p>

---

Bookmark Assistant 可以将 Chrome 书签和 Reading List 同步到 Notion 数据库。项目基于 Chrome MV3 扩展构建，并包含一个轻量服务端，用于处理 Notion OAuth、会话和 Notion API 写入。

开源版本本身应当是可用的：你可以自部署服务端，从源码构建扩展，连接自己的 Notion 集成，并将书签数据同步到你控制的基础设施中。

托管版 / Pro 版本面向希望减少配置并使用托管自动化能力的用户，例如托管 Notion OAuth、AI 自动标签、AI 摘要、更智能的同步以及托管服务运维。

## 为什么做这个项目

浏览器书签很有用，但长期放在文件夹里很容易失去可见性。Notion 更适合回顾、搜索、批注和长期整理。Bookmark Assistant 的目标是连接两者，而不是强迫你迁移到另一个专有书签管理器。

这个仓库适合：

- 想要自部署 bookmark-to-Notion 工作流的用户。
- 想检查或扩展扩展端与服务端代码的开发者。
- 正在评估未来是否需要托管版本的团队。

## 功能特性

当前仓库已经实现：

- 将 Chrome 书签同步到 Notion。
- 将 Chrome Reading List 同步到 Notion。
- 从扩展弹窗保存当前页面。
- 从浏览器右键菜单保存链接。
- 在可用时提取页面标题和描述。
- 通过 sync ID 和 URL 匹配，避免重复创建已有 Notion 页面。
- 将同步状态存储在 Chrome storage 中，并同步更新 popup / options UI。
- 使用 PostgreSQL 和 Prisma 自部署服务端。

开源仓库不包含：

- 支付逻辑。
- 托管服务密钥。
- 托管商业 OAuth 基础设施。
- 面向生产环境的 AI 自动标签或 AI 摘要后端。

## 开源版 vs Pro / 托管版

开源版面向自部署和透明可控的使用场景。Pro / 托管版面向希望降低配置成本并使用托管功能的用户。

| 能力                     | 开源版 | Pro / 托管版 |
| ------------------------ | ------ | ------------ |
| 读取 Chrome 书签         | 支持   | 支持         |
| 读取 Chrome Reading List | 支持   | 支持         |
| 手动同步到 Notion        | 支持   | 支持         |
| 保存当前页面             | 支持   | 支持         |
| 右键菜单保存             | 支持   | 支持         |
| 托管 Notion OAuth        | 不支持 | 支持         |
| AI 自动标签              | 不支持 | 计划中       |
| AI 摘要                  | 不支持 | 计划中       |
| 更智能的托管同步         | 不支持 | 计划中       |
| 支持                     | 社区   | 优先         |

## 工作原理

1. 扩展从 Chrome 读取书签和 Reading List。
2. 扩展将条目格式化为带稳定 sync ID、URL 元数据、类型和阅读状态的数据。
3. 扩展向服务端发送同步请求。
4. 服务端校验会话，检查配置的 Notion data source，并构建 Notion 属性。
5. 服务端创建缺失的 Notion 页面，并通过 sync ID 或 URL 跳过已有页面。
6. 扩展在本地存储同步状态，让 popup 和 options 页面展示最新状态。

## 安装

本仓库使用 pnpm workspaces。

```bash
pnpm install
```

构建扩展：

```bash
pnpm build
```

构建后的扩展输出目录：

```text
packages/extension/dist
```

在 Chrome 中加载：

1. 打开 `chrome://extensions`。
2. 启用开发者模式。
3. 点击 “Load unpacked”。
4. 选择 `packages/extension/dist`。

TODO: 确认贡献者本地推荐加载路径应为 `packages/extension/dist`，还是某个开发专用输出目录。

## 本地开发

来自根目录 `package.json` 的常用命令：

```bash
pnpm dev                 # 运行扩展开发预览
pnpm dev:server          # 运行服务端
pnpm build               # 构建扩展
pnpm build:server        # 构建服务端
pnpm build:all           # 构建所有 package
pnpm test                # 运行单元测试
pnpm test:integration    # 运行集成测试
pnpm lint                # lint 所有 package
pnpm check:i18n          # 检查扩展 i18n key 使用情况
```

也可以运行 package 级命令：

```bash
pnpm -F @bookmark-assistant/extension build
pnpm -F @bookmark-assistant/server prisma:generate
pnpm -F @bookmark-assistant/server prisma:migrate
```

根据 package metadata，运行环境要求：

- workspace 和 extension package 需要 Node.js 18+。
- server package 需要 Node.js 20.x。
- pnpm 9.x。
- 服务端需要 PostgreSQL。

## Notion 设置

自部署需要一个 Notion OAuth 集成，以及一个该集成可写入的 Notion database 或 data source。

大致步骤：

1. 创建 Notion integration。
2. 为你的 Chrome 扩展配置 OAuth redirect URI。
3. 将目标 Notion 数据库分享给该 integration。
4. 在服务端配置 Notion client ID 和 client secret。
5. 在扩展中配置服务端 URL 和 Notion client ID。

TODO: 确认并补充推荐的 Notion 数据库模板、必需属性和模板链接。

## 配置

扩展环境变量模板：

```bash
cp packages/extension/.env.example packages/extension/.env.local
```

重要扩展变量：

```text
VITE_OAUTH_SERVER_URL
VITE_NOTION_CLIENT_ID
VITE_SUPPORT_URL
VITE_DEBUG_MODE
VITE_APP_NAME
VITE_APP_VERSION
```

服务端环境变量模板：

```bash
cp packages/server/.env.example packages/server/.env.local
```

重要服务端变量：

```text
PORT
NODE_ENV
SELF_HOSTED
EDITION
ALLOWED_ORIGINS
JWT_SECRET
ALLOWED_EXTENSION_ID
NOTION_CLIENT_ID
NOTION_CLIENT_SECRET
NOTION_API_VERSION
DATABASE_URL
```

不要提交 `.env` 或 `.env.local` 文件。

## 路线图

开源方向：

- 更清晰的自部署流程。
- 更完善的 Notion 模板文档。
- 更可靠的本地开发文档。
- 截图和 demo 素材。
- 更聚焦的 extension-to-server 流程测试。

托管版 / Pro 方向：

- 托管 Notion OAuth。
- AI 自动标签。
- AI 摘要。
- 更智能的同步行为。
- 托管服务运维和支持。

## 限制

- 开源版本需要自部署服务端和 PostgreSQL 数据库。
- 自部署需要配置你自己的 Notion OAuth 集成。
- AI 自动标签和 AI 摘要不是当前开源仓库中的生产功能。
- 浏览器扩展行为受 Chrome Extension API 和 MV3 service worker 生命周期限制。
- 不同 Notion schema 可能需要调整属性映射。

## 贡献

欢迎提交符合开源范围的贡献。

请先阅读 [CONTRIBUTING.md](CONTRIBUTING.md)。

提交 PR 前，请运行相关检查：

```bash
pnpm lint
pnpm test
pnpm build
```

## 隐私与数据处理

自部署实例由部署者自行控制。不要提交 `.env` 文件、Notion 凭据、JWT secret 或导出的用户数据。书签和页面数据只会发送到扩展中配置的服务端 URL。

## 许可证

Bookmark Assistant 使用 [AGPL-3.0-or-later](LICENSE) 许可证开源。
