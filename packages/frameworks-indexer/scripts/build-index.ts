#!/usr/bin/env tsx
import { buildIndex } from '../src/index-builder.js';
import * as fs from 'fs';
import * as path from 'path';

interface Args {
  branch: 'main' | 'develop';
  sha: string;
  output?: string;
  contentDir?: string;
}

function parseArgs(): Args {
  const args = process.argv.slice(2);
  const result: Args = {
    branch: 'main',
    sha: process.env.GITHUB_SHA || 'unknown',
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--branch' && args[i + 1]) {
      result.branch = args[i + 1] as 'main' | 'develop';
      i++;
    } else if (args[i] === '--sha' && args[i + 1]) {
      result.sha = args[i + 1];
      i++;
    } else if (args[i] === '--output' && args[i + 1]) {
      result.output = args[i + 1];
      i++;
    } else if (args[i] === '--content-dir' && args[i + 1]) {
      result.contentDir = args[i + 1];
      i++;
    }
  }

  return result;
}

async function main() {
  const args = parseArgs();
  const workspaceRoot = process.cwd();
  const contentDir = args.contentDir || path.join(workspaceRoot, 'docs', 'pages');
  const outputDir = args.output || process.env.INDEX_OUTPUT_DIR || path.join(workspaceRoot, 'indexes');

  console.log(`Building ${args.branch} index (sha: ${args.sha})...`);
  console.log(`Content dir: ${contentDir}`);

  const index = await buildIndex({
    branch: args.branch,
    contentDir,
    commitSha: args.sha,
  });

  fs.mkdirSync(outputDir, { recursive: true });

  const outputPath = path.join(outputDir, `${args.branch}-index.json`);
  fs.writeFileSync(outputPath, JSON.stringify(index, null, 2));

  console.log(`Index written to ${outputPath}`);
  console.log(`  - ${index.section_count} sections`);
  console.log(`  - ${index.frameworks.length} frameworks`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});