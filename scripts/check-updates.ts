#!/usr/bin/env tsx
/**
 * Check for index updates and optionally rebuild
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const INDEXES_DIR = path.join(process.cwd(), 'indexes');
const FRAMEWORKS_REPO = path.join(process.cwd(), 'frameworks-repo');

interface IndexInfo {
  branch: string;
  commit_sha: string;
  generated_at: string;
  section_count: number;
}

function loadIndexInfo(branch: 'main' | 'develop'): IndexInfo | null {
  const indexPath = path.join(INDEXES_DIR, `${branch}-index.json`);
  if (!fs.existsSync(indexPath)) return null;
  try {
    const data = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
    return {
      branch: data.branch,
      commit_sha: data.commit_sha,
      generated_at: data.generated_at,
      section_count: data.section_count,
    };
  } catch {
    return null;
  }
}

function getRepoHead(repoPath: string): string | null {
  try {
    return execSync('git rev-parse HEAD', { cwd: repoPath }).toString().trim();
  } catch {
    return null;
  }
}

async function main() {
  console.log('=== Frameworks MCP Index Update Checker ===\n');

  const hasFrameworksRepo = fs.existsSync(path.join(FRAMEWORKS_REPO, '.git'));
  const hasIndexes = fs.existsSync(INDEXES_DIR);

  // Check main index
  const mainInfo = loadIndexInfo('main');
  const developInfo = loadIndexInfo('develop');

  console.log('Current Index Status:');
  console.log(`  Main:    ${mainInfo ? `${mainInfo.section_count} sections @ ${mainInfo.commit_sha.substring(0, 8)}` : 'NOT BUILT'}`);
  console.log(`  Develop: ${developInfo ? `${developInfo.section_count} sections @ ${developInfo.commit_sha.substring(0, 8)}` : 'NOT BUILT'}`);

  if (!hasIndexes) {
    console.log('\nNo indexes found. Run: pnpm run index:build');
    return;
  }

  if (!hasFrameworksRepo) {
    console.log('\n[NOTE] frameworks-repo not found. To update indexes:');
    console.log('  1. git clone https://github.com/security-alliance/frameworks frameworks-repo');
    console.log('  2. pnpm run index:build');
    return;
  }

  const repoHead = getRepoHead(FRAMEWORKS_REPO);
  console.log(`\nFrameworks repo HEAD: ${repoHead?.substring(0, 8) || 'unknown'}`);

  const needsUpdate = mainInfo?.commit_sha !== repoHead;
  
  if (needsUpdate) {
    console.log('\n[UPDATE AVAILABLE] Index is behind current frameworks repo.');
    console.log('  Run: pnpm run index:build -- --branch main --sha <sha> -- --content-dir $(pwd)/frameworks-repo/docs/pages');
    console.log('  Run: pnpm run index:build -- --branch develop --sha <sha> -- --content-dir $(pwd)/frameworks-repo/docs/pages');
  } else {
    console.log('\n[OK] Indexes are up to date with frameworks repo.');
  }

  // Show age of indexes
  if (mainInfo?.generated_at) {
    const age = Date.now() - new Date(mainInfo.generated_at).getTime();
    const hours = Math.floor(age / (1000 * 60 * 60));
    if (hours > 24) {
      console.log(`\n[WARNING] Main index is ${hours} hours old. Consider rebuilding.`);
    }
  }
}

main().catch(console.error);