# API

NestJS REST API. It runs on port `5000` by default.

## Requirements

- Node.js 24 LTS
- Bun 1.3.14

## Local development

```bash
bun install
cp .env.example .env
bun run dev
```

Available endpoints:

- Health: <http://localhost:5000/api/v1/health>
- Swagger UI: <http://localhost:5000/docs>
- OpenAPI JSON: <http://localhost:5000/docs-json>

## Commands

```bash
bun run dev          # start in watch mode
bun run build        # compile the application
bun run start        # run the compiled application with Node.js
bun run lint         # lint with Biome
bun run format       # format with Biome
bun run typecheck    # TypeScript validation
bun run test:smoke   # health and OpenAPI smoke tests
bun run check        # all checks and production build
```

## Configuration

| Variable | Default | Description |
| --- | --- | --- |
| `NODE_ENV` | `development` | Runtime environment |
| `PORT` | `5000` | HTTP port |
| `WEB_ORIGIN` | `http://localhost:3000` | Allowed frontend origin |
| `SWAGGER_ENABLED` | `true` | Expose Swagger UI and OpenAPI JSON |
"# for-upload-backend" 
