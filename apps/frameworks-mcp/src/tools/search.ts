import { Tool } from '@modelcontextprotocol/sdk/types';
import { z } from 'zod';
import { searchSections } from '../services/search-service.js';

export const searchTool: Tool = {
  name: 'search_frameworks',
  description: 'Search section-level indexed content from the SEAL Frameworks documentation. Returns ranked results with snippets.',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search query string',
      },
      branch: {
        type: 'string',
        enum: ['main', 'develop', 'both'],
        default: 'main',
        description: 'Branch to search: main (stable), develop (draft), or both',
      },
      framework: {
        type: 'string',
        description: 'Filter by framework/category name',
      },
      tags: {
        type: 'array',
        items: { type: 'string' },
        description: 'Filter by tags',
      },
      limit: {
        type: 'number',
        default: 20,
        description: 'Maximum number of results to return',
      },
    },
    required: ['query'],
  },
};

const searchSchema = z.object({
  query: z.string().min(1).max(500),
  branch: z.enum(['main', 'develop', 'both']).default('main'),
  framework: z.string().optional(),
  tags: z.array(z.string()).optional(),
  limit: z.number().min(1).max(100).default(20),
});

export async function handleSearch(args: unknown) {
  const { query, branch, framework, tags, limit } = searchSchema.parse(args);

  const results = await searchSections({
    query,
    branch,
    framework,
    tags,
    limit,
  });

  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        query,
        branch,
        total: results.length,
        results: results.map(r => ({
          id: r.id,
          branch: r.branch,
          path: r.path,
          page_title: r.page_title,
          section_title: r.section_title,
          framework: r.framework,
          tags: r.tags,
          snippet: r.snippet,
          canonical_url: r.canonical_url,
          repo_url: r.repo_url,
          commit_sha: r.commit_sha,
          score: r.score,
          is_draft: r.branch === 'develop',
        })),
      }, null, 2),
    }],
  };
}