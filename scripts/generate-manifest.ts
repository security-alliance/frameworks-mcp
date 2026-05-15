#!/usr/bin/env tsx
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

interface ManifestFile {
  path: string;
  sha256: string;
  size: number;
}

interface Manifest {
  schema_version: 1;
  generated_at: string;
  files: ManifestFile[];
}

function hashFile(filePath: string): string {
  const data = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(data).digest('hex');
}

async function main() {
  const args = process.argv.slice(2);
  const indexDirIndex = args.indexOf('--index-dir');
  const indexDir = (indexDirIndex >= 0 && args[indexDirIndex + 1]) ? args[indexDirIndex + 1] : path.join(process.cwd(), 'indexes');
  const outputPath = path.join(indexDir, 'manifest.json');

  const files: ManifestFile[] = [];
  for (const filename of ['main-index.json', 'develop-index.json']) {
    const fp = path.join(indexDir, filename);
    if (fs.existsSync(fp)) {
      const stat = fs.statSync(fp);
      files.push({
        path: filename,
        sha256: hashFile(fp),
        size: stat.size,
      });
    }
  }

  const manifest: Manifest = {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    files,
  };

  fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2));
  console.log(`Manifest written to ${outputPath}`);
  for (const f of files) {
    console.log(`  ${f.path}: ${f.sha256} (${f.size} bytes)`);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
