export interface IndexedSection {
  id: string;
  branch: 'main' | 'develop';
  path: string;
  page_title: string;
  section_title: string;
  framework: string;
  tags: string[];
  content: string;
  snippet: string;
  canonical_url: string;
  repo_url: string;
  commit_sha: string;
  heading_anchor: string;
  source_file: string;
  source_url: string;
  github_url: string;
  description?: string;
  status: 'stable' | 'draft';
  content_hash: string;
}

export interface FrameworkIndex {
  schema_version: 1;
  branch: 'main' | 'develop';
  commit_sha: string;
  generated_at: string;
  section_count: number;
  sections: IndexedSection[];
  sections_by_id: Record<string, IndexedSection>;
  frameworks: FrameworkMetadata[];
}

export interface FrameworkMetadata {
  name: string;
  path: string;
  framework: string;
  section_count: number;
  tags: string[];
}

export interface SearchOptions {
  query: string;
  branch: 'main' | 'develop' | 'both';
  framework?: string;
  tags?: string[];
  limit?: number;
}

export interface SearchResult {
  id: string;
  branch: 'main' | 'develop';
  path: string;
  page_title: string;
  section_title: string;
  framework: string;
  tags: string[];
  snippet: string;
  canonical_url: string;
  repo_url: string;
  commit_sha: string;
  score: number;
  source_url: string;
  github_url: string;
  status: 'stable' | 'draft';
}

export interface CompareResult {
  path: string;
  left: BranchSnapshot;
  right: BranchSnapshot;
  changes: ChangeSummary;
  canonical_urls: { left: string; right: string };
  repo_urls: { left: string; right: string };
  commit_shas: { left: string; right: string };
}

export interface BranchSnapshot {
  exists: boolean;
  page_title?: string;
  sections: string[];
  content_hash?: string;
}

export interface ChangeSummary {
  status: 'added' | 'removed' | 'modified' | 'unchanged';
  section_count_delta: number;
  summary: string;
}
