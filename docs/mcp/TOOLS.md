# MCP Tool Specifications

## search_frameworks

Search section-level indexed content from the SEAL Frameworks documentation.

### Input Schema

```json
{
  "query": "string",
  "branch": "main|develop|both",
  "framework": "string",
  "tags": ["string"],
  "limit": 20
}
```

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
curl -X POST http://localhost:3000/mcp/v1/tools/call \
  -H "Content-Type: application/json" \
  -d '{
    "name": "search_frameworks",
    "arguments": {"query": "prompt injection", "limit": 3}
  }'
```

---

## fetch_framework_section

Fetch the full normalized content of an indexed section by its ID.

### Input Schema

```json
{
  "id": "string"
}
```

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

```json
{
  "path": "string",
  "left": "main|develop",
  "right": "main|develop"
}
```

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
    "summary": "Document modified: 1 added, 0 removed"
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

```json
{
  "branch": "main|develop"
}
```

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