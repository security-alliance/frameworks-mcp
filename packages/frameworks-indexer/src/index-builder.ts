import * as fs from 'fs';
import * as path from 'path';
import { FrameworkIndex, IndexedSection, FrameworkMetadata } from './types.js';
import { extractSections } from './sectionizer.js';

interface BuildIndexOptions {
  branch: 'main' | 'develop';
  contentDir: string;
  commitSha: string;
}

export async function buildIndex(options: BuildIndexOptions): Promise<FrameworkIndex> {
  const { branch, contentDir, commitSha } = options;

  const sections: IndexedSection[] = [];
  const sectionsById: Record<string, IndexedSection> = {};
  const frameworkCounts: Record<string, { count: number; tags: Set<string> }> = {};

  async function walkDir(dir: string, basePath: string = ''): Promise<void> {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.join(basePath, entry.name);

      if (entry.isDirectory()) {
        await walkDir(fullPath, relativePath);
      } else if (entry.name.endsWith('.mdx') || entry.name.endsWith('.md')) {
        try {
          const rawContent = fs.readFileSync(fullPath, 'utf-8');
          const pageSections = extractSections({
            filePath: relativePath,
            mdxContent: rawContent,
            commitSha,
            branch,
          });

          for (const section of pageSections) {
            sections.push(section);
            sectionsById[section.id] = section;

            const fw = section.framework;
            if (!frameworkCounts[fw]) {
              frameworkCounts[fw] = { count: 0, tags: new Set() };
            }
            frameworkCounts[fw].count++;
            section.tags.forEach((t: string) => frameworkCounts[fw].tags.add(t));
          }
        } catch (err) {
          console.warn(`Failed to parse ${fullPath}: ${err}`);
        }
      }
    }
  }

  await walkDir(contentDir);

  const frameworks: FrameworkMetadata[] = Object.entries(frameworkCounts).map(([name, data]) => ({
    name,
    path: name,
    framework: name,
    section_count: data.count,
    tags: Array.from(data.tags),
  }));

  return {
    branch,
    commit_sha: commitSha,
    generated_at: new Date().toISOString(),
    section_count: sections.length,
    sections,
    sections_by_id: sectionsById,
    frameworks,
  };
}