# CLI Integration

The `seal` CLI is a Go binary that consumes the index artifacts produced by the MCP indexer (`packages/frameworks-indexer`). It lives alongside the MCP code in `cli-go/` (or the `seal-cli` repository).

## Architecture

```
frameworks/ (canonical content)
    docs/pages/**/*.mdx
        |
        v
packages/frameworks-indexer/
    build-index.ts  (branch-aware generation)
    produces: main-index.json, develop-index.json, manifest.json
        |
        v
    GitHub Release: frameworks-mcp/releases
        |
        v
seal CLI (Go, zero runtime deps)
    seal update     -- downloads index artifacts
    seal search     -- queries local JSON indexes
    seal fetch      -- returns section content
    seal compare    -- diff branches
    seal list       -- list frameworks
    seal emergency  -- SEAL 911 contact template
    seal tips       -- SEAL tips contact template
```

## Index Artifact Contract

The CLI expects these files in the release artifacts or raw GitHub content:

| File | Purpose |
|---|---|
| `main-index.json` | Stable (main branch) index |
| `develop-index.json` | Draft (develop branch) index |
| `manifest.json` | SHA256 checksums for integrity verification |

Schema version: `1` (see `packages/frameworks-indexer/src/types.ts`)

## Branch Semantics

- `main` → stable, reviewed guidance
- `develop` → draft, work-in-progress guidance
- The CLI defaults to `main` for all commands.

## Security Boundaries

- CLI is **read-only** by default.
- `seal update` is the **only** command that touches the network.
- No postinstall scripts, no runtime package manager usage.
- Checksum verification via `manifest.json` (optional but recommended).

## MCP Relationship

The MCP server (`apps/frameworks-mcp/`) and the CLI share the same index artifacts but serve different use cases:

| Aspect | MCP Server | CLI |
|---|---|---|
| Transport | stdio / HTTP | Command line |
| Search engine | MiniSearch | Custom weighted scorer |
| Target | AI agents | Humans + agents |
| Dependencies | `@modelcontextprotocol/sdk`, `minisearch`, `zod` | Zero runtime deps |

Both read `main-index.json` and `develop-index.json` from disk. The MCP server is optional; the CLI can operate standalone once indexes are downloaded.

## Development

Index artifacts are built via:

```bash
pnpm run index:build -- --branch main --sha <commit>
pnpm run index:build -- --branch develop --sha <commit>
pnpm run manifest:generate
```

Or via `scripts/setup.sh` which clones both branches and builds both indexes with correct SHAs.

## Future: qmd

A benchmark comparing `qmd` (hybrid BM25 + vector + rerank) against the current indexer may be run later. If qmd improves retrieval quality significantly, it can be added as an optional backend without changing the CLI schema or commands.
