#!/bin/bash
# Smoke test for frameworks-mcp server

set -e

HOST="${1:-localhost:3000}"
ENDPOINT="http://${HOST}/mcp/v1"

echo "=== Frameworks MCP Smoke Test ==="

echo ""
echo "1. Listing tools..."
curl -s "${ENDPOINT}/tools/list" | jq '.tools[].name'

echo ""
echo "2. Listing frameworks (main)..."
curl -s -X POST "${ENDPOINT}/tools/call" \
  -H "Content-Type: application/json" \
  -d '{"name":"list_frameworks","arguments":{"branch":"main"}}' \
  | jq '.content[0].text' | jq -r 'fromjson.frameworks[0:3]'

echo ""
echo "3. Searching for 'incident response'..."
curl -s -X POST "${ENDPOINT}/tools/call" \
  -H "Content-Type: application/json" \
  -d '{"name":"search_frameworks","arguments":{"query":"incident response","limit":3}}' \
  | jq '.content[0].text' | jq -r 'fromjson.results[0:2]'

echo ""
echo "4. Comparing a path..."
curl -s -X POST "${ENDPOINT}/tools/call" \
  -H "Content-Type: application/json" \
  -d '{"name":"compare_framework_path","arguments":{"path":"intro/introduction"}}' \
  | jq '.content[0].text' | jq -r 'fromjson'

echo ""
echo "=== Smoke Test Complete ==="