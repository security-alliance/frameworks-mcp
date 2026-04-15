import { describe, it, expect } from 'vitest';
import { normalizeMdxToPlainText, generateSnippet, generateHeadingAnchor, generateSectionId } from '@security-alliance/frameworks-indexer';

describe('normalizer', () => {
  it('should strip JSX components', () => {
    const mdx = '<TagList tags={frontmatter.tags} />';
    expect(normalizeMdxToPlainText(mdx)).toBe('');
  });

  it('should preserve safe components (self-closing)', () => {
    const mdx = '<TagList tags={frontmatter.tags} />';
    expect(normalizeMdxToPlainText(mdx)).toBe('');
  });

  it('should extract text from safe paired components', () => {
    const mdx = '<Callout>Important text</Callout>';
    const result = normalizeMdxToPlainText(mdx);
    expect(result).toContain('Important text');
  });

  it('should strip unsafe paired components including their content', () => {
    const mdx = '<Dangerous>Remove this</Dangerous>';
    expect(normalizeMdxToPlainText(mdx)).toBe('');
  });

  it('should remove code blocks', () => {
    const mdx = 'Some text ```code``` more text';
    expect(normalizeMdxToPlainText(mdx)).toBe('Some text more text');
  });

  it('should normalize links', () => {
    const mdx = 'Check [this link](https://example.com) for info';
    expect(normalizeMdxToPlainText(mdx)).toBe('Check this link for info');
  });
});

describe('generateSnippet', () => {
  it('should truncate long text', () => {
    const long = 'a'.repeat(300);
    expect(generateSnippet(long)).toHaveLength(200);
    expect(generateSnippet(long).endsWith('...')).toBe(true);
  });

  it('should not truncate short text', () => {
    const short = 'short text';
    expect(generateSnippet(short)).toBe(short);
  });
});

describe('generateHeadingAnchor', () => {
  it('should lowercase and hyphenate', () => {
    expect(generateHeadingAnchor('Hello World')).toBe('hello-world');
  });

  it('should remove special characters', () => {
    expect(generateHeadingAnchor('Test@#!')).toBe('test');
  });
});

describe('generateSectionId', () => {
  it('should generate consistent IDs', () => {
    const id1 = generateSectionId('path', 'heading', 'salt');
    const id2 = generateSectionId('path', 'heading', 'salt');
    expect(id1).toBe(id2);
  });

  it('should generate different IDs for different inputs', () => {
    const id1 = generateSectionId('path1', 'heading', 'salt');
    const id2 = generateSectionId('path2', 'heading', 'salt');
    expect(id1).not.toBe(id2);
  });
});