# OpenAI MCP Usage Example

## Configuration

Add to your OpenAI `mcp.json` configuration file:

```json
{
  "mcpServers": {
    "frameworks": {
      "url": "https://frameworks-mcp.securityalliance.org/mcp",
      "transport": "streamable-http"
    }
  }
}
```

## Python Example

```python
from openai import OpenAI

client = OpenAI()

# Search for security guidance
result = client.mcp.tools.call(
    tool="frameworks.search_frameworks",
    arguments={
        "query": "multi-factor authentication",
        "branch": "main",
        "limit": 5
    }
)

# Parse the response
data = json.loads(result.content[0].text)
for item in data["results"]:
    print(f"[{item['branch']}] {item['page_title']} - {item['section_title']}")
    print(f"   URL: {item['canonical_url']}")
```

## Assistant Integration

In GPT Builder or API:

```
You have access to the SEAL Frameworks MCP server. When users ask about
security frameworks, best practices, or operational security guidance,
use the frameworks-mcp to search and retrieve relevant documentation.

Always default to stable (main) branch content unless draft is explicitly
requested. Cite canonical URLs in your responses.
```