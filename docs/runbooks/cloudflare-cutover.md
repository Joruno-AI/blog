# Cloudflare 生产切换 Runbook

## 0. 前置条件

- 工作分支通过 lint、TypeScript、Next build、OpenNext Workers build、API 和浏览器回归。
- 生产 D1 中旧表行数与恢复数据一致：posts 550、categories 23、albums 55、songs 634、lyrics 355、media 638。
- Cloudflare API token 仅授予目标账户、D1、R2、Workers 和域名所需最小权限。

## 1. 冻结与备份

```bash
mkdir -p backups
npx wrangler d1 export blog-cms-db --remote \
  --output "backups/blog-cms-db-$(date +%Y%m%d-%H%M%S).sql"
```

记录旧站最近一次内容更新时间；短暂冻结 Studio 写入。备份文件不得提交到 Git。

## 2. 应用迁移

```bash
npx wrangler d1 migrations list blog-cms-db --remote
npx wrangler d1 migrations apply blog-cms-db --remote
pnpm db:verify:remote
```

验证脚本检查 24 项基线计数、逐行迁移覆盖和引用不变量：至少 550 个 article resources、55 个 album resources、634 个 track resources、16 个 photo resources、638 个 assets；所有旧记录均有新模型映射，且每个已发布 resource 都有 `published_revision_id` 与 canonical route。采用“至少”基线，避免后续新增内容导致 CI 误报。

## 3. 部署预览

```bash
pnpm cloudflare:build
pnpm exec opennextjs-cloudflare upload
```

将上传的 Worker version 导入预览流量，验证公开页、登录、Studio、CRUD、R2 上传、RSS、Sitemap、历史 URL redirect 和 404。

## 4. 生产切换

1. 先在 Worker 预览地址的 `/register` 注册站主账号。所有新账号固定为 `viewer`，随后通过 D1 将站主提升为管理员：

   ```bash
   npx wrangler d1 execute blog-cms-db --remote \
     --command "UPDATE user SET role='admin' WHERE email='OWNER_EMAIL';"
   ```

   再查询确认目标邮箱恰好一行且角色为 `admin`，并登录验证 `/studio` 返回 200。
2. 在 Worker 设置生产 Secrets：`BETTER_AUTH_SECRET`、`BETTER_AUTH_URL=https://wangshengliang.cn`、`CRON_SECRET`、`R2_PUBLIC_URL`。R2 通过 `R2_BUCKET` binding 访问，不配置 S3 API 凭据。
3. 使用 `pnpm cloudflare:deploy` 发布已验证的 Worker version。
4. 将 `wangshengliang.cn/*` 与 `www.wangshengliang.cn/*` 路由到统一 Worker。观察期保留 Pages 的代理 DNS 作为即时回滚源；Worker route 优先接管全部请求。`www` 在 Worker 入口统一 308 到主域，保留路径和查询参数。
5. 对关键 URL 做外部 HTTP 检查，确认无重定向环、Session Cookie 的 Secure/Domain 正确。
6. 恢复 Studio 写入。

## 5. 定时作业

`wrangler.toml` 每分钟触发 `custom-worker.ts` 的 `scheduled()` handler；handler 通过 Worker 自绑定调用 `POST /api/jobs/run` 并携带 `Authorization: Bearer <CRON_SECRET>`。上线前分别验证缺少/错误 Secret 返回 401、本地 `/cdn-cgi/handler/scheduled?format=json` 成功，且 `platform_jobs` 产生完整记录。

## 6. 观察与回滚

至少保留旧 Pages 部署、上一个 Worker version 和旧表 14 天。若出现数据、认证或路由故障：先把流量回滚到已验证的 Worker version；需要回切旧站时，从 Worker 配置移除两条生产 route 并重新部署，原 Pages DNS 会立即继续承接流量。再从备份恢复到新的 D1 实例进行分析。

## 7. 2026-08-29 切换记录

- 正式 Worker version：`45397370-085a-4b69-8497-31f8ddef8418`。
- 正式入口：`https://wangshengliang.cn`；`www` 保留路径与查询参数并 308 到主域。
- `workers.dev` 与 preview URLs 已关闭，避免测试入口被误当作正式入口。
- 切换前 D1 备份：`backups/blog-cms-db-pre-platform-20260829-041902.sql`；SHA-256：`081393c7c4e0313a2088ce5ce939c332e7fc50d8ce23612388b7f177429aa676`。
- 生产验收通过：24 项迁移不变量、公开页面/动态详情/404、未授权 API、站主 admin 会话、Studio、管理 API、R2 上传/公开读取/清理、每分钟 Cron 作业。

### C 端回切

需求校准后确认 C 端必须与原 Astro 版本保持视觉和功能等价。生产域名已移除统一 Worker routes，继续由原 Astro Pages 承载；Next.js Worker 重新启用 `workers.dev` preview，仅用于完成等价迁移与验收。再次切换前必须满足 `docs/requirements/astro-parity.md` 的全部门槛。
