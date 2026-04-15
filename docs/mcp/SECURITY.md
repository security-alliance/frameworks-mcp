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

All tool inputs pass through `sanitizeInput()` which:
- Strips control characters from strings
- Limits string lengths to 10,000 chars
- Limits array lengths to 100 items
- Limits array item strings to 1,000 chars
- Clamps numeric values to [0, 1e9]
- Rejects NaN and Infinity values
- Strips non-alphanumeric characters from object keys
- Rejects nested objects

## Rate Limiting

Per-client rate limiting is enforced:
- Default: 100 requests/minute
- Configurable via `RATE_LIMIT` environment variable
- Maximum tracked clients: 10,000 (LRU eviction)
- Applied to both stdio and HTTP transports

## Input Validation

All tool inputs are validated using Zod schemas:
- String lengths are bounded
- Array lengths are limited
- Numeric values are clamped

Additionally, request body size is limited to 1MB on the HTTP server.

## Authentication (HTTP Transport)

The HTTP server supports optional Bearer token authentication:
- Set `API_KEY` environment variable to enable
- Clients must send `Authorization: Bearer <token>` header
- Token comparison uses constant-time comparison to prevent timing attacks
- When `API_KEY` is not set, the server runs unauthenticated (for local/dev use)
- When `API_KEY` is set, unauthenticated requests receive 401 Unauthorized

## Error Disclosure

When `API_KEY` is set (production mode), error messages are sanitized to prevent information leakage:
- Internal error details are not exposed to clients
- Generic "Internal server error" message returned instead

When `API_KEY` is not set (local/dev mode), error messages include details for debugging.

## CORS

Cross-Origin Resource Sharing is configurable:
- Default: `Access-Control-Allow-Origin: *` (suitable for local development)
- Set `CORS_ORIGINS` to restrict origins (e.g., `https://your-domain.com`)
- OPTIONS preflight requests are handled automatically

## Security Headers

The HTTP server applies these headers to all responses:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Cache-Control: no-store`
- `Content-Type: application/json`

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
| Path traversal | Zod schema validation + sanitizeInput |
| Rate exhaustion | Per-client rate limiting (10,000 client cap) |
| Content injection | MDX/JSX stripping |
| Branch confusion | `is_draft` labeling |
| Information disclosure | Conditional error sanitization |
| DNS rebinding (HTTP) | Updated MCP SDK (>=1.25.2) |
| Request body DoS | 1MB body size limit |
| Unauthorized access | Optional Bearer token auth (API_KEY env) |
| CSRF (HTTP) | CORS origin restrictions |
| Timing attacks | Constant-time token comparison |
| Client ID spoofing | Multiple ID sources (X-Forwarded-For, MCP-Client-ID, IP) |