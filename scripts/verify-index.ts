#!/usr/bin/env tsx
import * as fs from 'fs';
import * as path from 'path';

interface Args {
  indexDir: string;
}

function parseArgs(): Args {
  const args = process.argv.slice(2);
  const result: Args = {
    indexDir: 'indexes',
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--index-dir' && args[i + 1]) {
      result.indexDir = args[i + 1];
      i++;
    }
  }

  return result;
}

interface IndexedSection {
  id: string;
  branch: 'main' | 'develop';
  path: string;
  page_title: string;
  section_title: string;
  framework: string;
  tags: string[];
  content: string;
  snippet: string;
  canonical_url: string;
  repo_url: string;
  commit_sha: string;
  heading_anchor: string;
  source_file: string;
}

interface FrameworkIndex {
  branch: 'main' | 'develop';
  commit_sha: string;
  generated_at: string;
  section_count: number;
  sections: IndexedSection[];
  sections_by_id: Record<string, IndexedSection>;
  frameworks: FrameworkMetadata[];
}

interface FrameworkMetadata {
  name: string;
  path: string;
  framework: string;
  section_count: number;
  tags: string[];
}

function validateIndex(index: FrameworkIndex, branch: string): string[] {
  const errors: string[] = [];

  if (!index.branch) {
    errors.push(`Missing branch field`);
  }

  if (typeof index.schema_version !== 'number') {
    errors.push(`Missing schema_version`);
  }

  if (!index.commit_sha) {
    errors.push(`Missing commit_sha`);
  }

  if (!index.generated_at) {
    errors.push(`Missing generated_at`);
  }

  if (typeof index.section_count !== 'number') {
    errors.push(`Missing section_count`);
  }

  if (!Array.isArray(index.sections)) {
    errors.push(`sections is not an array`);
  } else {
    for (let i = 0; i < index.sections.length; i++) {
      const section = index.sections[i];
      if (!section.id) errors.push(`Section ${i} missing id`);
      if (!section.path) errors.push(`Section ${i} missing path`);
      if (!section.page_title) errors.push(`Section ${i} missing page_title`);
      if (!section.section_title) errors.push(`Section ${i} missing section_title`);
      if (!section.canonical_url) errors.push(`Section ${i} missing canonical_url`);
      if (!section.repo_url) errors.push(`Section ${i} missing repo_url`);
      if (!section.commit_sha) errors.push(`Section ${i} missing commit_sha`);
      if (!section.content) errors.push(`Section ${i} missing content`);
    }
  }

  if (!Array.isArray(index.frameworks)) {
    errors.push(`frameworks is not an array`);
  }

  if (index.sections.length !== index.section_count) {
    errors.push(`section_count mismatch: ${index.section_count} vs ${index.sections.length}`);
  }

  return errors;
}

async function main() {
  const args = parseArgs();
  console.log(`Verifying indexes in ${args.indexDir}...`);

  const indexFiles = ['main-index.json', 'develop-index.json'];
  let hasErrors = false;

  for (const filename of indexFiles) {
    const filepath = path.join(args.indexDir, filename);
    console.log(`\nChecking ${filename}...`);

    if (!fs.existsSync(filepath)) {
      console.log(`  SKIP: File not found`);
      continue;
    }

    try {
      const data = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
      const errors = validateIndex(data, filename);

      if (errors.length > 0) {
        console.log(`  ERRORS:`);
        errors.forEach(e => console.log(`    - ${e}`));
        hasErrors = true;
      } else {
        console.log(`  OK: ${data.section_count} sections, ${data.frameworks.length} frameworks`);
        console.log(`  Commit: ${data.commit_sha}`);
        console.log(`  Generated: ${data.generated_at}`);
      }
    } catch (err) {
      console.log(`  ERROR: ${err}`);
      hasErrors = true;
    }
  }

  if (hasErrors) {
    console.log('\nVerification FAILED');
    process.exit(1);
  } else {
    console.log('\nVerification PASSED');
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});