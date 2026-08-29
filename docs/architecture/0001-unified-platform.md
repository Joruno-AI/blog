# ADR-0001：统一 Next.js 个人数字产品平台

- 状态：Accepted
- 日期：2026-08-29

## 决策

公开站点与 Studio 合并为一个 Next.js App Router 应用。采用“模块化单体”，而不是先拆微服务：UI、认证、内容发布、搜索和产品授权共享一个部署单元，但业务代码按 `modules/<domain>` 保持清晰边界。

## 为什么不是继续维护前后台两个系统

双系统会复制路由、内容 DTO、缓存与部署流程，并要求 webhook 或构建任务维持一致性。内容类型增多后，同步成本会高于独立部署带来的收益。统一应用允许一次发布事务同时更新 revision、canonical route、redirect、搜索投影和审计事件。

## 核心模型

- `resources`：身份、类型、当前/已发布 revision 指针、状态和 canonical path。
- `resource_revisions`：不可变内容快照。
- `resource_routes` / `redirects`：稳定 URL 与历史地址。
- `assets`：R2 对象的权威元数据。
- 扩展表：`articles`、`documents`、`resource_albums`、`tracks`、`products`。
- 关系表：分类、标签、资源关系、集合项、产品项、授权。
- `publication_events`：内容生命周期审计。
- `resource_search`：只包含已发布 revision 的 FTS 投影。

## 一致性规则

1. Studio 读取 `current_revision_id`；公开站点读取 `published_revision_id`。
2. 编辑已发布内容只产生草稿 revision，不改变线上内容。
3. 发布时原子更新公开指针、canonical route 和 redirect，再同步搜索投影。
4. 大文件只进 R2；D1 revision 限制在 1.8 MB 以下。
5. 被内容引用的 Asset 不允许删除。
6. 旧表在观察期内只读保留，不再作为运行时写入目标。

## Cloudflare 边界

- D1：关系数据、revision、授权、作业状态、搜索索引。
- R2：图片、音频、视频、文档和派生文件。
- Workers/OpenNext：Next.js 运行时、认证、API、重定向。
- Durable Objects/Queues：只有实时协作、长任务或串行协调出现明确需求时再引入。

## 部署适配器

统一应用使用 `@opennextjs/cloudflare` 运行在 Cloudflare Workers。这取代了已弃用的 `@cloudflare/next-on-pages`，允许 Next.js 使用完整 Node.js runtime，也避免把全站锁定在 Edge runtime。middleware 仍在渲染前解析 D1 资源路径，让缺失与无权资源统一返回不可枚举的 404。vinext 目前保持为后续独立兼容性评估，不与本次数据切换绑定。

## 后果

优点：单一内容真相、同源认证、无需跨站同步、统一搜索/授权/审计。代价：应用部署耦合更高，必须依靠模块边界、迁移纪律、预览部署和自动回归测试控制风险。
