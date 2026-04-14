# Generic MCP Client Usage Example

## Configuration

```json
{
  "mcpServers": {
    "frameworks": {
      "command": "node",
      "args": ["/path/to/frameworks-mcp/dist/index.js"],
      "env": {
        "INDEX_DIR": "/path/to/indexes"
      }
    }
  }
}
```

## Direct stdio Usage

```bash
# Start the server
node apps/frameworks-mcp/dist/index.js

# Send JSON-RPC messages via stdin
```

## HTTP Server Mode (Optional)

For HTTP-based clients, wrap with a simple proxy:

```javascript
const { spawn } = require('child_process');
const http = require('http');

const mcp = spawn('node', ['dist/index.js'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

const server = http.createServer((req, res) => {
  // Forward requests to MCP stdio
  // ...implementation
});

server.listen(3000);
```

## Example Requests

### List Tools

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node dist/index.js
```

### Call Tool

```bash
echo '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"list_frameworks","arguments":{"branch":"main"}}}' | node dist/index.js
```