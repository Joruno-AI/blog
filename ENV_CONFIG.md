# 环境变量配置

平台运行时只使用 Cloudflare D1 与 R2，不依赖 Turso 或跨系统内容 API。D1 通过 `wrangler.toml` 中的 `DB` binding 注入。

## 必需 Secrets

```dotenv
BETTER_AUTH_SECRET=<至少 32 字节的随机值>
BETTER_AUTH_URL=https://wangshengliang.cn
CRON_SECRET=<独立的定时作业密钥>
```

`BETTER_AUTH_SECRET` 与 `CRON_SECRET` 必须不同，并且只保存在 Cloudflare Workers Secrets。

## R2

```dotenv
R2_PUBLIC_URL=https://media.example.com
```

运行时通过 `wrangler.toml` 中的 `R2_BUCKET` binding 直接访问 `blog-cms-media`，不再保存 S3 API 凭据。`R2_PUBLIC_URL` 使用该 Bucket 已绑定的媒体域名。

## 本地与生产

- 本地 Next.js：复制 `.env.example` 为 `.env.local`。
- 本地 Workers 预览：在已忽略的 `.dev.vars` 配置 Secret。
- 生产：在 Cloudflare Dashboard 的 Worker 中配置同名 Secret，不提交任何真实值。

完整切换、备份、迁移和回滚步骤见 `docs/runbooks/cloudflare-cutover.md`。
