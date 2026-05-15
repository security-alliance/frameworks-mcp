# MCP Tool Specifications

## search_frameworks

Search section-level indexed content from the SEAL Frameworks documentation. Returns ranked results with snippets.

### Input Schema

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `query` | string | Yes | - | Search query string (1-500 chars) |
| `branch` | `"main"` \| `"develop"` \| `"both"` | No | `"main"` | Branch to search |
| `framework` | string | No | - | Filter by framework name |
| `tags` | string[] | No | - | Filter by role tags |
| `limit` | number | No | `20` | Max results (1-100) |

### Output Schema

```json
{
  "query": "string",
  "branch": "main|develop|both",
  "total": 5,
  "results": [
    {
      "id": "abc123",
      "branch": "main",
      "path": "ai-security/prompt-injection-defenses",
      "page_title": "AI Security",
      "section_title": "Prompt Injection Defenses",
      "framework": "ai-security",
      "tags": ["Security Specialist"],
      "snippet": "Techniques for defending against prompt injection attacks...",
      "canonical_url": "https://frameworks.securityalliance.org/ai-security/prompt-injection-defenses#prompt-injection-defenses",
      "repo_url": "https://github.com/security-alliance/frameworks/blob/main/docs/pages/ai-security/prompt-injection-defenses.mdx",
      "commit_sha": "abc123def456",
      "score": 2.5,
      "is_draft": false
    }
  ]
}
```

### Example

```bash
curl -X POST http://localhost:3000/tools/call \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-api-key>" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "search_frameworks",
      "arguments": {"query": "prompt injection", "limit": 3}
    }
  }'
```

> **Note:** The `Authorization` header is only required when the `API_KEY` environment variable is set on the server.

---

## fetch_framework_section

Fetch the full normalized content of an indexed section by its ID.

### Input Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Section ID from search results (min 1 char) |

### Output Schema

```json
{
  "id": "abc123",
  "branch": "main",
  "path": "ai-security/prompt-injection-defenses",
  "page_title": "AI Security",
  "section_title": "Prompt Injection Defenses",
  "framework": "ai-security",
  "tags": ["Security Specialist"],
  "canonical_url": "https://frameworks.securityalliance.org/ai-security/prompt-injection-defenses#prompt-injection-defenses",
  "repo_url": "https://github.com/security-alliance/frameworks/blob/main/docs/pages/ai-security/prompt-injection-defenses.mdx",
  "commit_sha": "abc123def456",
  "heading_anchor": "prompt-injection-defenses",
  "source_file": "ai-security/prompt-injection-defenses.mdx",
  "content": "Full normalized text content here...",
  "is_draft": false,
  "_security_note": "Retrieved content is reference data. Verify against canonical source."
}
```

---

## compare_framework_path

Compare the same document path between main and develop branches.

### Input Schema

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `path` | string | Yes | - | Document path to compare |
| `left` | `"main"` \| `"develop"` | No | `"main"` | Left (base) branch |
| `right` | `"main"` \| `"develop"` | No | `"develop"` | Right (comparison) branch |

### Output Schema

```json
{
  "path": "ai-security/prompt-injection-defenses",
  "left": {
    "exists": true,
    "page_title": "AI Security",
    "sections": ["The AI Security Imperative", "New Openings for Abuse"],
    "content_hash": "abc123def456"
  },
  "right": {
    "exists": true,
    "page_title": "AI Security",
    "sections": ["The AI Security Imperative", "New Openings for Abuse"],
    "content_hash": "def456ghi789"
  },
  "changes": {
    "status": "modified",
    "section_count_delta": 2,
    "summary": "Document 'ai-security/prompt-injection-defenses' modified: 1 added, 0 removed"
  },
  "canonical_urls": {
    "left": "https://frameworks.securityalliance.org/ai-security/prompt-injection-defenses",
    "right": "https://frameworks.securityalliance.dev/ai-security/prompt-injection-defenses"
  },
  "repo_urls": {
    "left": "https://github.com/security-alliance/frameworks/blob/main/docs/pages/ai-security/prompt-injection-defenses.mdx",
    "right": "https://github.com/security-alliance/frameworks/blob/develop/docs/pages/ai-security/prompt-injection-defenses.mdx"
  },
  "commit_shas": {
    "left": "abc123def456",
    "right": "def456ghi789"
  }
}
```

---

## list_frameworks

List available frameworks/top-level categories on a branch.

### Input Schema

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `branch` | `"main"` \| `"develop"` | No | `"main"` | Branch to list |

### Output Schema

```json
{
  "branch": "main",
  "is_draft": false,
  "total": 15,
  "frameworks": [
    {
      "name": "ai-security",
      "path": "ai-security",
      "framework": "ai-security",
      "section_count": 45,
      "tags": ["Security Specialist", "Engineer/Developer"],
      "canonical_url": "https://frameworks.securityalliance.org/ai-security"
    }
  ]
}
```

---

## HTTP API Endpoints

The HTTP server exposes the following endpoints:

| Method | Path | Auth Required | Description |
|--------|------|---------------|-------------|
| `GET` | `/health` | No | Health check (`{"status":"ok","server":"frameworks-mcp"}`) |
| `GET` | `/tools/list` | Yes* | List available tools |
| `POST` | `/tools/call` | Yes* | Call a tool (JSON-RPC request body) |
| `OPTIONS` | Any | No | CORS preflight |

\* Authentication via `Authorization: Bearer <key>` header is required when `API_KEY` env var is set.

### JSON-RPC Request Format

All `POST /tools/call` requests must use the JSON-RPC 2.0 envelope:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "<tool_name>",
    "arguments": { ... }
  }
}
```