# Deployment Guide

## Deployment Options

### Cloudflare Pages

**Cloudflare Pages is NOT suitable for this MCP server.**

| Limitation | Reason |
|------------|--------|
| Static hosting only | Pages deploys pre-built static files, not running services |
| No stdio transport | MCP requires stdio which Pages doesn't support |
| No long-running processes | Pages is designed for HTTP request/response |

**What works on Cloudflare:**
- Use Cloudflare **Workers** with a custom HTTP→stdio bridge (complex)
- Use Cloudflare **Tunnel** (Warp) to expose a server running elsewhere

### Alternative: Traditional VPS/Containers

The MCP server runs anywhere Node.js runs:

```bash
# Simple deployment
git clone https://github.com/security-alliance/frameworks
cd frameworks
pnpm install
pnpm run build
pnpm run index:build -- --branch main --sha $(git rev-parse HEAD)

# Run
INDEX_DIR=./indexes node apps/frameworks-mcp/dist/index.js
```

## Recommended Platforms

### Railway (Simplest)

1. Connect your GitHub repo
2. Set build command: `pnpm install && pnpm run build`
3. Set start command: `pnpm run index:build -- --branch main --sha $COMMIT_SHA && node apps/frameworks-mcp/dist/index.js`
4. Add environment variables (see below)
5. Mount a persistent volume for `/app/indexes`

### Render

1. Create Web Service
2. Connect GitHub repo
3. Build command: `pnpm install && pnpm run build`
4. Start command: `pnpm run index:build -- --branch main --sha $COMMIT_SHA && node apps/frameworks-mcp/dist/index.js`
5. Plan: Free tier works for development

### Fly.io

```bash
# Create app
fly launch

# Create volume for indexes
fly volumes create indexes --size 1

# Deploy
fly deploy
```

### Docker

```dockerfile
FROM node:20-slim
WORKDIR /app

RUN npm install -g pnpm@10

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages packages
COPY apps apps

RUN pnpm install --frozen-lockfile
RUN pnpm run build

ENV INDEX_DIR=/app/indexes
CMD ["sh", "-c", "curl -L $(gh release view index-main --json assets --jq '.assets[0].browser_download_url') -o /app/indexes/main-index.json && node apps/frameworks-mcp/dist/index.js"]
```

Build and run:
```bash
docker build -t frameworks-mcp .
docker run -p 3000:3000 -v $(pwd)/indexes:/app/indexes frameworks-mcp
```

## Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frameworks-mcp
spec:
  replicas: 2
  selector:
    matchLabels:
      app: frameworks-mcp
  template:
    metadata:
      labels:
        app: frameworks-mcp
    spec:
      containers:
        - name: mcp
          image: frameworks-mcp:latest
          ports:
            - containerPort: 3000
          env:
            - name: INDEX_DIR
              value: "/data"
            - name: RATE_LIMIT
              value: "100"
            - name: API_KEY
              valueFrom:
                secretKeyRef:
                  name: mcp-secrets
                  key: api-key
            - name: CORS_ORIGINS
              value: "https://your-domain.com"
            - name: LOG_LEVEL
              value: "info"
          volumeMounts:
            - name: indexes
              mountPath: /data
      volumes:
        - name: indexes
          persistentVolumeClaim:
            claimName: frameworks-indexes
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: frameworks-indexes
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 1Gi
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `INDEX_DIR` | `./indexes` | Directory containing index JSON files |
| `HTTP_PORT` | `3000` | Port for HTTP server |
| `RATE_LIMIT` | `100` | Max requests per minute per client |
| `API_KEY` | (none) | Bearer token for authentication. When set, all HTTP requests require `Authorization: Bearer <API_KEY>`. When unset, server runs unauthenticated (for local/dev use). |
| `CORS_ORIGINS` | `*` | Allowed origins for CORS. Set to a specific domain for production (e.g., `https://your-domain.com`). |
| `LOG_LEVEL` | `info` | Logging level: debug, info, warn, error |

## Security Configuration

### Authentication

For production deployments, set the `API_KEY` environment variable:

```bash
# Generate a strong API key
API_KEY=$(openssl rand -hex 32)

# Set it as an environment variable
export API_KEY="$API_KEY"
```

Clients must include this header:
```
Authorization: Bearer <your-api-key>
```

### CORS

For production, restrict allowed origins:

```bash
export CORS_ORIGINS="https://your-domain.com"
```

### Rate Limiting

Default is 100 requests/minute per client. Adjust as needed:

```bash
export RATE_LIMIT="200"
```

## Health Check

```bash
curl http://localhost:3000/health
```

## Index Updates

Indexes are built automatically by GitHub Actions. To update manually:

```bash
# Download from GitHub Releases
gh release download index-main --pattern "*.json" -D indexes/
gh release download index-develop --pattern "*.json" -D indexes/

# Or rebuild locally
git pull
pnpm run index:build -- --branch main --sha $(git rev-parse HEAD)
```

## Production Checklist

- [x] Set `API_KEY` environment variable for authentication
- [x] Configure `CORS_ORIGINS` to restrict allowed origins
- [x] Use HTTPS endpoint (not plain HTTP)
- [x] Set up monitoring/logging
- [x] Configure auto-restart
- [x] Set up index update automation
- [x] Rate limiting is enabled by default (100/min)
- [x] Request body size is limited to 1MB
- [x] Security headers are applied automatically
- [x] Error messages are sanitized when API_KEY is set