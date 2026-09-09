# LDC Shop

Virtual goods shop built with **Next.js 16**, **SQLite**, and **Shadcn UI**. The project supports local development and Docker self-hosting.

## Stack

- **Framework**: Next.js 16 App Router + TypeScript
- **Database**: SQLite (`better-sqlite3`)
- **ORM**: Drizzle ORM
- **Authentication**: Linux DO Connect, with optional GitHub OAuth
- **Payments**: EPay
- **UI**: Tailwind CSS + Shadcn UI + Framer Motion

## Local Development

Node.js 20 or newer is required.

```bash
git clone https://github.com/chatgptuk/ldc-shop.git
cd ldc-shop
npm ci
cp .env.example .env.local
npm run db:push
npm run dev
```

Edit `.env.local` with your credentials, then open <http://localhost:3000>. The default database file is `data/ldc-shop.sqlite`.

Common commands:

```bash
npm run dev       # local development
npm run build     # production build
npm run start     # start production server
npm run lint      # lint the project
npm run db:push   # synchronize the SQLite schema
```

## Docker Deployment

### Interactive setup

```bash
git clone https://github.com/chatgptuk/ldc-shop.git
cd ldc-shop
chmod +x setup.sh
./setup.sh
```

The script generates `.env` and `docker-compose.yml`, then builds and starts the container.

### Manual setup

```bash
cp .env.example .env
mkdir -p data
chmod 777 data
docker compose up -d --build
```

The container listens on port `3000`. SQLite is persisted at `./data/ldc-shop.sqlite`. For production, place Nginx or Caddy in front of the container and enable HTTPS.

Rebuild after source changes:

```bash
docker compose up -d --build
```

Stop the service:

```bash
docker compose down
```

### Prebuilt image

To use the published image directly:

```bash
mkdir ldc-shop && cd ldc-shop
curl -fsSL https://raw.githubusercontent.com/chatgptuk/ldc-shop/main/pull-setup.sh -o setup.sh
chmod +x setup.sh
./setup.sh
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `APP_URL` | Yes | Public site URL |
| `NEXT_PUBLIC_APP_URL` | Yes | Usually the same as `APP_URL` |
| `AUTH_TRUST_HOST` | Yes | Set to `true` when using a reverse proxy |
| `AUTH_SECRET` | Yes | NextAuth session encryption secret |
| `OAUTH_CLIENT_ID` | Yes | Linux DO Connect Client ID |
| `OAUTH_CLIENT_SECRET` | Yes | Linux DO Connect Client Secret |
| `MERCHANT_ID` | Yes | EPay merchant ID |
| `MERCHANT_KEY` | Yes | EPay merchant key |
| `PAY_URL` | No | Payment endpoint |
| `ADMIN_USERS` | Yes | Comma-separated admin usernames |
| `DATABASE_PATH` | No | SQLite file path |
| `CRON_INTERNAL_URL` | No | Cleanup endpoint, defaults to `http://127.0.0.1:3000` |
| `CRON_CLEANUP_TOKEN` | No | Cleanup endpoint token; defaults to the OAuth secret |
| `GITHUB_ID` | No | GitHub OAuth Client ID |
| `GITHUB_SECRET` | No | GitHub OAuth Client Secret |

Telegram, Bark, and email notifications can be configured in the admin panel.

## Backups

Back up the `data/` directory:

```bash
cp -r data data-backup-$(date +%Y%m%d)
```

Stop the container and back up the database before upgrades or migrations.

## License

MIT
