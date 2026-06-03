#!/usr/bin/env node

import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const schemaRoot = path.resolve(scriptDir, '..');
const repoRoot = path.resolve(schemaRoot, '../../..');
const taxonomyPath = path.join(schemaRoot, 'taxonomy/aon-taxonomy-v1.json');
const fixtureDir = path.join(schemaRoot, 'fixtures/category-others');
const schemaPaths = new Map([
  ['offer', path.join(schemaRoot, 'json-schema/offer-schema-v0.1.json')],
  ['query', path.join(schemaRoot, 'json-schema/offer-query-schema-v0.1.json')],
  ['provider', path.join(schemaRoot, 'json-schema/offer-provider-request-v0.1.json')],
]);

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

const cases = [
  ['offer-category-others-valid.json', 'offer', true],
  ['query-category-ids-others-valid.json', 'query', true],
  ['provider-category-ids-others-valid.json', 'provider', true],
  ['query-category-ids-uppercase-invalid.json', 'query', false],
  ['offer-legacy-type-others-public-write-invalid.json', 'offer', false],
];

const categoryIdPattern = /^[a-z0-9]+(?:_[a-z0-9]+)*(?:\.[a-z0-9]+(?:_[a-z0-9]+)*)*$/;

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

function collectIds(nodes, prefix = '', depth = 0, out = new Set()) {
  for (const node of nodes) {
    const ownSlug = depth === 0 ? levelOneOverrides.get(node.name) ?? slug(node.name) : slug(node.name);
    const id = prefix ? `${prefix}.${ownSlug}` : ownSlug;
    out.add(id);
    collectIds(node.children ?? [], id, depth + 1, out);
  }
  return out;
}

function loadCanonicalValidators() {
  const requireFromSdk = createRequire(path.join(repoRoot, 'sdk/package.json'));
  let Ajv2020;
  let addFormats;
  try {
    const ajvModule = requireFromSdk('ajv/dist/2020');
    const formatsModule = requireFromSdk('ajv-formats');
    Ajv2020 = ajvModule.default ?? ajvModule;
    addFormats = formatsModule.default ?? formatsModule;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { mode: 'npx', reason: message };
  }

  const ajv = new Ajv2020({ strict: false, allErrors: true });
  addFormats(ajv);
  const validators = new Map();
  for (const [kind, schemaPath] of schemaPaths.entries()) {
    validators.set(kind, {
      schemaPath,
      validate: ajv.compile(readJson(schemaPath)),
    });
  }
  return { mode: 'local', ajv, validators };
}

function validateCanonicalSchema(kind, value, file, canonical) {
  const schemaPath = schemaPaths.get(kind);
  if (!schemaPath) {
    return `unknown fixture kind: ${kind}`;
  }
  if (canonical.mode === 'npx') {
    const result = spawnSync(
      'npx',
      [
        '--yes',
        '--package=ajv-cli@5',
        '--package=ajv-formats@3',
        'ajv',
        'validate',
        '--strict=false',
        '-s',
        schemaPath,
        '-d',
        file,
        '--spec=draft2020',
        '-c',
        'ajv-formats',
      ],
      { encoding: 'utf8' },
    );
    if (result.status === 0) {
      return null;
    }
    const output = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim();
    return `${path.relative(schemaRoot, schemaPath)} failed via npx ajv-cli: ${
      output || result.error?.message || canonical.reason || 'unknown error'
    }`;
  }

  const validator = canonical.validators.get(kind);
  if (validator.validate(value)) {
    return null;
  }
  return `${path.relative(schemaRoot, schemaPath)} failed: ${canonical.ajv.errorsText(
    validator.validate.errors,
    { separator: '; ' },
  )}`;
}

function validateCategoryObject(category, idSet) {
  if (!category || typeof category !== 'object' || Array.isArray(category)) {
    return 'offer_info.category must be an object';
  }
  const keys = Object.keys(category);
  if (keys.length !== 1 || keys[0] !== 'id') {
    return 'offer_info.category must contain only required field id';
  }
  if (typeof category.id !== 'string') {
    return 'offer_info.category.id must be a string';
  }
  if (!categoryIdPattern.test(category.id)) {
    return `offer_info.category.id fails category id pattern: ${category.id}`;
  }
  if (!idSet.has(category.id)) {
    return `offer_info.category.id is not in AON Taxonomy v1: ${category.id}`;
  }
  return null;
}

function validateCategoryIds(value, idSet, pathLabel) {
  const categoryIds = value?.constraints?.category_ids;
  if (!Array.isArray(categoryIds)) {
    return `${pathLabel}.constraints.category_ids must be an array`;
  }
  for (const [idx, id] of categoryIds.entries()) {
    if (typeof id !== 'string') {
      return `${pathLabel}.constraints.category_ids[${idx}] must be a string`;
    }
    if (!categoryIdPattern.test(id)) {
      return `${pathLabel}.constraints.category_ids[${idx}] fails category id pattern: ${id}`;
    }
    if (!idSet.has(id)) {
      return `${pathLabel}.constraints.category_ids[${idx}] is not in AON Taxonomy v1: ${id}`;
    }
  }
  return null;
}

function validateFixture(kind, value, file, idSet, canonical) {
  const schemaError = validateCanonicalSchema(kind, value, file, canonical);
  if (schemaError) {
    return schemaError;
  }
  if (kind === 'offer') {
    return validateCategoryObject(value?.offer_info?.category, idSet);
  }
  if (kind === 'query') {
    return validateCategoryIds(value, idSet, 'query');
  }
  if (kind === 'provider') {
    return validateCategoryIds(value, idSet, 'provider');
  }
  return `unknown fixture kind: ${kind}`;
}

function main() {
  const idSet = collectIds(readJson(taxonomyPath));
  const canonical = loadCanonicalValidators();
  let failures = 0;

  for (const [name, kind, shouldPass] of cases) {
    const file = path.join(fixtureDir, name);
    let error = null;
    try {
      const value = readJson(file);
      error = validateFixture(kind, value, file, idSet, canonical);
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    }

    if (shouldPass && error) {
      console.error(`${name}: expected valid fixture, got ${error}`);
      failures += 1;
    } else if (!shouldPass && !error) {
      console.error(`${name}: expected invalid fixture, got valid`);
      failures += 1;
    }
  }

  if (failures > 0) {
    process.exit(1);
  }
  console.log(`Category others contract OK: ${cases.length} explicit fixtures`);
}

main();
