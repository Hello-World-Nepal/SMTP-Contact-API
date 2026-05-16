# smtp-contact-api

A lightweight, self-hosted Express API that forwards contact form submissions to any email address via SMTP. Drop-in replacement for Formspree or similar services — no third-party accounts, no usage limits, full control.

## Features

- `POST /api/contact` — accepts form data, sends email via SMTP
- `GET /health` — health check endpoint
- Input validation with [Zod](https://zod.dev)
- Rate limiting (5 contact requests / 10 min per IP)
- CORS origin allowlist
- TypeScript throughout
- Works with any SMTP provider (MXroute, Postfix, Gmail, etc.)

## Quick Start

### 1. Install dependencies

```bash
cd smtp-contact-api
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your SMTP credentials:

```env
SMTP_HOST=mail.yourdomain.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=contact@yourdomain.com
SMTP_PASS=your_password
CONTACT_RECIPIENT=contact@yourdomain.com
FROM_NAME=Contact Form
PORT=3001
ALLOWED_ORIGINS=https://yourdomain.com
```

### 3. Run

```bash
# Development (hot reload)
npm run dev

# Production
npm run build && npm start
```

## API

### `POST /api/contact`

**Request body (JSON):**

| Field     | Type   | Required | Description                    |
|-----------|--------|----------|--------------------------------|
| `name`    | string | yes      | Sender's full name             |
| `email`   | string | yes      | Sender's email (used as Reply-To) |
| `subject` | string | no       | Topic / subject line           |
| `message` | string | yes      | Message body (max 5000 chars)  |

**Success response:**
```json
{ "ok": true }
```

**Error response:**
```json
{ "error": "Description of what went wrong" }
```

### `GET /health`

```json
{ "status": "ok", "timestamp": "2025-01-01T00:00:00.000Z" }
```

## Deploying with Docker

This service is orchestrated via the root `docker-compose.yml` alongside Nginx. Run from the repo root:

```bash
cp smtp-contact-api/.env.example smtp-contact-api/.env   # fill in SMTP credentials
docker compose up -d
```

```bash
docker compose logs -f smtp-contact-api   # tail logs
docker compose down                       # stop all
docker compose up -d --build              # rebuild after code changes
```

---

## Deploying on your own server (without Docker)

### With PM2

```bash
npm run build
pm2 start dist/index.js --name smtp-contact-api
pm2 save
```

### With systemd

Create `/etc/systemd/system/smtp-contact-api.service`:

```ini
[Unit]
Description=smtp-contact-api
After=network.target

[Service]
WorkingDirectory=/path/to/smtp-contact-api
ExecStart=/usr/bin/node dist/index.js
Restart=always
EnvironmentFile=/path/to/smtp-contact-api/.env
User=www-data

[Install]
WantedBy=multi-user.target
```

```bash
npm run build
systemctl enable --now smtp-contact-api
```

### Reverse proxy with Nginx

```nginx
location /api/contact {
    proxy_pass http://127.0.0.1:3001;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header Host $host;
}
```

## Connecting your frontend

Point your form's fetch call at this service:

```ts
const res = await fetch('https://yourserver.com/api/contact', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name, email, subject, message }),
})
const data = await res.json()
if (!res.ok) throw new Error(data.error)
```

## Environment Variables

| Variable             | Required | Default        | Description                                         |
|----------------------|----------|----------------|-----------------------------------------------------|
| `SMTP_HOST`          | yes      | —              | SMTP server hostname                                |
| `SMTP_PORT`          | no       | `587`          | SMTP port (587 = STARTTLS, 465 = SSL)               |
| `SMTP_SECURE`        | no       | `false`        | Set `true` only for port 465                        |
| `SMTP_USER`          | yes      | —              | SMTP username / sending address                     |
| `SMTP_PASS`          | yes      | —              | SMTP password                                       |
| `CONTACT_RECIPIENT`  | yes      | —              | Email address that receives form submissions        |
| `FROM_NAME`          | no       | `Contact Form` | Display name in the From header                     |
| `PORT`               | no       | `3001`         | Port the API listens on                             |
| `ALLOWED_ORIGINS`    | no       | `http://localhost:3000` | Comma-separated allowed CORS origins, or `*` |

## License

MIT
