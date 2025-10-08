# Inmo Assistant API

NestJS service that bridges WhatsApp Cloud API, BullMQ workers, and the xAI Grok 4 Fast model.

## Prerequisites
- Node.js 20+ and npm
- Redis (local instance or managed service)
- WhatsApp Cloud API credentials
- xAI API key

## Environment
Copy `.env.example` to `.env` and update the secrets:

```bash
cp .env.example .env
```

Key variables:
- `WHATSAPP_VERIFY_TOKEN` must match the token configured in the Meta App.
- `WHATSAPP_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID` are used to send outbound messages.
- `APP_SECRET` is the Meta App secret used to validate `X-Hub-Signature-256`.
- `REDIS_URL` points BullMQ to your Redis instance.
- `XAI_API_KEY` authenticates with xAI.

## Local Development
Install dependencies and start the API in watch mode:

```bash
npm install
npm run start:dev
```

The server listens on `http://localhost:3000` by default. Healthcheck is available at `GET /health`.

### WhatsApp Webhook Verification
Expose the server via a tunnel (e.g. ngrok), then configure the webhook in Meta with the public URL. Meta will hit:

```
GET https://<public-host>/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=<token>&hub.challenge=<random>
```

If the token matches `WHATSAPP_VERIFY_TOKEN`, the API echoes the `hub.challenge` string with status `200`.

### Enqueue WhatsApp Messages
Anywhere inside the NestJS context you can inject `InjectQueue('outbox')`. For scripts, import the queue helper:

```ts
import { enqueueOutboxText } from './src/queues/outbox.queue';

await enqueueOutboxText({ to: '<E164>', body: 'Mensaje de prueba' });
```

Jobs are processed by BullMQ and forwarded to the WhatsApp Cloud API.

Run the worker alongside the API in development:

```bash
# First terminal
npm run start:dev

# Second terminal
npm run worker:dev
```

## Docker
The root `docker-compose.yml` provides Postgres, Redis, the API, and the queue worker. From the repository root run:

```bash
docker compose up --build
```

Healthchecks gate start-up via `depends_on: service_healthy`. Environment variables are pulled from `.env`. When running with Docker, expose the webhook port and keep Redis reachable.

## Linting & Build

```bash
npm run lint
npm run build
npm test
```

## Pruebas en local (simulador)

```bash
npm i
cp .env.example .env     # y rellena LLM_* y CANONICAL_CSV_PATH
npm run simulate         # escribe mensajes y prueba intents: "pásame fotos del 123", "alquilo piso en Granada centro por menos de 900", etc.
```
