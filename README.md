# 拾光小阁 · 内容仓

Shirone 主题的内容与配置仓库（内容分离 / 双仓模式）。

- 文章：`content/posts/`
- 页面正文：`content/spec/`
- 说说：`content/moments/`
- 结构化数据：`data/`
- 站点配置覆盖：`config/*.yaml`（只需写要改的键）
- 静态资源：`public/`（原样发布）、`assets/`（构建期压缩）

代码仓：`~/Shirone-blog`，本地通过 `.env` 的 `CONTENT_DIR` 指向本目录。
