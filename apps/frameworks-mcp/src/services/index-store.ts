import * as fs from 'fs';
import * as path from 'path';
import type { FrameworkIndex, IndexedSection } from '@security-alliance/frameworks-indexer';

interface IndexStore {
  main?: FrameworkIndex;
  develop?: FrameworkIndex;
}

const store: IndexStore = {};

export async function loadIndexes(indexDir: string): Promise<void> {
  for (const branch of ['main', 'develop'] as const) {
    const indexPath = path.join(indexDir, `${branch}-index.json`);
    if (fs.existsSync(indexPath)) {
      const data = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
      store[branch] = data;
      console.log(`Loaded ${branch} index: ${data.section_count} sections`);
    } else {
      console.warn(`Index not found: ${indexPath}`);
    }
  }

  if (!store.main && !store.develop) {
    throw new Error('No indexes loaded. Cannot start server.');
  }
}

export function getIndex(branch: 'main' | 'develop'): FrameworkIndex {
  const index = store[branch];
  if (!index) {
    throw new Error(`Index not available: ${branch}`);
  }
  return index;
}

export function getSectionById(id: string): IndexedSection | undefined {
  for (const index of [store.main, store.develop]) {
    if (index?.sections_by_id[id]) {
      return index.sections_by_id[id];
    }
  }
  return undefined;
}

export function getSectionsByPath(targetPath: string, branch: 'main' | 'develop'): IndexedSection[] {
  const index = store[branch];
  if (!index) return [];
  return index.sections.filter(s => s.path === targetPath);
}