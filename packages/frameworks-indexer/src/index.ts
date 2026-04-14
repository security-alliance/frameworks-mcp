export { buildIndex } from './index-builder.js';
export type { IndexedSection, FrameworkIndex, FrameworkMetadata, SearchOptions, SearchResult, CompareResult, BranchSnapshot, ChangeSummary } from './types.js';
export { URL_TEMPLATES, SECTION_ID_SALT } from './constants.js';
export { extractSections, parseHeadings } from './sectionizer.js';
export { normalizeMdxToPlainText, generateSnippet, generateHeadingAnchor, generateSectionId } from './normalizer.js';