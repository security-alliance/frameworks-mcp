import MiniSearch from 'minisearch';
import type { SearchResult, SearchOptions, IndexedSection } from '@security-alliance/frameworks-indexer';
import { getIndex } from './index-store.js';

interface MiniSearchResult {
  id: string;
  score: number;
}

const searchCaches = new Map<'main' | 'develop', MiniSearch<IndexedSection>>();

function getSearchInstance(branch: 'main' | 'develop'): MiniSearch<IndexedSection> {
  let instance = searchCaches.get(branch);
  if (instance) return instance;

  const index = getIndex(branch);
  instance = new MiniSearch<IndexedSection>({
    fields: ['section_title', 'content', 'page_title', 'framework', 'tags'],
    storeFields: ['id', 'branch', 'path', 'page_title', 'section_title', 'framework', 'tags', 'snippet', 'canonical_url', 'repo_url', 'commit_sha', 'source_url', 'github_url', 'status'],
  });
  instance.addAll(index.sections);
  searchCaches.set(branch, instance);
  return instance;
}

export function clearSearchCaches(): void {
  searchCaches.clear();
}

export async function searchSections(options: SearchOptions): Promise<SearchResult[]> {
  const { query, branch = 'main', framework, tags, limit = 20 } = options;

  const branchesToSearch = branch === 'both' ? ['main', 'develop'] as const : [branch as 'main' | 'develop'];
  const allResults: SearchResult[] = [];

  for (const b of branchesToSearch) {
    const searchInstance = getSearchInstance(b);
    const index = getIndex(b);

    const results = searchInstance.search(query, {
      boost: { section_title: 2, page_title: 1.5 },
    }) as unknown as MiniSearchResult[];

    const effectiveLimit = Math.min(limit * 2, 200);
    const capped = results.slice(0, effectiveLimit);

    for (const r of capped) {
      const section = index.sections_by_id[r.id] as IndexedSection | undefined;
      if (!section) continue;

      if (framework && section.framework !== framework) continue;
      if (tags && tags.length > 0 && !tags.some((t: string) => section.tags.includes(t))) continue;

      allResults.push({
        id: r.id,
        branch: section.branch,
        path: section.path,
        page_title: section.page_title,
        section_title: section.section_title,
        framework: section.framework,
        tags: section.tags,
        snippet: section.snippet,
        canonical_url: section.canonical_url,
        repo_url: section.repo_url,
        source_url: section.source_url,
        github_url: section.github_url,
        commit_sha: section.commit_sha,
        score: r.score,
        status: section.status,
      });
    }
  }

  allResults.sort((a, b) => b.score - a.score);
  return allResults.slice(0, limit);
}
