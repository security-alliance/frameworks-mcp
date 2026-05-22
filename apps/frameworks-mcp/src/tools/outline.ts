import { Tool } from '@modelcontextprotocol/sdk/types';
import { z } from 'zod';
import { getIndex } from '../services/index-store.js';
import { URL_TEMPLATES } from '@security-alliance/frameworks-indexer';

export const outlineTool: Tool = {
  name: 'get_framework_outline',
  description:
    'Return the hierarchical structure of a framework: pages and their sections in document order. Use this before fetching content to understand what a framework covers and navigate it sequentially.',
  inputSchema: {
    type: 'object',
    properties: {
      framework: {
        type: 'string',
        description: 'Framework name (e.g. "incident-management"). Use list_frameworks to discover valid names.',
      },
      branch: {
        type: 'string',
        enum: ['main', 'develop'],
        default: 'main',
        description: 'Branch to read from: main (stable) or develop (draft)',
      },
    },
    required: ['framework'],
  },
};

const outlineSchema = z.object({
  framework: z.string().min(1).max(200),
  branch: z.enum(['main', 'develop']).default('main'),
});

export async function handleOutline(args: unknown) {
  const { framework, branch } = outlineSchema.parse(args);

  const index = getIndex(branch);

  const sections = index.sections.filter(s => s.framework === framework);

  if (sections.length === 0) {
    return {
      content: [{
        type: 'text',
        text: `Framework not found: "${framework}". Use list_frameworks to see available names.`,
      }],
      isError: true,
    };
  }

  // Group sections by page path, preserving index order
  const pageMap = new Map<string, typeof sections>();
  for (const section of sections) {
    let pageSections = pageMap.get(section.path);
    if (!pageSections) {
      pageSections = [];
      pageMap.set(section.path, pageSections);
    }
    pageSections.push(section);
  }

  const pages = Array.from(pageMap.entries()).map(([pagePath, pageSections]) => {
    const first = pageSections[0]!;
    return {
      path: pagePath,
      page_title: first.page_title,
      canonical_url: `${URL_TEMPLATES.canonical[branch]}/${pagePath}`,
      github_url: `${URL_TEMPLATES.repo.blob}/${index.commit_sha}/docs/pages/${pagePath}.mdx`,
      status: first.status,
      section_count: pageSections.length,
      sections: pageSections.map(s => ({
        id: s.id,
        section_title: s.section_title,
        heading_anchor: s.heading_anchor,
        canonical_url: s.canonical_url,
      })),
    };
  });

  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        framework,
        branch,
        is_draft: branch === 'develop',
        commit_sha: index.commit_sha,
        page_count: pages.length,
        section_count: sections.length,
        pages,
      }, null, 2),
    }],
  };
}
