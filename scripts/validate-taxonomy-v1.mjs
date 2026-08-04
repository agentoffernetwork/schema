#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAonTaxonomyV1Resolver } from '../taxonomy/aon-taxonomy-v1-resolver.mjs';

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

const requiredIds = [
  'others',
  'arts_entertainment.adult_entertainment',
  'arts_entertainment.igaming',
  'finance.investing.crypto_and_digital_assets',
];

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
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
  const resolver = createAonTaxonomyV1Resolver(taxonomy);
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
    if (!resolver.has(required)) {
      throw new Error(`required AON-owned category id missing: ${required}`);
    }
  }

  const mapping = readJson(mappingPath);
  for (const [legacy, target] of Object.entries(mapping)) {
    if (!resolver.has(target)) {
      throw new Error(`invalid migration mapping target for ${legacy}: ${target}`);
    }
  }

  const refs = [];
  for (const file of walkFiles(examplesRoot)) {
    findCategoryRefs(readJson(file), file, refs);
  }
  for (const { file, id } of refs) {
    if (!resolver.has(id)) {
      const relative = path.relative(repoRoot, file);
      throw new Error(`invalid category id in ${relative}: ${id}`);
    }
  }

  console.log(
      `AON Taxonomy v1 OK: ${resolver.size} ids, ` +
      `${Object.keys(mapping).length} migration mappings, ${refs.length} example refs`,
  );
}

main();
