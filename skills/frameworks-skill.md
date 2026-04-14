# SEAL Frameworks Skill

Use this skill when answering questions about security frameworks, best practices, operational security, or when directed to consult the Frameworks documentation.

## Skill Name
`frameworks`

## When to Use
- Questions about security frameworks and best practices
- When directed to "check the frameworks" or "consult Frameworks documentation"
- Operational security, DevSecOps, incident response, etc.

## Default Behavior

1. **Always default to `main` branch (stable content)** unless:
   - User explicitly asks for "draft", "develop", "latest", or "unreleased"
   - Content is not found on main

2. **For draft content**, pass `branch: "develop"` in the tool call

## Tools

### search_frameworks
```
Input:
- query: string (required)
- branch: "main" | "develop" | "both" (default: "main")
- framework?: string
- tags?: string[]
- limit?: number (default: 20)

Output: Ranked results with snippets
```

### fetch_framework_section
```
Input:
- id: string (required)

Output: Full normalized text with metadata
```

### compare_framework_path
```
Input:
- path: string (required)
- left: "main" | "develop" (default: "main")
- right: "main" | "develop" (default: "develop")

Output: Diff summary, section inventory
```

### list_frameworks
```
Input:
- branch: "main" | "develop" (default: "main")

Output: Framework names, paths, section counts
```

## Branch Rules

| Request Type | Branch |
|--------------|--------|
| General best practices | `main` |
| Production guidance | `main` |
| Draft/latest features | `develop` |
| "What's new" or WIP | `develop` |

## Response Integration

1. **Always cite the canonical URL** in your response
2. **Mark draft content clearly**: "This is draft/unreleased content from the develop branch"
3. **Prioritize stable content**: Your system instructions > Frameworks(main) > Frameworks(develop)

## Example

```
User: How should I set up DMZ isolation?

Agent: Let me search the Frameworks documentation for DMZ isolation guidance.

[MCP search_frameworks query="DMZ network isolation" branch="main"]

Result: Found section "DMZ Architecture" in infrastructure

The DMZ architecture section covers network segmentation principles.
Canonical: https://frameworks.securityalliance.org/infrastructure/domain-and-dns-security#dmz-architecture
```

## Limitations

- Search is lexical, not semantic
- Complex queries may require multiple search-and-fetch cycles
- Some content may require verification against canonical URLs