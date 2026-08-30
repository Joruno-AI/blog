# Astro C 端等价迁移契约

## 目标

本工程只改变实现与维护方式，不重设计访客端：

- 单一 Next.js App Router 工程同时承载 C 端、`/studio` CMS 与 API。
- `blog` Astro 工程及其线上 Pages 部署是 C 端唯一的视觉、路由、内容与交互基准。
- CMS 使用独立的 HeroUI 设计系统；其 CSS、组件与信息架构不得改变 C 端。
- 不迁移或保留产品、付费内容、会员权益等新增业务能力。

## 内容主权

1. 首次及按需从 GitHub Astro 仓库导入 Markdown、MDX、JSON、图片和其他媒体。
2. 导入完成后，Cloudflare D1/R2 与 CMS 是生产内容主库。
3. 提供 D1/R2 到 GitHub 兼容 Markdown/JSON 的导出能力，用于版本化备份。
4. 同步使用稳定源标识和内容哈希，重复执行必须幂等；冲突不得静默覆盖 CMS 中更新的内容。

## 必须等价迁移的公开路由

- `/`
- `/404`
- `/blog`、`/blog/[...slug]`
- `/docs`、`/docs/read`、`/docs/course/[id]`、`/docs/catalog.json`
- `/projects`
- `/photos`、`/photos/photos.[hash].json`
- `/shorts`、`/shorts/[...slug]`
- `/music`、`/music/data.json`、`/music/lyrics/[album].json`
- `/streams`
- `/agent`、`/agent/[...id]`
- `/agent/about`、`/agent/all`、`/agent/analyzer`、`/agent/compare`
- `/agent/masters`、`/agent/repository`、`/agent/trending`
- `/agent/scenes`、`/agent/scenes/[slug]`、`/agent/suggest-index.json`
- `/changelog`、`/changelog/[slug]`
- `/feeds`、`/prs`、`/releases`
- `/rss.xml`、`/search-index.json`
- `/robots.txt`、`/sitemap-index.xml`、`/sitemap-0.xml`
- `/og-images/[...slug].png`
- `/giscus/[theme].css`
- `/app.webmanifest`

迁移时还必须保留 Astro 已生成的尾斜杠兼容、历史 slug、内部链接和 canonical 行为。

## 必须等价迁移的体验

- Header、导航、Logo、图标顺序、Footer、桌面侧栏与移动控制区。
- Light/Dark 主题、主题持久化及跟随系统设置。
- 全局排版、宽度、留白、断点、颜色、边框、背景与动画。
- 博客分类/标签过滤、文章元数据、封面、目录、阅读进度和文章操作。
- 搜索、键盘快捷键、RSS、返回顶部、图片查看器与轮播。
- Music 的专辑浏览、黑胶视觉、歌词、播放队列、全局播放器和播放状态。
- Photos、Projects、Docs、Shorts、Streams、Changelog、PRs、Releases。
- Agent 技能目录、筛选、详情、场景、依赖图、分析和比较工具。
- Markdown/MDX 渲染、代码块、数学公式、callout、外链及 Giscus 主题。
- SEO metadata、Open Graph 图片、robots、sitemap、manifest 与 404。

## 验收门槛

正式域名切换前，必须同时满足：

1. 路由清单逐项通过 HTTP 状态、重定向和内容契约测试。
2. GitHub 源内容与 D1/R2 导入数量、slug、分类、标签、媒体和引用完整性一致。
3. Astro Pages 与 Next.js Preview 在桌面和移动断点逐页截图对比。
4. Light/Dark、首屏、长页、空状态、错误状态及交互状态均有视觉样本。
5. 搜索、音乐播放、歌词、目录、过滤、图片查看等功能具有浏览器回归测试。
6. `/studio` 的 HeroUI 样式不得出现在任何公开页面的 CSS 依赖链中。
7. 原 Astro Pages 保持生产流量，直到上述门槛全部通过并获得切换确认。
8. 所有迁移修复只能提交到独立审查分支；用户明确完成视觉验收前，不得合并或直接推送到 `main`。

## 明确排除

- 产品目录、购买、支付。
- `product_items`、`entitlements` 及会员付费访问。
- 为“个人数字产品平台”新增的 C 端首页、导航或视觉语言。
- 未经确认的新公开栏目或对原 Astro 信息架构的改造。
- 过渡架构曾暴露但 Astro 不存在的 `/knowledge`、`/tools`、`/search`、
  `/music/albums/[slug]`、`/projects/[...slug]`、`/docs/[...slug]` 页面。
