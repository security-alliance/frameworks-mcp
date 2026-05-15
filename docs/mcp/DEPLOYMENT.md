# Deployment Guide

## Deployment Options

There are two transport modes:

| Mode | Entry Point | Use Case |
|------|-------------|----------|
| **Stdio** | `dist/index.js` | Local CLI, Claude Desktop, opencode, VS Code extensions |
| **HTTP** | `dist/http-server.js` | Remote access, OpenAI Agents SDK, web integrations |

For **stdio mode**, no special deployment is needed -- the MCP client launches the server process directly.

For **HTTP mode**, deploy to any platform that runs Node.js:

### Railway

1. Connect your GitHub repo
2. Set build command: `pnpm install && pnpm run build`
3. Set start command: `pnpm run index:build -- --branch main --sha $COMMIT_SHA && node apps/frameworks-mcp/dist/http-server.js`
4. Add environment variables (see below)
5. Mount a persistent volume for `/app/indexes`

### Render

1. Create Web Service
2. Connect GitHub repo
3. Build command: `pnpm install && pnpm run build`
4. Start command: `pnpm run index:build -- --branch main --sha $COMMIT_SHA && node apps/frameworks-mcp/dist/http-server.js`
5. Plan: Free tier works for development

### Fly.io

```bash
fly launch
fly volumes create indexes --size 1
fly deploy
```

### Docker

```dockerfile
FROM node:20-slim
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages packages
COPY apps apps

RUN pnpm install --frozen-lockfile
RUN pnpm run build

ENV INDEX_DIR=/app/indexes
ENV HTTP_PORT=3000

EXPOSE 3000

CMD ["node", "apps/frameworks-mcp/dist/http-server.js"]
```

Build and run:
```bash
docker build -t frameworks-mcp .
docker run -p 3000:3000 \
  -e API_KEY=$(openssl rand -hex 32) \
  -v $(pwd)/indexes:/app/indexes \
  frameworks-mcp
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
            - name: HTTP_PORT
              value: "3000"
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
          livenessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 30
          readinessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 3
            periodSeconds: 10
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
| `INDEX_DIR` | `./indexes` (stdio walks up to find it; HTTP uses `process.cwd()/indexes`) | Directory containing index JSON files |
| `HTTP_PORT` | `3000` | Port for HTTP server (stdio transport ignores this) |
| `RATE_LIMIT` | `100` | Max requests per minute per client (HTTP) or globally (stdio) |
| `API_KEY` | (none) | Bearer token for HTTP authentication. When set, all tool endpoints require `Authorization: Bearer <API_KEY>`. When unset, server runs unauthenticated. `/health` is always public. |
| `CORS_ORIGINS` | (unset, sends `*`) | Allowed origins for CORS. Set to a specific domain for production (e.g., `https://your-domain.com`). When unset, `Access-Control-Allow-Origin: *` is sent. |
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

Clients must include this header on tool endpoints (not required for `/health`):
```
Authorization: Bearer <your-api-key>
```

### CORS

For production, restrict allowed origins:

```bash
export CORS_ORIGINS="https://your-domain.com"
```

When `CORS_ORIGINS` is unset, the server sends `Access-Control-Allow-Origin: *`.

### Rate Limiting

Default is 100 requests/minute per client (HTTP) or globally (stdio). Adjust as needed:

```bash
export RATE_LIMIT="200"
```

## Health Check

```bash
curl http://localhost:3000/health
# Returns: {"status":"ok","server":"frameworks-mcp"}
```

## Index Updates

Indexes are built automatically by GitHub Actions. To update manually:

```bash
# Download from GitHub Releases
gh release download index-main --pattern "*.json" -D indexes/
gh release download index-develop --pattern "*.json" -D indexes/

# Or rebuild locally
pnpm run index:build -- --branch main --sha $(git rev-parse HEAD)
```

## Production Checklist

- [ ] Set `API_KEY` environment variable for authentication
- [ ] Configure `CORS_ORIGINS` to restrict allowed origins
- [ ] Use HTTPS endpoint (not plain HTTP)
- [ ] Set up monitoring/logging
- [ ] Configure auto-restart
- [ ] Set up index update automation
- [ ] Rate limiting is enabled by default (100/min)
- [ ] Request body size is limited to 1MB
- [ ] Security headers are applied automatically
- [ ] Error messages are sanitized when API_KEY is set