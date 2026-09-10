# LDC Shop

基于 **Next.js 16**、**SQLite/MySQL** 和 **Shadcn UI** 构建的虚拟商品商店，支持本地运行和 Docker 自托管部署。

## 技术架构

- **框架**: Next.js 16 App Router + TypeScript
- **数据库**: SQLite（`better-sqlite3`）或 MySQL 8（`mysql2`）
- **ORM**: Drizzle ORM
- **认证**: Linux DO Connect，可选 GitHub OAuth
- **支付**: EPay
- **界面**: Tailwind CSS + Shadcn UI + Framer Motion

## 本地运行

需要 Node.js 20 或更高版本。

```bash
git clone https://github.com/chatgptuk/ldc-shop.git
cd ldc-shop
npm ci
cp .env.example .env.local
npm run db:push
npm run dev
```

Windows PowerShell 可使用：

```powershell
Copy-Item .env.example .env.local
```

根据实际情况编辑 `.env.local`，然后访问 <http://localhost:3000>。数据库默认保存在 `data/ldc-shop.sqlite`。

常用命令：

```bash
npm run dev       # 本地开发
npm run build     # 构建生产版本
npm run start     # 启动生产版本
npm run lint      # 代码检查
npm run db:push   # 同步 SQLite 数据库结构
```

## Docker 部署

### 一键部署

```bash
git clone https://github.com/chatgptuk/ldc-shop.git
cd ldc-shop
chmod +x setup.sh
./setup.sh
```

脚本会交互式生成 `.env` 和 `docker-compose.yml`，并构建、启动容器。

### 手动部署

复制并编辑环境变量文件：

```bash
cp .env.example .env
mkdir -p data
chmod 777 data
docker compose up -d --build
```

容器监听 `3000` 端口，默认 SQLite 数据保存在 `./data/ldc-shop.sqlite`。生产环境建议使用 Nginx 或 Caddy 配置 HTTPS 反向代理。

如需使用 MySQL，在 `.env` 中设置：

```env
DB_TYPE=mysql
DATABASE_URL=mysql://ldc_shop:change_me@192.168.1.100:3306/ldc_shop
```

Docker Compose 不内置 MySQL 服务；请自行准备 MySQL 8 实例，并确保应用容器可以访问连接地址中的主机。配置完成后照常使用 `docker compose up -d --build` 启动应用。

更新源码后重新构建：

```bash
docker compose up -d --build
```

停止服务：

```bash
docker compose down
```

### 预构建镜像

如果需要直接拉取已发布镜像，可运行：

```bash
mkdir ldc-shop && cd ldc-shop
curl -fsSL https://raw.githubusercontent.com/chatgptuk/ldc-shop/main/pull-setup.sh -o setup.sh
chmod +x setup.sh
./setup.sh
```

## 环境变量

| 变量 | 必填 | 说明 |
|------|------|------|
| `APP_URL` | 是 | 站点外部访问地址 |
| `NEXT_PUBLIC_APP_URL` | 是 | 通常与 `APP_URL` 相同 |
| `AUTH_TRUST_HOST` | 是 | 反向代理部署时设为 `true` |
| `AUTH_SECRET` | 是 | NextAuth session 加密密钥 |
| `OAUTH_CLIENT_ID` | 是 | Linux DO Connect Client ID |
| `OAUTH_CLIENT_SECRET` | 是 | Linux DO Connect Client Secret |
| `MERCHANT_ID` | 是 | EPay 商户 ID |
| `MERCHANT_KEY` | 是 | EPay 商户密钥 |
| `PAY_URL` | 否 | 支付接口地址 |
| `ADMIN_USERS` | 是 | 管理员用户名，多个用逗号分隔 |
| `DATABASE_PATH` | 否 | SQLite 文件路径 |
| `DB_TYPE` | 否 | `sqlite`（默认）或 `mysql` |
| `DATABASE_URL` | MySQL 必填 | MySQL 连接地址 |
| `CRON_INTERNAL_URL` | 否 | 定时清理任务地址，默认 `http://127.0.0.1:3000` |
| `CRON_CLEANUP_TOKEN` | 否 | 定时清理接口令牌，默认使用 OAuth secret |
| `GITHUB_ID` | 否 | GitHub OAuth Client ID |
| `GITHUB_SECRET` | 否 | GitHub OAuth Client Secret |

Telegram、Bark 和邮件通知可在管理后台配置。

## 数据备份与迁移

直接备份 `data/` 目录即可：

```bash
cp -r data data-backup-$(date +%Y%m%d)
```

升级或迁移前建议先停止容器并备份数据库。

后台“数据管理”页面的 JSON 全量导出是跨数据库迁移包，可将 SQLite 数据导入 MySQL；旧版 SQLite SQL 备份也可以上传，系统会在 MySQL 模式下解析后转换写入。迁移前应先备份原数据库，并在导入期间停止新订单写入。

## License

MIT
