import matter from 'gray-matter';
import * as crypto from 'crypto';
import { IndexedSection } from './types.js';
import { normalizeMdxToPlainText, generateSnippet, generateHeadingAnchor } from './normalizer.js';
import { URL_TEMPLATES } from './constants.js';

export interface SectionParseResult {
  heading: string;
  level: number;
  content: string;
  anchor: string;
}

export function parseHeadings(mdx: string): SectionParseResult[] {
  const sections: SectionParseResult[] = [];
  const lines = mdx.split('\n');

  let currentHeading = '';
  let currentLevel = 0;
  let currentContent: string[] = [];
  let inCodeBlock = false;

  for (const line of lines) {
    if (line.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      currentContent.push(line);
      continue;
    }

    if (inCodeBlock) {
      currentContent.push(line);
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      if (currentHeading) {
        sections.push({
          heading: currentHeading,
          level: currentLevel,
          content: currentContent.join('\n'),
          anchor: generateHeadingAnchor(currentHeading),
        });
      }
      currentHeading = headingMatch[2].trim();
      currentLevel = headingMatch[1].length;
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }

  if (currentHeading) {
    sections.push({
      heading: currentHeading,
      level: currentLevel,
      content: currentContent.join('\n'),
      anchor: generateHeadingAnchor(currentHeading),
    });
  }

  return sections;
}

export interface ExtractOptions {
  filePath: string;
  mdxContent: string;
  commitSha: string;
  branch: 'main' | 'develop';
}

function hashContent(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);
}

export function extractSections(options: ExtractOptions): IndexedSection[] {
  const { filePath, mdxContent, commitSha, branch } = options;

  const { data: frontmatter, content: mdxBody } = matter(mdxContent);

  if (branch === 'main' && frontmatter.dev === true) {
    return [];
  }

  const headings = parseHeadings(mdxBody);
  const pathWithoutExt = filePath.replace(/\.(mdx?|md)$/, '');
  const pageTitle = frontmatter.title?.replace(/\|.*$/, '').trim() || headings[0]?.heading || pathWithoutExt;
  const framework = pathWithoutExt.split('/')[0] || 'general';
  const tags: string[] = frontmatter.tags || [];
  const description: string | undefined = frontmatter.description;

  return headings.map((h) => {
    const normalizedContent = normalizeMdxToPlainText(h.content);
    const sourceFilePath = `docs/pages/${pathWithoutExt}.mdx`;
    const githubUrl = `${URL_TEMPLATES.repo.blob}/${commitSha}/${sourceFilePath}`;

    const id = `${pathWithoutExt}#${h.anchor}`;

    return {
      id,
      branch,
      path: pathWithoutExt,
      page_title: pageTitle,
      section_title: h.heading,
      framework,
      tags,
      content: normalizedContent,
      snippet: generateSnippet(normalizedContent),
      canonical_url: `${URL_TEMPLATES.canonical[branch]}/${pathWithoutExt}#${h.anchor}`,
      repo_url: githubUrl,
      source_url: `${URL_TEMPLATES.canonical[branch]}/${pathWithoutExt}#${h.anchor}`,
      github_url: githubUrl,
      commit_sha: commitSha,
      heading_anchor: h.anchor,
      source_file: sourceFilePath,
      description,
      status: (branch === 'develop' ? 'draft' : 'stable') as 'stable' | 'draft',
      content_hash: hashContent(normalizedContent),
    } satisfies IndexedSection;
  });
}
