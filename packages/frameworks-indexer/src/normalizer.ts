import { SAFE_COMPONENTS, COMPONENT_PATTERN } from './constants.js';

export function normalizeMdxToPlainText(mdx: string): string {
  let text = mdx;

  // Strip disallowed JSX components and self-closing tags
  text = text.replace(COMPONENT_PATTERN, (match, componentName) => {
    if (SAFE_COMPONENTS.has(componentName)) {
      return match;
    }
    return '';
  });

  // Handle lowercase/unknown JSX tags (including fragments and mismatched close tags)
  text = text.replace(/<([a-zA-Z][^>]*)>([\s\S]*?)<\/[a-zA-Z]+>/g, (_match, tag: string, content: string) => {
    const componentName = tag.split(/[\s/]/)[0];
    if (SAFE_COMPONENTS.has(componentName)) {
      return content;
    }
    return '';
  });
  text = text.replace(/<[a-zA-Z][^>]*\/>/g, '');

  // Remove remaining stray closing tags like </TagProvider
  text = text.replace(/<\/[^>]+>/g, '');

  // Remove code blocks and inline code
  text = text.replace(/```[\s\S]*?```/g, '');
  text = text.replace(/`[^`]+`/g, '');

  // Convert markdown links to just the text
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  // Remove markdown formatting chars
  text = text.replace(/[#*_~>]/g, ' ');
  text = text.replace(/\s+/g, ' ').trim();

  return text;
}

export function generateSnippet(text: string, maxLength: number = 200): string {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= maxLength) return cleaned;
  return cleaned.substring(0, maxLength - 3) + '...';
}

export function generateHeadingAnchor(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// Deprecated: IDs are now path#anchor. Kept for compat in other callers if needed.
export function generateSectionId(path: string, heading: string, salt: string): string {
  console.warn('generateSectionId is deprecated; IDs are now stable path#anchor');
  const input = `${salt}:${path}:${heading}`;
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const suffix = (hash & 0xfff).toString(36);
  const prefix = Math.abs(hash >>> 12).toString(36).padStart(4, '0');
  return `${prefix}${suffix}`;
}
