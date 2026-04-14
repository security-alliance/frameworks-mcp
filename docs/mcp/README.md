# SEAL Frameworks MCP Server

A public, read-only MCP server for the Security Alliance Frameworks documentation.

## Overview

This MCP server provides AI agents with structured, programmatic access to SEAL Frameworks documentation through the Model Context Protocol. It serves as a **read-only knowledge retrieval layer** built on the GitHub repository source.

## Quick Start

### 1. Configure Your MCP Client

**OpenAI:**
```json
{
  "mcpServers": {
    "frameworks": {
      "command": "npx",
      "args": ["-y", "@security-alliance/frameworks-mcp"]
    }
  }
}
```

**Anthropic Claude:**
```bash
claude mcp add frameworks \
  --command npx \
  --args "-y" "@security-alliance/frameworks-mcp"
```

**Generic:**
```json
{
  "mcpServers": {
    "frameworks": {
      "url": "https://frameworks-mcp.example.com/mcp"
    }
  }
}
```

### 2. Verify Connection

```bash
curl -X POST http://localhost:3000/mcp/v1/tools/list
```

## Branch Semantics

| Branch | URL | Meaning |
|--------|-----|---------|
| `main` | frameworks.securityalliance.org | Stable, production-ready content |
| `develop` | frameworks.securityalliance.dev | Draft, work-in-progress content |

**Default: `main` (stable)**. Use `develop` only when explicitly requesting draft content.

## Tools

### search_frameworks
Search section-level indexed content with lexical ranking.

**Input:**
- `query` (required): Search terms
- `branch`: "main" | "develop" | "both" (default: "main")
- `framework`: Filter by category
- `tags`: Filter by tags
- `limit`: Max results (default: 20)

### fetch_framework_section
Retrieve full normalized content by section ID.

### compare_framework_path
Compare document state between branches.

### list_frameworks
List available framework categories.

See [TOOLS.md](TOOLS.md) for detailed specifications.

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Agent     │────▶│  MCP Client │────▶│   MCP       │
│             │◀────│             │◀────│   Server    │
└─────────────┘     └─────────────┘     └─────────────┘
                                              │
                    ┌─────────────────────────┤
                    ▼                         ▼
             ┌─────────────┐           ┌─────────────┐
             │ Main Index  │           │ Develop Idx │
             └─────────────┘           └─────────────┘
```

## Security Model

- **Read-only only**: No mutations, admin actions, or write operations
- **Pre-indexed**: No live GitHub API calls during query serving
- **Content sanitization**: MDX/JSX stripped, only plain text served
- **Rate limiting**: Per-client limits prevent abuse
- **Draft labeling**: All develop-branch content flagged as `is_draft: true`

## Support

- Issues: https://github.com/security-alliance/frameworks/issues
- Discord: https://discord.gg/securityalliance