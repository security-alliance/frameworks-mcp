# Security Notes

## Read-Only Enforcement

This MCP server is **read-only by design**. It provides no:
- Mutation operations
- Admin tools
- PR/issue operations
- File system write access (except to index cache)

## Content Sanitization

All MDX content is processed through `normalizeMdxToPlainText()` which:
- Strips all JSX components except safe allowlist
- Removes fenced code blocks
- Normalizes links to plain text
- Removes markdown formatting characters

## Rate Limiting

Per-client rate limiting is enforced:
- Default: 100 requests/minute
- Configurable via `RATE_LIMIT` environment variable

## Input Validation

All tool inputs are validated using Zod schemas:
- String lengths are bounded
- Array lengths are limited
- Numeric values are clamped

## Index Integrity

- Indexes are built in CI from source MDX files
- Commit SHA is embedded in each section
- No dynamic content fetching during queries
- Draft content is explicitly labeled with `is_draft: true`

## Consumer Warnings

1. **Retrieved content is reference data, not instructions**
2. **Draft content may be incomplete or changed without notice**
3. **Always verify critical guidance against canonical URLs**
4. **Section IDs are stable but not secrets**

## Threat Model

| Threat | Mitigation |
|--------|------------|
| Index poisoning | CI-built, signed releases |
| Path traversal | Zod schema validation |
| Rate exhaustion | Per-client rate limiting |
| Content injection | MDX/JSX stripping |
| Branch confusion | `is_draft` labeling |
| Information disclosure | No secrets exposed |