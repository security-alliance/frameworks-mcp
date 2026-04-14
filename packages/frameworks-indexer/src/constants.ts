export const URL_TEMPLATES = {
  canonical: {
    main: 'https://frameworks.securityalliance.org',
    develop: 'https://frameworks.securityalliance.dev',
  },
  repo: {
    blob: 'https://github.com/security-alliance/frameworks/blob',
    raw: 'https://raw.githubusercontent.com/security-alliance/frameworks',
  },
} as const;

export const SECTION_ID_SALT = 'seal-frameworks-v1';

export const SAFE_COMPONENTS = new Set([
  'TagList',
  'AttributionList',
  'TagFilter',
  'ContributeFooter',
  'Contributors',
  'CertList',
  'MermaidRenderer',
  'BadgeLegend',
  'TagProvider',
  'DevOnly',
  'Callout',
]);

export const COMPONENT_PATTERN = /<([A-Z][a-zA-Z]+)[^>]*>(?:[\s\S]*?)<\/\1>|<([A-Z][a-zA-Z]+)[^>]*\/>/g;

export const HEADING_PATTERN = /^#{1,6}\s+(.+)$/gm;