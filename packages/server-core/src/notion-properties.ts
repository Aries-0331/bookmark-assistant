import type { LinkItem, NotionLinkField } from '@bookmark-assistant/contracts';

export interface NotionSchemaProperty {
  type?: string;
}

export type NotionPropertySchema = Record<string, NotionSchemaProperty | undefined>;

export interface BuildBookmarkPropertiesOptions {
  defaultDate?: string | (() => string);
  fallbackTitlePropertyName?: string;
}

interface PropertyMatcher {
  bookmarkField: NotionLinkField;
  type: string;
  patterns: RegExp[];
  required: boolean;
  builder: (value: unknown, options: BuildBookmarkPropertiesOptions) => unknown;
}

const READ_ONLY_PROPERTY_TYPES = new Set([
  'formula',
  'rollup',
  'created_time',
  'created_by',
  'last_edited_time',
  'last_edited_by',
]);

const PROPERTY_MAPPING_CONFIG: PropertyMatcher[] = [
  {
    bookmarkField: 'title',
    type: 'title',
    patterns: [/^name$/i, /^title$/i],
    required: true,
    builder: (value) => ({
      title: [{ text: { content: stringOr(value, 'Untitled Bookmark') } }],
    }),
  },
  {
    bookmarkField: 'url',
    type: 'url',
    patterns: [/^url$/i, /^link$/i, /^website$/i],
    required: false,
    builder: (value) => ({ url: stringOr(value, '') }),
  },
  {
    bookmarkField: 'tags',
    type: 'multi_select',
    patterns: [/tag/i, /label/i, /category/i, /topic/i],
    required: false,
    builder: (value) => ({
      multi_select: Array.isArray(value)
        ? value.filter((tag): tag is string => typeof tag === 'string').map((name) => ({ name }))
        : [],
    }),
  },
  {
    bookmarkField: 'description',
    type: 'rich_text',
    patterns: [/desc/i, /summary/i, /note/i, /content/i],
    required: false,
    builder: (value) => ({ rich_text: [{ text: { content: stringOr(value, '') } }] }),
  },
  {
    bookmarkField: 'path',
    type: 'rich_text',
    patterns: [/folder/i, /path/i, /location/i, /directory/i],
    required: false,
    builder: (value) => ({ rich_text: [{ text: { content: stringOr(value, '') } }] }),
  },
  {
    bookmarkField: 'dateAdded',
    type: 'date',
    patterns: [/date/i, /created/i, /added/i, /time/i],
    required: false,
    builder: (value, options) => ({ date: { start: stringOr(value, resolveDefaultDate(options)) } }),
  },
  {
    bookmarkField: 'syncId',
    type: 'rich_text',
    patterns: [/sync.*id/i, /identifier/i, /^id$/i],
    required: false,
    builder: (value) => ({ rich_text: [{ text: { content: stringOr(value, '') } }] }),
  },
  {
    bookmarkField: 'type',
    type: 'single_select',
    patterns: [/type/i],
    required: false,
    builder: (value) => ({
      single_select: value === 'reading_list' ? { name: 'Reading List' } : { name: 'Bookmark' },
    }),
  },
  {
    bookmarkField: 'readState',
    type: 'status',
    patterns: [/read.*state/i, /status/i],
    required: false,
    builder: (value) => ({
      status: value === 'READ' ? { name: 'Read' } : { name: 'Unread' },
    }),
  },
];

export function isReadOnlyNotionPropertyType(type: unknown): boolean {
  return typeof type === 'string' && READ_ONLY_PROPERTY_TYPES.has(type);
}

export function buildBookmarkPropertiesFromNotionSchema(
  schema: NotionPropertySchema,
  bookmark: LinkItem,
  options: BuildBookmarkPropertiesOptions = {}
): Record<string, unknown> {
  const writableEntries = Object.entries(schema).filter(
    ([, propDef]) => !isReadOnlyNotionPropertyType(propDef?.type)
  );
  const properties: Record<string, unknown> = {};

  for (const matcher of PROPERTY_MAPPING_CONFIG) {
    const bookmarkValue = bookmark[matcher.bookmarkField];
    if (!shouldBuildProperty(matcher, bookmarkValue, options)) {
      continue;
    }

    const propertyName = findPropertyName(matcher, writableEntries, options);
    if (propertyName) {
      properties[propertyName] = matcher.builder(bookmarkValue, options);
    }
  }

  return properties;
}

function findPropertyName(
  matcher: PropertyMatcher,
  writableEntries: Array<[string, NotionSchemaProperty | undefined]>,
  options: BuildBookmarkPropertiesOptions
): string | undefined {
  for (const pattern of matcher.patterns) {
    const match = writableEntries.find(
      ([name, propDef]) => propDef?.type === matcher.type && pattern.test(name)
    )?.[0];
    if (match) {
      return match;
    }
  }

  const typeMatch = writableEntries.find(([, propDef]) => propDef?.type === matcher.type)?.[0];
  if (typeMatch) {
    return typeMatch;
  }

  if (matcher.required && matcher.type === 'title') {
    return options.fallbackTitlePropertyName || 'Name';
  }

  return undefined;
}

function shouldBuildProperty(
  matcher: PropertyMatcher,
  value: unknown,
  options: BuildBookmarkPropertiesOptions
): boolean {
  if (matcher.required) {
    return true;
  }

  if (matcher.bookmarkField === 'dateAdded' && options.defaultDate !== undefined) {
    return true;
  }

  return value !== undefined && value !== null && value !== '';
}

function stringOr(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

function resolveDefaultDate(options: BuildBookmarkPropertiesOptions): string {
  if (typeof options.defaultDate === 'function') {
    return options.defaultDate();
  }
  return options.defaultDate || new Date().toISOString();
}
