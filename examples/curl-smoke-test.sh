#!/bin/bash
# Smoke test for frameworks-mcp HTTP server
#
# Usage:
#   ./curl-smoke-test.sh [host]           # No auth (for local dev)
#   API_KEY=mykey ./curl-smoke-test.sh    # With Bearer token auth

set -e

HOST="${1:-localhost:3000}"
BASE="http://${HOST}"
FAIL=0

if [ -n "$API_KEY" ]; then
  AUTH=(-H "Authorization: Bearer ${API_KEY}")
  echo "=== Frameworks MCP Smoke Test (authenticated) ==="
else
  AUTH=()
  echo "=== Frameworks MCP Smoke Test (unauthenticated) ==="
fi
echo "Endpoint: ${BASE}"
echo ""

# 1. Health check (always public)
echo "1. Health check..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${BASE}/health")
if [ "$STATUS" = "200" ]; then echo "   [OK] HTTP $STATUS"; else echo "   [FAIL] HTTP $STATUS"; FAIL=1; fi

# 2. Tools list
echo "2. Tools list..."
RESP=$(curl -s -w "\n%{http_code}" "${AUTH[@]}" "${BASE}/tools/list")
STATUS=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
if [ "$STATUS" = "200" ]; then
  echo "   [OK] HTTP $STATUS"
  echo "   Tools: $(echo "$BODY" | python3 -c "import sys,json; print(', '.join(t['name'] for t in json.load(sys.stdin)['tools']))" 2>/dev/null || echo "$BODY")"
else
  echo "   [FAIL] HTTP $STATUS - $BODY"; FAIL=1
fi

# 3. List frameworks
echo "3. List frameworks..."
RESP=$(curl -s -w "\n%{http_code}" -X POST "${AUTH[@]}" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"list_frameworks","arguments":{"branch":"main"}}}' \
  "${BASE}/tools/call")
STATUS=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
if [ "$STATUS" = "200" ]; then
  echo "   [OK] HTTP $STATUS"
  echo "$BODY" | python3 -c "import sys,json; r=json.loads(json.load(sys.stdin)['result']['content'][0]['text']); print(f'   {r[\"total\"]} frameworks, first 3: {\", \ ".join(f[\"name\"] for f in r[\"frameworks\"][:3])}')" 2>/dev/null || echo "   $BODY"
else
  echo "   [FAIL] HTTP $STATUS - $BODY"; FAIL=1
fi

# 4. Search frameworks
echo "4. Search frameworks..."
RESP=$(curl -s -w "\n%{http_code}" -X POST "${AUTH[@]}" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"search_frameworks","arguments":{"query":"incident response","limit":3}}}' \
  "${BASE}/tools/call")
STATUS=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
if [ "$STATUS" = "200" ]; then
  echo "   [OK] HTTP $STATUS"
  echo "$BODY" | python3 -c "import sys,json; r=json.loads(json.load(sys.stdin)['result']['content'][0]['text']); print(f'   {r[\"total\"]} results: {\", \ ".join(s[\"section_title\"] for s in r[\"results\"][:3])}')" 2>/dev/null || echo "   $BODY"
else
  echo "   [FAIL] HTTP $STATUS - $BODY"; FAIL=1
fi

# 5. Fetch a section (uses first search result)
echo "5. Fetch framework section..."
SECTION_ID=$(echo "$BODY" | python3 -c "import sys,json; r=json.loads(json.load(sys.stdin)['result']['content'][0]['text']); print(r['results'][0]['id'])" 2>/dev/null)
if [ -n "$SECTION_ID" ]; then
  RESP=$(curl -s -w "\n%{http_code}" -X POST "${AUTH[@]}" \
    -H "Content-Type: application/json" \
    -d "{\"jsonrpc\":\"2.0\",\"id\":3,\"method\":\"tools/call\",\"params\":{\"name\":\"fetch_framework_section\",\"arguments\":{\"id\":\"$SECTION_ID\"}}}" \
    "${BASE}/tools/call")
  STATUS=$(echo "$RESP" | tail -1)
  BODY=$(echo "$RESP" | sed '$d')
  if [ "$STATUS" = "200" ]; then
    echo "   [OK] HTTP $STATUS (fetched section $SECTION_ID)"
  else
    echo "   [FAIL] HTTP $STATUS - $BODY"; FAIL=1
  fi
else
  echo "   [SKIP] No section ID from search"
fi

# 6. Compare branches
echo "6. Compare framework path..."
RESP=$(curl -s -w "\n%{http_code}" -X POST "${AUTH[@]}" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"compare_framework_path","arguments":{"path":"intro/introduction","left":"main","right":"develop"}}}' \
  "${BASE}/tools/call")
STATUS=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
if [ "$STATUS" = "200" ]; then
  echo "   [OK] HTTP $STATUS"
  echo "$BODY" | python3 -c "import sys,json; r=json.loads(json.load(sys.stdin)['result']['content'][0]['text']); print(f'   Status: {r[\"changes\"][\"status\"]}')" 2>/dev/null || echo "   $BODY"
else
  echo "   [FAIL] HTTP $STATUS - $BODY"; FAIL=1
fi

# 7. Auth rejection (if API_KEY set)
if [ -n "$API_KEY" ]; then
  echo "7. Auth rejection (no token)..."
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${BASE}/tools/list")
  if [ "$STATUS" = "401" ]; then echo "   [OK] HTTP $STATUS (unauthorized)"; else echo "   [FAIL] Expected 401, got $STATUS"; FAIL=1; fi

  echo "8. Auth rejection (wrong token)..."
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer wrong-key" "${BASE}/tools/list")
  if [ "$STATUS" = "401" ]; then echo "   [OK] HTTP $STATUS (unauthorized)"; else echo "   [FAIL] Expected 401, got $STATUS"; FAIL=1; fi
fi

echo ""
if [ $FAIL -eq 0 ]; then
  echo "=== All tests passed ==="
else
  echo "=== Some tests FAILED ==="
  exit 1
fi