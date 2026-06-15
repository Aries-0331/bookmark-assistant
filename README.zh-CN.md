<p align="center">
  <img src="packages/website/public/brand/logo_128x128.png" alt="Bookmark Assistant logo" width="96" height="96" />
</p>

<h1 align="center">Bookmark Assistant</h1>

<p align="center">
  将 Chrome 书签和 Reading List 同步到 Notion。
</p>

<p align="center">
  <a href="README.md">English</a> · <a href="README.zh-CN.md">简体中文</a>
</p>

<p align="center">
  <a href="LICENSE"><img alt="License: AGPL-3.0-or-later" src="https://img.shields.io/badge/license-AGPL--3.0--or--later-blue.svg" /></a>
  <a href="SELF_HOSTING.md"><img alt="Self-hostable" src="https://img.shields.io/badge/self--hostable-yes-111827.svg" /></a>
  <a href="https://chromewebstore.google.com/detail/khffaaemphidjmhokafmiilkcjpgiije?utm_source=item-share-cb"><img alt="Chrome Web Store" src="https://img.shields.io/badge/Chrome%20Web%20Store-available-16a34a.svg" /></a>
</p>

---

Bookmark Assistant 是一个开源 Chrome 扩展，用于将浏览器书签整理同步到 Notion。它支持同步 Chrome 书签、Reading List，以及从弹窗中保存当前页面，并尽可能补充页面标题、描述等元数据。

本项目支持自部署。你可以使用自己的 Notion 集成、数据库和服务器运行开源版本。官方托管服务与 Chrome Web Store 商店版本属于独立的托管产品。

## 功能特性

- 将 Chrome 书签同步到 Notion。
- 同步 Chrome Reading List。
- 从扩展弹窗保存当前页面。
- 从浏览器右键菜单保存链接。
- 在可用时提取页面标题和描述。
- 支持从源码自部署扩展与服务端。

## 项目结构

```text
packages/
  extension/   Chrome MV3 扩展
  server/      OAuth 与同步 API
  website/     官方网站
  shared/      共享品牌与 UI 资源
```

## 快速开始

自部署说明见 [SELF_HOSTING.md](SELF_HOSTING.md)。

贡献指南见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 开源模式

Bookmark Assistant 使用 [AGPL-3.0-or-later](LICENSE) 许可证开源。

Bookmark Assistant 的名称、Logo、Chrome Web Store 商店 listing、域名和官方托管服务品牌标识均为保留资产。详见 [TRADEMARKS.md](TRADEMARKS.md)。
