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

function slug(value) {
  return value
    .replace(/&/g, ' and ')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .split('_')
    .filter((part) => part && part !== 'and')
    .join('_');
}

function collectIds(nodes, prefix = '', depth = 0, ids = new Set()) {
  for (const node of nodes) {
    if (!node || typeof node.name !== 'string' || node.name.trim() === '') {
      throw new Error('taxonomy node must have a non-empty name');
    }
    const overrideKey = prefix ? `${prefix}|${node.name}` : '';
    const ownSlug = depth === 0
      ? levelOneOverrides.get(node.name) ?? slug(node.name)
      : childSlugOverrides.get(overrideKey) ?? slug(node.name);
    const id = prefix ? `${prefix}.${ownSlug}` : ownSlug;
    if (ids.has(id)) throw new Error(`duplicate generated category id: ${id}`);
    ids.add(id);
    collectIds(node.children ?? [], id, depth + 1, ids);
  }
  return ids;
}

function relation(leftId, rightId) {
  if (leftId === rightId) return 'equal';
  if (rightId.startsWith(`${leftId}.`)) return 'ancestor';
  if (leftId.startsWith(`${rightId}.`)) return 'descendant';
  return 'disjoint';
}

export function createAonTaxonomyV1Resolver(taxonomy) {
  if (!Array.isArray(taxonomy)) throw new Error('AON Taxonomy v1 root must be an array');
  const ids = collectIds(taxonomy);
  return Object.freeze({
    sourceId: 'aon-taxonomy-v1',
    size: ids.size,
    has(id) {
      return typeof id === 'string' && ids.has(id);
    },
    relation(leftId, rightId) {
      if (!ids.has(leftId) || !ids.has(rightId)) return 'unknown';
      return relation(leftId, rightId);
    },
  });
}

export function loadAonTaxonomyV1Resolver() {
  return createAonTaxonomyV1Resolver(JSON.parse(readFileSync(taxonomyPath, 'utf8')));
}

export const aonTaxonomyV1Resolver = loadAonTaxonomyV1Resolver();
