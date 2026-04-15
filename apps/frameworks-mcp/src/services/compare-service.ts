import type { CompareResult, BranchSnapshot, ChangeSummary, IndexedSection } from '@security-alliance/frameworks-indexer';
import { URL_TEMPLATES } from '@security-alliance/frameworks-indexer';
import { getIndex, getSectionsByPath } from './index-store.js';
import * as crypto from 'crypto';

export async function comparePath(
  path: string,
  left: 'main' | 'develop',
  right: 'main' | 'develop'
): Promise<CompareResult> {
  const leftIndex = getIndex(left);
  const rightIndex = getIndex(right);

  const leftSections = getSectionsByPath(path, left);
  const rightSections = getSectionsByPath(path, right);

  const leftExists = leftSections.length > 0;
  const rightExists = rightSections.length > 0;

  const leftSnapshot: BranchSnapshot = {
    exists: leftExists,
    page_title: leftSections[0]?.page_title,
    sections: leftSections.map(s => s.section_title),
    content_hash: hashContent(leftSections),
  };

  const rightSnapshot: BranchSnapshot = {
    exists: rightExists,
    page_title: rightSections[0]?.page_title,
    sections: rightSections.map(s => s.section_title),
    content_hash: hashContent(rightSections),
  };

  const summary = generateChangeSummary(leftSnapshot, rightSnapshot, path);

  return {
    path,
    left: leftSnapshot,
    right: rightSnapshot,
    changes: summary,
    canonical_urls: {
      left: leftExists ? `${URL_TEMPLATES.canonical[left]}/${path}` : '',
      right: rightExists ? `${URL_TEMPLATES.canonical[right]}/${path}` : '',
    },
    repo_urls: {
      left: leftExists ? `${URL_TEMPLATES.repo.blob}/${leftIndex.commit_sha}/${path}.mdx` : '',
      right: rightExists ? `${URL_TEMPLATES.repo.blob}/${rightIndex.commit_sha}/${path}.mdx` : '',
    },
    commit_shas: {
      left: leftIndex.commit_sha,
      right: rightIndex.commit_sha,
    },
  };
}

function hashContent(sections: IndexedSection[]): string {
  const content = sections.map((s: IndexedSection) => s.content).join('\n');
  return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
}

function generateChangeSummary(
  left: BranchSnapshot,
  right: BranchSnapshot,
  path: string
): ChangeSummary {
  if (!left.exists && right.exists) {
    return {
      status: 'added',
      section_count_delta: right.sections.length,
      summary: `Document '${path}' was added in ${right.sections.length} sections`,
    };
  }

  if (left.exists && !right.exists) {
    return {
      status: 'removed',
      section_count_delta: -left.sections.length,
      summary: `Document '${path}' was removed`,
    };
  }

  if (left.content_hash === right.content_hash) {
    return {
      status: 'unchanged',
      section_count_delta: 0,
      summary: `Document '${path}' is unchanged`,
    };
  }

  const addedSections = right.sections.filter(s => !left.sections.includes(s));
  const removedSections = left.sections.filter(s => !right.sections.includes(s));

  return {
    status: 'modified',
    section_count_delta: right.sections.length - left.sections.length,
    summary: `Document '${path}' modified: ${addedSections.length} added, ${removedSections.length} removed`,
  };
}