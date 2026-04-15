import { Tool } from '@modelcontextprotocol/sdk/types';
import { z } from 'zod';
import { comparePath } from '../services/compare-service.js';

export const compareTool: Tool = {
  name: 'compare_framework_path',
  description: 'Compare the same document path between main and develop branches.',
  inputSchema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Document path (e.g., "ai-security/prompt-injection-defenses")',
      },
      left: {
        type: 'string',
        enum: ['main', 'develop'],
        default: 'main',
        description: 'Left branch for comparison',
      },
      right: {
        type: 'string',
        enum: ['main', 'develop'],
        default: 'develop',
        description: 'Right branch for comparison',
      },
    },
    required: ['path'],
  },
};

const compareSchema = z.object({
  path: z.string().min(1),
  left: z.enum(['main', 'develop']).default('main'),
  right: z.enum(['main', 'develop']).default('develop'),
});

export async function handleCompare(args: unknown) {
  const { path, left, right } = compareSchema.parse(args);

  const result = await comparePath(path, left, right);

  return {
    content: [{
      type: 'text',
      text: JSON.stringify(result, null, 2),
    }],
  };
}