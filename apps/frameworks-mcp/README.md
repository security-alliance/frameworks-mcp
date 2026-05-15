# Frameworks MCP Server

MCP server implementation for SEAL Frameworks documentation.

## Project Structure

```
apps/frameworks-mcp/         # MCP server application
packages/frameworks-indexer/  # Indexer library
```

## Development

```bash
# Install dependencies
pnpm install

# Build the indexer
pnpm run build:indexer

# Build indexes locally
pnpm run index:build -- --branch main --sha $(git rev-parse HEAD)

# Start MCP server (stdio) in dev mode
pnpm run dev:mcp

# Start MCP server (HTTP) in dev mode
pnpm run serve:http

# Run tests
pnpm test
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `INDEX_DIR` | `./indexes` (stdio walks up directories; HTTP uses cwd) | Directory containing index JSON files |
| `RATE_LIMIT` | `100` | Requests per minute per client (HTTP) or globally (stdio) |
| `HTTP_PORT` | `3000` | Port for HTTP server |
| `API_KEY` | (none) | Bearer token for authentication on HTTP endpoints. Set for production; unset for local/dev. `/health` is always public. |
| `CORS_ORIGINS` | (unset, sends `*`) | Allowed origins for CORS. Set to a specific domain for production. |
| `LOG_LEVEL` | `info` | Logging level: debug, info, warn, error |

## Security

- **Rate limiting**: 100 req/min per client on HTTP (configurable via `RATE_LIMIT`); single global bucket on stdio
- **Input sanitization**: All tool inputs sanitized and validated via Zod schemas
- **Authentication**: Optional Bearer token auth via `API_KEY` env var (HTTP only)
- **Body size limit**: 1MB max for HTTP requests
- **Security headers**: X-Content-Type-Options, X-Frame-Options, Cache-Control (HTTP)
- **CORS**: Configurable via `CORS_ORIGINS` (HTTP)
- **Error sanitization**: Internal errors hidden when `API_KEY` is set
- **Read-only**: No mutations, no admin, no file system writes

See [SECURITY.md](../../docs/mcp/SECURITY.md) for full threat model and mitigation details.

## Tools

- `search_frameworks` - Search section-level content (query: 1-500 chars, limit: 1-100)
- `fetch_framework_section` - Fetch section by ID
- `compare_framework_path` - Compare documents between branches
- `list_frameworks` - List available frameworks