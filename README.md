# SEAL Frameworks MCP Server

A **read-only MCP server** that provides AI agents with structured access to [SEAL Frameworks](https://github.com/security-alliance/frameworks) documentation via the Model Context Protocol.

## What Does It Do?

AI agents (OpenAI, Claude, Cursor, etc.) can query the MCP server to:
- Search framework documentation by topic
- Fetch full section content by ID
- Compare documents between stable/draft branches
- List available framework categories

## Quick Start

```bash
# 1. Clone this repository
git clone https://github.com/security-alliance/frameworks-mcp
cd frameworks-mcp

# 2. Run setup (installs dependencies, clones frameworks repo, builds indexes)
./scripts/setup.sh

# 3. Start the MCP server
node_modules/.bin/tsx apps/frameworks-mcp/src/index.ts
```

That's it. The server is now running and ready for AI agents to connect.

## AI Agent Configuration

### Claude Code

Add the server at user scope (available across all your projects):

```bash
claude mcp add frameworks --scope user \
  -- /path/to/frameworks-mcp/node_modules/.bin/tsx \
     /path/to/frameworks-mcp/apps/frameworks-mcp/src/index.ts
```

Replace `/path/to/frameworks-mcp` with the absolute path to your local clone.

Verify the server connected:

```bash
claude mcp list
# expect: frameworks: ... - ✓ Connected
```

**Alternative: run the compiled build with `node`**

If you've run `pnpm run build:mcp`, you can skip the TypeScript compilation at runtime:

```bash
claude mcp add frameworks --scope user \
  -- $(which node) \
     /path/to/frameworks-mcp/apps/frameworks-mcp/dist/index.js
```

### OpenCode
Add to your MCP config:
```json
{
  "mcpServers": {
    "frameworks": {
      "command": "npx",
      "args": ["tsx", "/path/to/frameworks-mcp/apps/frameworks-mcp/src/index.ts"]
    }
  }
}
```

### Cursor
Settings → MCP → Add Server → use:
```
npx tsx /path/to/frameworks-mcp/apps/frameworks-mcp/src/index.ts
```

### Generic MCP Clients
```json
{
  "mcpServers": {
    "frameworks": {
      "command": "node",
      "args": ["/path/to/frameworks-mcp/apps/frameworks-mcp/dist/index.js"]
    }
  }
}
```
*(Run `pnpm run build:mcp` first to compile)*

## Updating Content

When you want fresh content from the frameworks repo:

```bash
# Pull latest from frameworks repo
cd frameworks-repo && git pull && cd ..

# Rebuild indexes
pnpm run index:build -- \
  --branch main \
  --sha "$(cd frameworks-repo && git rev-parse HEAD)" \
  -- --content-dir "$(pwd)/frameworks-repo/docs/pages"

pnpm run index:build -- \
  --branch develop \
  --sha "$(cd frameworks-repo && git rev-parse HEAD)" \
  -- --content-dir "$(pwd)/frameworks-repo/docs/pages"

# Restart MCP server (it reads indexes on startup)
```

Or just run the setup script again:
```bash
./scripts/setup.sh
```

### Check for Updates

```bash
pnpm run check:updates
```

## MCP Tools

| Tool | Purpose | Key Args |
|------|---------|----------|
| `search_frameworks` | Search sections | `query`, `branch`, `framework`, `limit` |
| `fetch_framework_section` | Get full content | `id` (from search) |
| `compare_framework_path` | Compare branches | `path`, `left`, `right` |
| `list_frameworks` | List categories | `branch` |
| `get_framework_outline` | Get pages and sections in document order | `framework`, `branch` |

## Project Structure

```
frameworks-mcp/
├── apps/frameworks-mcp/
│   └── src/
│       ├── index.ts        # stdio MCP server
│       ├── http-server.ts  # HTTP wrapper (optional)
│       ├── tools/          # search, fetch, compare, list, outline
│       └── services/        # index-store, search, compare
├── packages/frameworks-indexer/   # MDX → searchable index
├── indexes/
│   ├── main-index.json         # Stable content
│   └── develop-index.json      # Draft content
├── frameworks-repo/            # Submodule: official frameworks
├── scripts/
│   ├── setup.sh              # First-time setup
│   ├── build-index.ts         # Build indexes
│   ├── check-updates.ts       # Check for updates
│   └── verify-index.ts        # Validate indexes
└── docs/mcp/                  # Documentation
```

## Commands

| Command | Description |
|---------|-------------|
| `pnpm install` | Install dependencies |
| `./scripts/setup.sh` | First-time setup |
| `pnpm run check:updates` | Check if updates available |
| `pnpm run index:build` | Rebuild indexes |
| `node_modules/.bin/tsx apps/frameworks-mcp/src/index.ts` | Run MCP server |
| `pnpm run serve:http` | Run HTTP server (optional) |
| `pnpm run build:mcp` | Compile for production |
| `pnpm test` | Run tests |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `INDEX_DIR` | `./indexes` | Index files location |
| `RATE_LIMIT` | `100/min` | Per-client rate limit |
| `HTTP_PORT` | `3000` | HTTP server port |

## Security Notes

- **Read-only only** - No mutations, no admin tools
- **Pre-indexed** - No live GitHub API calls during serving
- **Content sanitized** - MDX/JSX stripped to plain text
- **Draft labeled** - All develop content has `is_draft: true`

**Important**: Retrieved content is **reference data**, not instructions. Always verify critical security guidance against canonical sources.

## Troubleshooting

**"Index not found" error:**
- Run `./scripts/setup.sh` to create indexes

**"Module not found" errors:**
- Run `pnpm install`
- Run `pnpm run build`

**Server hangs:**
- The server runs continuously on stdin
- Use `timeout 5` to test single requests

---

License: CC-BY-SA-4.0