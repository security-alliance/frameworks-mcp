# Anthropic MCP Usage Example

## Configuration

In your Anthropic CLI config:

```yaml
mcp_servers:
  frameworks:
    command: npx
    args:
      - "-y"
      - "@security-alliance/frameworks-mcp"
    env:
      INDEX_DIR: /opt/frameworks-mcp/indexes
```

## Claude CLI Usage

```bash
# Search via CLI
claude mcp call frameworks search_frameworks \
  --query "incident response playbook" \
  --branch main \
  --limit 5

# List frameworks
claude mcp call frameworks list_frameworks --branch main

# Fetch specific section
claude mcp call frameworks fetch_framework_section --id <section-id>
```

## API Usage

```python
import anthropic

client = anthropic.Anthropic()

response = client.messages.create(
    model="claude-sonnet-4-20250514",
    max_tokens=1024,
    tools=[
        {
            "name": "search_frameworks",
            "description": "Search frameworks documentation",
            "input_schema": {
                "type": "object",
                "properties": {
                    "query": {"type": "string"},
                    "branch": {"enum": ["main", "develop", "both"], "default": "main"},
                    "limit": {"type": "number", "default": 20}
                }
            }
        }
    ],
    messages=[
        {
            "role": "user",
            "content": "How should I structure my team's incident response process?"
        }
    ]
)
```