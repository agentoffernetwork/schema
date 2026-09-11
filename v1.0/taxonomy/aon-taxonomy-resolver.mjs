import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const taxonomyPath = resolve(here, 'aon-taxonomy-v1.json');

const levelOneOverrides = new Map([
  ['Apparel', 'fashion_apparel'],
  ['Arts & Entertainment', 'arts_entertainment'],
  ['Autos & Vehicles', 'automotive'],
  ['Beauty & Personal Care', 'beauty_personal_care'],
  ['Business & Industrial', 'business_industrial'],
  ['Computers & Consumer Electronics', 'computers_electronics'],
  ['Dining & Nightlife', 'dining_nightlife'],
  ['Family & Community', 'family_community'],
  ['Finance', 'finance'],
  ['Food & Groceries', 'food_grocery'],
  ['Health', 'health'],
  ['Hobbies, Games & Leisure', 'hobbies_games_leisure'],
  ['Home & Garden', 'home_garden'],
  ['Internet & Telecom', 'internet_telecom'],
  ['Jobs & Education', 'jobs_education'],
  ['Law & Government', 'law_government'],
  ['Mobile App Utilities', 'mobile_utilities'],
  ['News, Books & Publications', 'news_books_publications'],
  ['Occasions & Gifts', 'gifts_occasions'],
  ['Others', 'others'],
  ['Real Estate', 'real_estate'],
  ['Sports & Fitness', 'sports_fitness'],
  ['Travel & Tourism', 'travel_tourism'],
]);

const childSlugOverrides = new Map([
  ['finance.investing|Crypto & Digital Assets', 'crypto_and_digital_assets'],
]);

export function taxonomySlug(value) {
  return value
    .replace(/&/g, ' and ')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .split('_')
    .filter((part) => part && part !== 'and')
    .join('_');
}

export function deriveAonTaxonomyNodeId({ name, parentId = null, level = 1 }) {
  if (typeof name !== 'string' || name.trim() === '') {
    throw new Error('taxonomy node must have a non-empty name');
  }
  const overrideKey = parentId ? `${parentId}|${name}` : '';
  const ownSlug = level === 1
    ? levelOneOverrides.get(name) ?? taxonomySlug(name)
    : childSlugOverrides.get(overrideKey) ?? taxonomySlug(name);
  return parentId ? `${parentId}.${ownSlug}` : ownSlug;
}

export function flattenAonTaxonomyV1(nodes, parentId = null, level = 1, entries = []) {
  for (const node of nodes) {
    if (!node || typeof node.name !== 'string' || node.name.trim() === '') {
      throw new Error('taxonomy node must have a non-empty name');
    }
    if (node.children !== undefined && !Array.isArray(node.children)) {
      throw new Error(`taxonomy node children must be an array: ${node.name}`);
    }
    const categoryId = deriveAonTaxonomyNodeId({
      name: node.name,
      parentId,
      level,
    });
    if (entries.some((entry) => entry.category_id === categoryId)) {
      throw new Error(`duplicate generated category id: ${categoryId}`);
    }
    entries.push(Object.freeze({
      category_id: categoryId,
      name: node.name,
      slug: categoryId.split('.').at(-1),
      parent_id: parentId,
      level,
    }));
    flattenAonTaxonomyV1(node.children ?? [], categoryId, level + 1, entries);
  }
  return entries;
}

function relation(leftId, rightId) {
  if (leftId === rightId) return 'equal';
  if (rightId.startsWith(`${leftId}.`)) return 'ancestor';
  if (leftId.startsWith(`${rightId}.`)) return 'descendant';
  return 'disjoint';
}

export function createAonTaxonomyV1Resolver(taxonomy) {
  if (!Array.isArray(taxonomy)) throw new Error('AON Taxonomy v1 root must be an array');
  const entries = Object.freeze(flattenAonTaxonomyV1(taxonomy));
  const byId = new Map(entries.map((entry) => [entry.category_id, entry]));
  const ids = new Set(byId.keys());
  return Object.freeze({
    sourceId: 'aon-taxonomy-v1',
    size: ids.size,
    entries,
    has(id) {
      return typeof id === 'string' && ids.has(id);
    },
    get(id) {
      return byId.get(id) ?? null;
    },
    relation(leftId, rightId) {
      if (!ids.has(leftId) || !ids.has(rightId)) return 'unknown';
      return relation(leftId, rightId);
    },
    descendants(id, { includeSelf = true } = {}) {
      if (!ids.has(id)) return Object.freeze([]);
      return Object.freeze(entries
        .filter((entry) => entry.category_id === id || entry.category_id.startsWith(`${id}.`))
        .filter((entry) => includeSelf || entry.category_id !== id));
    },
  });
}

export function projectAonTaxonomyV1Metadata(taxonomy, metadata) {
  const resolver = createAonTaxonomyV1Resolver(taxonomy);
  if (!metadata || typeof metadata !== 'object' || !Array.isArray(metadata.records)) {
    throw new Error('AON Taxonomy v1 metadata must contain records');
  }
  const sourceById = new Map();
  for (const record of metadata.records) {
    if (!record || typeof record.category_id !== 'string' || sourceById.has(record.category_id)) {
      throw new Error('AON Taxonomy v1 metadata contains an invalid or duplicate category_id');
    }
    sourceById.set(record.category_id, record);
  }
  const records = resolver.entries.map((entry) => {
    const record = sourceById.get(entry.category_id);
    if (!record || record.name !== entry.name) {
      throw new Error(`AON Taxonomy v1 metadata is missing or stale: ${entry.category_id}`);
    }
    return Object.freeze(record);
  });
  const projection = {
    schema_version: metadata.schema_version,
    taxonomy_version: metadata.taxonomy_version,
    baseline_digest: metadata.baseline_digest,
    source_metadata_digest: metadata.metadata_digest,
    record_count: records.length,
    records: Object.freeze(records),
  };
  const canonical = (value) => {
    if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
    if (value && typeof value === 'object') {
      return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
    }
    return JSON.stringify(value);
  };
  projection.metadata_digest = createHash('sha256').update(canonical(projection)).digest('hex');
  return Object.freeze(projection);
}

export function loadAonTaxonomyV1Resolver() {
  return createAonTaxonomyV1Resolver(JSON.parse(readFileSync(taxonomyPath, 'utf8')));
}

export const aonTaxonomyV1Resolver = loadAonTaxonomyV1Resolver();
