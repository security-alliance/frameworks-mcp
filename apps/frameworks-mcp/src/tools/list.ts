import { Tool } from '@modelcontextprotocol/sdk/types';
import { z } from 'zod';
import { getIndex } from '../services/index-store.js';
import { URL_TEMPLATES } from '@security-alliance/frameworks-indexer';

export const listTool: Tool = {
  name: 'list_frameworks',
  description: 'List available frameworks/top-level categories on a branch.',
  inputSchema: {
    type: 'object',
    properties: {
      branch: {
        type: 'string',
        enum: ['main', 'develop'],
        default: 'main',
        description: 'Branch to list frameworks from',
      },
    },
  },
};

const listSchema = z.object({
  branch: z.enum(['main', 'develop']).default('main'),
});

export async function handleList(args: unknown) {
  const { branch } = listSchema.parse(args);

  const index = getIndex(branch);

  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        branch,
        is_draft: branch === 'develop',
        total: index.frameworks.length,
        frameworks: index.frameworks.map(f => ({
          name: f.name,
          path: f.path,
          framework: f.framework,
          section_count: f.section_count,
          tags: f.tags,
          canonical_url: `${URL_TEMPLATES.canonical[branch]}/${f.path}`,
        })),
      }, null, 2),
    }],
  };
}