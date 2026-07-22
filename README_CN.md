# PourMed

PourMed 是一个基于 Cloudflare Workers 的隐私优先服药提醒 PWA。

这是一个自托管的单用户应用。每位用户都必须在自己的 Cloudflare 账户和 `workers.dev` 子域名中部署独立实例。

## 功能

- 可配置的服药提醒和稍后提醒
- Web Push 与 iPhone 主屏幕通知
- 可安装的主屏幕 PWA
- 离线应用外壳
- 服药历史与备注
- 依从率统计与连续完成天数
- 每日及单项药物完成状态
- 安全访问令牌
- Cloudflare 自托管部署

## 架构

应用由 Cloudflare Worker、SQLite Durable Object、Service Worker 和 Web Push 组成。Service Worker 不缓存私有 `/api/` 响应。项目不包含分析、广告、第三方运行时脚本或位置追踪。

## 安装

需要 Node.js 22+、pnpm、Git 和您自己的 Cloudflare 账户。

```sh
git clone https://github.com/your-account/PourMed.git
cd PourMed
pnpm install
pnpm wrangler login
pnpm wrangler whoami
pnpm secrets:generate
pnpm verify
pnpm exec wrangler deploy --secrets-file secrets/wrangler-secrets.env
```

部署前，请在本机编辑 `secrets/wrangler-secrets.env`，添加类似 `VAPID_SUBJECT=mailto:you@example.com` 的联系方式。此文件已被 Git 忽略，绝不能提交。部署完成后，在您自己的地址（例如 `https://your-project.workers.dev`）打开应用。然后在本机打开 `secrets/access-token.txt`，将令牌复制到 PourMed。不要把令牌粘贴到问题、日志、聊天或源文件中。

完整步骤、通知设置和验证方法见[部署指南](docs/DEPLOYMENT.md)。本地开发与测试见[测试说明](docs/TESTING.md)。

## 隐私与安全

服药历史、设置和推送订阅只保存在每位用户自己的 Cloudflare 部署中。设备在本地保存访问令牌，Worker Secret 仅保存令牌的 SHA-256 校验值。每位用户拥有并控制自己的数据、账户、部署和密钥。

> **绝不要提交令牌或密钥。** 不要把 `.dev.vars`、`secrets/`、访问令牌、VAPID 私钥、Cloudflare 凭据或数据库文件加入版本控制。

PourMed 是个人提醒工具，不提供医疗建议，也不是医疗器械。推送通知属于尽力而为；如服药状态不确定，请向医生或药剂师确认。

采用 [MIT License](LICENSE)。
