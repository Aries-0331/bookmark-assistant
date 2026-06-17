<p align="center">
  <img src="packages/extension/src/assets/logo_128x128.png" alt="Bookmark Assistant logo" width="96" height="96" />
</p>

<h1 align="center">Bookmark Assistant</h1>

<p align="center">
  将浏览器中保存的链接同步到 Notion。
</p>

<p align="center">
  <a href="README.md">English</a> · <a href="README.zh-CN.md">简体中文</a>
</p>

<p align="center">
  <a href="LICENSE"><img alt="License: AGPL-3.0-or-later" src="https://img.shields.io/badge/license-AGPL--3.0--or--later-blue.svg" /></a>
  <a href="https://chromewebstore.google.com/detail/khffaaemphidjmhokafmiilkcjpgiije?utm_source=item-share-cb"><img alt="Chrome Web Store" src="https://img.shields.io/badge/Chrome%20Web%20Store-available-16a34a.svg" /></a>
</p>

---

Bookmark Assistant 是一个浏览器扩展，用于把浏览器中保存的链接整理到 Notion 数据库。它可以同步 Chrome 书签和 Reading List 条目，也可以从弹窗保存当前页面，或从浏览器右键菜单保存链接。

免费自托管版本本身应当是可用的：你可以从源码构建扩展，自行运行服务端，连接自己的 Notion 集成，并将已保存链接数据同步到你控制的基础设施中。

Bookmark Assistant Pro 是面向托管 Notion OAuth 和托管自动化的版本。这个公开仓库不包含支付逻辑、托管服务密钥、商业 OAuth 基础设施或生产 AI 后端内部实现。

## 当前功能

- 将 Chrome 书签同步到 Notion。
- 将 Chrome Reading List 条目同步到 Notion。
- 从扩展弹窗保存当前页面。
- 从浏览器右键菜单保存链接。
- 在可用时提取页面标题和描述。
- 通过 sync ID 和 URL 匹配，避免重复创建已有 Notion 页面。
- 将同步状态存储在 Chrome storage 中，并同步更新 popup / options UI。
- 使用 PostgreSQL 和 Prisma 自部署服务端。

## 范围

Bookmark Assistant 聚焦于书签、Reading List 条目、已保存页面和链接元数据。它是面向 Notion 的链接采集工具，不是完整 Web Clipper、笔记应用，也不是 Notion、Obsidian 或 LiteContext 的替代品。

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

## 本地开发

来自根目录 `package.json` 的常用命令：

```bash
pnpm dev                 # 运行扩展开发预览
pnpm dev:server          # 运行服务端
pnpm build               # 构建扩展
pnpm build:zip           # 构建可发布扩展 zip
pnpm build:server        # 构建服务端
pnpm build:all           # 构建所有 package
pnpm test                # 运行单元测试
pnpm test:integration    # 运行集成测试
pnpm lint                # lint 所有 package
pnpm check:i18n          # 检查扩展 i18n key 使用情况
```

根据 package metadata，运行环境要求：

- workspace 和 extension package 需要 Node.js 18+。
- server package 需要 Node.js 20.x。
- pnpm 9.x。
- 服务端需要 PostgreSQL。

## 配置

扩展环境变量模板：

```bash
cp packages/extension/.env.example packages/extension/.env.local
```

服务端环境变量模板：

```bash
cp packages/server/.env.example packages/server/.env.local
```

不要提交 `.env` 或 `.env.local` 文件。

## 贡献

欢迎提交符合公开仓库范围的贡献。

请先阅读 [CONTRIBUTING.md](CONTRIBUTING.md)。

提交 PR 前，请运行相关检查：

```bash
pnpm lint
pnpm test
pnpm build
```

## 隐私与数据处理

自部署实例由部署者自行控制。不要提交 `.env` 文件、Notion 凭据、JWT secret 或导出的用户数据。书签、Reading List 和已保存页面数据只会发送到扩展中配置的服务端 URL。

## 许可证

Bookmark Assistant 使用 [AGPL-3.0-or-later](LICENSE) 许可证开源。
