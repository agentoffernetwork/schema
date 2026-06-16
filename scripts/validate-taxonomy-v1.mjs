#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = process.cwd();
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const schemaRoot = path.resolve(scriptDir, '..');
const monorepoExamplesRoot = path.resolve(schemaRoot, '../examples');
const localExamplesRoot = path.resolve(schemaRoot, 'examples');
const examplesRoot = fs.existsSync(monorepoExamplesRoot)
  ? monorepoExamplesRoot
  : localExamplesRoot;

const taxonomyPath = path.join(schemaRoot, 'taxonomy/aon-taxonomy-v1.json');
const mappingPath = path.join(schemaRoot, 'taxonomy/v0.1-to-taxonomy-v1.json');

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

const requiredIds = [
  'others',
  'arts_entertainment.adult_entertainment',
  'arts_entertainment.igaming',
  'finance.investing.crypto_and_digital_assets',
];

const childSlugOverrides = new Map([
  ['finance.investing|Crypto & Digital Assets', 'crypto_and_digital_assets'],
]);

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

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

function collectIds(nodes, prefix = '', depth = 0, out = new Map()) {
  for (const node of nodes) {
    if (!node || typeof node.name !== 'string' || node.name.trim() === '') {
      throw new Error('taxonomy node must have a non-empty name');
    }
    const overrideKey = prefix ? `${prefix}|${node.name}` : '';
    const ownSlug = depth === 0
      ? levelOneOverrides.get(node.name) ?? slug(node.name)
      : childSlugOverrides.get(overrideKey) ?? slug(node.name);
    const id = prefix ? `${prefix}.${ownSlug}` : ownSlug;
    if (out.has(id)) {
      throw new Error(`duplicate generated category id: ${id}`);
    }
    out.set(id, node.name);
    collectIds(node.children ?? [], id, depth + 1, out);
  }
  return out;
}

function walkFiles(dir, result = []) {
  if (!fs.existsSync(dir)) {
    return result;
  }
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(full, result);
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      result.push(full);
    }
  }
  return result;
}

function findCategoryRefs(value, file, refs = []) {
  if (Array.isArray(value)) {
    for (const item of value) {
      findCategoryRefs(item, file, refs);
    }
    return refs;
  }
  if (!value || typeof value !== 'object') {
    return refs;
  }
  if (
    value.offer_info?.category?.id &&
    typeof value.offer_info.category.id === 'string'
  ) {
    refs.push({ file, id: value.offer_info.category.id });
  }
  for (const key of ['category_ids', 'secondary_category_ids']) {
    if (Array.isArray(value[key])) {
      for (const id of value[key]) {
        if (typeof id === 'string') {
          refs.push({ file, id });
        }
      }
    }
  }
  for (const nested of Object.values(value)) {
    findCategoryRefs(nested, file, refs);
  }
  return refs;
}

function main() {
  const taxonomy = readJson(taxonomyPath);
  const generatedIds = collectIds(taxonomy);
  const othersNode = taxonomy.find((node) => node?.name === 'Others');
  if (!othersNode) {
    throw new Error('required Level 1 taxonomy node missing: Others');
  }
  const othersChildren = othersNode.children ?? [];
  if (!Array.isArray(othersChildren) || othersChildren.length !== 0) {
    throw new Error('Others must be a Level 1 taxonomy node with no children');
  }
  const publicFields = Object.keys(othersNode).sort();
  if (JSON.stringify(publicFields) !== JSON.stringify(['children', 'name'])) {
    throw new Error(
      `Others must use only public taxonomy fields name/children; got ${publicFields.join(',')}`,
    );
  }

  for (const required of requiredIds) {
    if (!generatedIds.has(required)) {
      throw new Error(`required AON-owned category id missing: ${required}`);
    }
  }

  const mapping = readJson(mappingPath);
  for (const [legacy, target] of Object.entries(mapping)) {
    if (!generatedIds.has(target)) {
      throw new Error(`invalid migration mapping target for ${legacy}: ${target}`);
    }
  }

  const refs = [];
  for (const file of walkFiles(examplesRoot)) {
    findCategoryRefs(readJson(file), file, refs);
  }
  for (const { file, id } of refs) {
    if (!generatedIds.has(id)) {
      const relative = path.relative(repoRoot, file);
      throw new Error(`invalid category id in ${relative}: ${id}`);
    }
  }

  console.log(
    `AON Taxonomy v1 OK: ${generatedIds.size} ids, ` +
      `${Object.keys(mapping).length} migration mappings, ${refs.length} example refs`,
  );
}

main();
