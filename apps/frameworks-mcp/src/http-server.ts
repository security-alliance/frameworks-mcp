#!/usr/bin/env tsx
/**
 * HTTP server wrapper for the MCP server
 *
 * This allows agents that use HTTP-based MCP (like OpenAI Agents SDK)
 * to connect to the frameworks MCP server via HTTP instead of stdio.
 *
 * Usage:
 *   pnpm run serve:http
 *
 * Environment variables:
 *   HTTP_PORT    - Port to listen on (default: 3000)
 *   INDEX_DIR    - Directory containing indexes (default: ./indexes)
 *   API_KEY      - Optional Bearer token for authentication (default: none)
 *   RATE_LIMIT   - Per-client requests per minute (default: 100)
 *   CORS_ORIGINS - Allowed origins for CORS (default: *)
 */

import * as http from 'http';
import * as path from 'path';
import { loadIndexes } from './services/index-store.js';
import {
  rateLimiter,
  sanitizeInput,
  checkApiKey,
  parseBody,
  getClientId,
  getCorsHeaders,
  getSecurityHeaders,
  sanitizeError,
} from './security/middleware.js';
import { logger } from './utils/logger.js';

const PORT = parseInt(process.env.HTTP_PORT || '3000', 10);

if (Number.isNaN(PORT) || PORT < 1 || PORT > 65535) {
  throw new Error(`Invalid HTTP_PORT env var: ${process.env.HTTP_PORT}`);
}

const MAX_BODY_SIZE = 1024 * 1024;

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: number | string | null;
  method: string;
  params?: {
    name: string;
    arguments?: Record<string, unknown>;
  };
}

function sendJson(res: http.ServerResponse, statusCode: number, body: unknown, extraHeaders: Record<string, string> = {}): void {
  const headers: Record<string, string> = {
    ...getSecurityHeaders(),
    ...getCorsHeaders(),
    ...extraHeaders,
  };
  res.writeHead(statusCode, headers);
  res.end(JSON.stringify(body));
}

async function handleRequest(req: http.IncomingMessage, res: http.ServerResponse) {
  const start = Date.now();
  const method = req.method || 'GET';
  const url = req.url || '/';

  try {
    if (req.method === 'OPTIONS') {
      sendJson(res, 204, '', getCorsHeaders());
      logger.debug('OPTIONS preflight', { path: url });
      return;
    }

    if (req.method === 'GET' && req.url === '/health') {
      sendJson(res, 200, { status: 'ok', server: 'frameworks-mcp' });
      logger.debug('Health check', { duration: Date.now() - start });
      return;
    }

    if (req.method === 'GET' && req.url === '/tools/list') {
      if (!checkApiKey(req)) {
        sendJson(res, 401, { error: 'Unauthorized' });
        return;
      }
      const clientId = getClientId(req);
      if (!rateLimiter.check(clientId)) {
        sendJson(res, 429, { error: 'Rate limit exceeded. Please try again later.' });
        logger.warn('Rate limit exceeded on tools/list', { clientId });
        return;
      }
      const tools = await listTools();
      sendJson(res, 200, { tools });
      logger.info('Listed tools', { duration: Date.now() - start });
      return;
    }

    if (req.method !== 'POST' || req.url !== '/tools/call') {
      sendJson(res, 404, { error: 'Not found' });
      logger.warn('Unknown endpoint', { method, path: url });
      return;
    }

    if (!checkApiKey(req)) {
      sendJson(res, 401, { error: 'Unauthorized' });
      logger.warn('Unauthorized request', { path: url, clientId: getClientId(req) });
      return;
    }

    const clientId = getClientId(req);
    if (!rateLimiter.check(clientId)) {
      sendJson(res, 429, {
        jsonrpc: '2.0',
        error: { code: -32000, message: 'Rate limit exceeded. Please try again later.' },
        id: null,
      });
      logger.warn('Rate limit exceeded', { clientId });
      return;
    }

    let raw = '';
    let bytesRead = 0;
    for await (const chunk of req) {
      bytesRead += chunk.length;
      if (bytesRead > MAX_BODY_SIZE) {
        sendJson(res, 413, { error: 'Request body too large' });
        logger.warn('Request body exceeded limit', { clientId, bytesAttempted: bytesRead });
        return;
      }
      raw += chunk;
    }

    let request: JsonRpcRequest;
    try {
      request = parseBody(raw) as JsonRpcRequest;
    } catch {
      sendJson(res, 400, {
        jsonrpc: '2.0',
        error: { code: -32700, message: 'Invalid JSON' },
        id: null,
      });
      return;
    }

    if (request.method === 'tools/call' && request.params) {
      const sanitizedArgs = sanitizeInput(request.params.arguments || {});
      const result = await callTool(request.params.name, sanitizedArgs);
      sendJson(res, 200, { result, id: request.id, jsonrpc: '2.0' });
      logger.info('Tool called', { tool: request.params.name, clientId, duration: Date.now() - start });
    } else if (request.method === 'tools/list') {
      const tools = await listTools();
      sendJson(res, 200, { result: { tools }, id: request.id, jsonrpc: '2.0' });
    } else {
      sendJson(res, 400, {
        jsonrpc: '2.0',
        error: { code: -32600, message: 'Unknown method' },
        id: request.id,
      });
    }
  } catch (err) {
    logger.error('Request error', { error: err instanceof Error ? err.message : String(err), method, path: url });
    sendJson(res, 500, {
      jsonrpc: '2.0',
      error: { code: -32603, message: 'Internal server error' },
      id: null,
    });
  }
}

let toolsCache: unknown[] = [];

async function listTools() {
  return toolsCache;
}

async function callTool(name: string, args: Record<string, unknown>) {
  const { handleSearch } = await import('./tools/search.js');
  const { handleFetch } = await import('./tools/fetch.js');
  const { handleCompare } = await import('./tools/compare.js');
  const { handleList } = await import('./tools/list.js');

  switch (name) {
    case 'search_frameworks':
      return await handleSearch(args);
    case 'fetch_framework_section':
      return await handleFetch(args);
    case 'compare_framework_path':
      return await handleCompare(args);
    case 'list_frameworks':
      return await handleList(args);
    default:
      return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
  }
}

async function main() {
  logger.info('Loading indexes...');

  const indexDir = process.env.INDEX_DIR || path.join(process.cwd(), 'indexes');
  await loadIndexes(indexDir);

  logger.info('Indexes loaded successfully');

  const { searchTool } = await import('./tools/search.js');
  const { fetchTool } = await import('./tools/fetch.js');
  const { compareTool } = await import('./tools/compare.js');
  const { listTool } = await import('./tools/list.js');
  toolsCache = [searchTool, fetchTool, compareTool, listTool];

  const httpServer = http.createServer(handleRequest);

  httpServer.listen(PORT, () => {
    logger.info(`HTTP MCP server listening on http://localhost:${PORT}`);
    logger.info('  GET  /health      - Health check');
    logger.info('  GET  /tools/list   - List available tools');
    logger.info('  POST /tools/call   - Call a tool');
    if (process.env.API_KEY) {
      logger.info('  Authentication: Bearer token required');
    } else {
      logger.warn('  No API_KEY set - server is unauthenticated');
    }
  });

  httpServer.timeout = 30000;
  httpServer.headersTimeout = 10000;
  httpServer.requestTimeout = 30000;
}

main().catch((error) => {
  logger.error('Server failed to start', { error });
  process.exit(1);
});