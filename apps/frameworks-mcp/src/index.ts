#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import * as fs from 'fs';
import * as path from 'path';
import { loadIndexes } from './services/index-store.js';
import { searchTool, handleSearch } from './tools/search.js';
import { fetchTool, handleFetch } from './tools/fetch.js';
import { compareTool, handleCompare } from './tools/compare.js';
import { listTool, handleList } from './tools/list.js';
import { rateLimiter, sanitizeInput, getClientId, sanitizeError } from './security/middleware.js';
import { logger } from './utils/logger.js';

const server = new Server(
  {
    name: 'frameworks-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [searchTool, fetchTool, compareTool, listTool],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
  const { name, arguments: args } = request.params;

  const clientId = getClientId({ headers: request.headers });
  if (!rateLimiter.check(clientId)) {
    return {
      content: [{ type: 'text', text: 'Rate limit exceeded. Please try again later.' }],
      isError: true,
    };
  }

  try {
    const sanitizedArgs = sanitizeInput(args || {});

    switch (name) {
      case 'search_frameworks':
        return await handleSearch(sanitizedArgs);
      case 'fetch_framework_section':
        return await handleFetch(sanitizedArgs);
      case 'compare_framework_path':
        return await handleCompare(sanitizedArgs);
      case 'list_frameworks':
        return await handleList(sanitizedArgs);
      default:
        return {
          content: [{ type: 'text', text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }
  } catch (error) {
    logger.error('Tool execution failed', { tool: name, error: error instanceof Error ? error.message : String(error) });
    return {
      content: [{
        type: 'text',
        text: sanitizeError(error),
      }],
      isError: true,
    };
  }
});

async function main() {
  logger.info('Loading indexes...');

  const indexDir = process.env.INDEX_DIR || findIndexDir();
  await loadIndexes(indexDir);

  logger.info('Indexes loaded successfully');

  const transport = new StdioServerTransport();
  await server.connect(transport);

  logger.info('MCP Server connected and ready');
}

function findIndexDir(): string {
  const envIndex = process.env.INDEX_DIR;
  if (envIndex) return envIndex;

  let dir = process.cwd();
  for (let i = 0; i < 5; i++) {
    const indexesPath = path.join(dir, 'indexes');
    if (fs.existsSync(indexesPath)) {
      return indexesPath;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  return path.join(process.cwd(), 'indexes');
}

main().catch((error) => {
  logger.error('Server failed to start', { error });
  process.exit(1);
});