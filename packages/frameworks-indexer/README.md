# Frameworks Indexer

Library for building search indexes from SEAL Frameworks MDX content.

## Usage

```typescript
import { buildIndex } from '@security-alliance/frameworks-indexer';

const index = await buildIndex({
  branch: 'main',
  contentDir: './docs/pages',
  commitSha: 'abc123',
});
```

## API

### buildIndex(options)
Builds a search index from MDX content.

Options:
- `branch`: 'main' | 'develop'
- `contentDir`: Path to docs/pages directory
- `commitSha`: Git commit SHA

Returns `FrameworkIndex` with:
- `sections`: Array of indexed sections
- `sections_by_id`: Map of section IDs to sections
- `frameworks`: List of framework metadata