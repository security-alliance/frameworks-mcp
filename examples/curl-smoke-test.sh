#!/bin/bash
# Smoke test for frameworks-mcp server
#
# Usage:
#   ./curl-smoke-test.sh [host]           # No auth
#   API_KEY=mykey ./curl-smoke-test.sh    # With auth

set -e

HOST="${1:-localhost:3000}"
ENDPOINT="http://${HOST}/tools"

AUTH_HEADER=""
if [ -n "$API_KEY" ]; then
  AUTH_HEADER="-H \"Authorization: Bearer ${API_KEY}\""
fi

echo "=== Frameworks MCP Smoke Test ==="
echo "Endpoint: ${ENDPOINT}"
if [ -n "$API_KEY" ]; then
  echo "Auth: Bearer token enabled"
else
  echo "Auth: None (set API_KEY env var to enable)"
fi

echo ""
echo "1. Health check..."
curl -s "http://${HOST}/health" | jq '.'

echo ""
echo "2. Listing tools..."
eval curl -s "${AUTH_HEADER}" "\"${ENDPOINT}/list\"" | jq '.'

echo ""
echo "3. Listing frameworks (main)..."
eval curl -s -X POST "${AUTH_HEADER}" \
  -H "Content-Type: application/json" \
  "\"${ENDPOINT}/call\"" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"list_frameworks","arguments":{"branch":"main"}}}' \
  | jq '.result.content[0].text' | jq -r 'fromjson.frameworks[0:3]'

echo ""
echo "4. Searching for 'incident response'..."
eval curl -s -X POST "${AUTH_HEADER}" \
  -H "Content-Type: application/json" \
  "\"${ENDPOINT}/call\"" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"search_frameworks","arguments":{"query":"incident response","limit":3}}}' \
  | jq '.result.content[0].text' | jq -r 'fromjson.results[0:2]'

echo ""
echo "=== Smoke Test Complete ==="