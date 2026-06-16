import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const schemaRoot = resolve(here, '..');
const protocolRoot = resolve(schemaRoot, '../protocol');
const examplesRoot = resolve(schemaRoot, '../examples');

const offerSchema = JSON.parse(
  readFileSync(resolve(schemaRoot, 'json-schema/offer-schema-v0.1.json'), 'utf8'),
);
const taxonomy = JSON.parse(
  readFileSync(resolve(schemaRoot, 'taxonomy/aon-taxonomy-v1.json'), 'utf8'),
);
const offerTypes = readFileSync(resolve(schemaRoot, 'types/offer.types.ts'), 'utf8');
const schemaReadme = readFileSync(resolve(schemaRoot, 'README.md'), 'utf8');
const offerSpec = readFileSync(resolve(protocolRoot, 'specs/offer-schema.md'), 'utf8');
const querySpec = readFileSync(resolve(protocolRoot, 'specs/query-api.md'), 'utf8');
const providerSpec = readFileSync(resolve(protocolRoot, 'specs/offer-provider-api.md'), 'utf8');
const taxonomySpec = readFileSync(resolve(protocolRoot, 'specs/category-taxonomy.md'), 'utf8');
const offerResponse = JSON.parse(
  readFileSync(resolve(examplesRoot, 'http/offer-response.json'), 'utf8'),
);
const financialOffer = JSON.parse(
  readFileSync(resolve(examplesRoot, 'http/financial-service-offer.json'), 'utf8'),
);

const offerInfo = offerSchema.properties.offer_info;
const secondary = offerInfo.properties.secondary_category_ids;

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

function collectIds(nodes, prefix = '', depth = 0, out = new Map()) {
  for (const node of nodes) {
    const overrideKey = prefix ? `${prefix}|${node.name}` : '';
    const ownSlug = depth === 0
      ? levelOneOverrides.get(node.name) ?? slug(node.name)
      : childSlugOverrides.get(overrideKey) ?? slug(node.name);
    const id = prefix ? `${prefix}.${ownSlug}` : ownSlug;
    out.set(id, node.name);
    collectIds(node.children ?? [], id, depth + 1, out);
  }
  return out;
}

function matchesSecondarySchema(value) {
  if (value === undefined) return true;
  if (!Array.isArray(value)) return false;
  if (value.length > secondary.maxItems) return false;
  if (secondary.uniqueItems && new Set(value).size !== value.length) return false;
  const pattern = new RegExp(secondary.items.pattern);
  return value.every(
    (item) =>
      typeof item === 'string' &&
      item.length >= (secondary.items.minLength ?? 0) &&
      pattern.test(item),
  );
}

function test_AC1_secondary_category_ids_optional_keeps_existing_offer_valid() {
  assert.ok(secondary, 'offer_info.secondary_category_ids schema must exist');
  assert.equal(offerInfo.required.includes('secondary_category_ids'), false);
  assert.equal(financialOffer.offer_info.secondary_category_ids, undefined);
  assert.equal(matchesSecondarySchema(undefined), true);
}

function test_AC2_secondary_category_ids_schema_shape_and_invalid_arrays() {
  assert.equal(secondary.type, 'array');
  assert.equal(secondary.maxItems, 5);
  assert.equal(secondary.uniqueItems, true);
  assert.equal(secondary.items.type, 'string');
  assert.equal(secondary.items.minLength, 1);
  assert.equal(
    secondary.items.pattern,
    '^[a-z0-9]+(?:_[a-z0-9]+)*(?:\\.[a-z0-9]+(?:_[a-z0-9]+)*)*$',
  );
  assert.match(offerTypes, /secondary_category_ids\?: CategoryId\[\];/);

  assert.equal(matchesSecondarySchema([]), true);
  assert.equal(
    matchesSecondarySchema(['finance.investing.crypto_and_digital_assets']),
    true,
  );
  assert.equal(matchesSecondarySchema('finance'), false);
  assert.equal(matchesSecondarySchema(['finance', 'finance']), false);
  assert.equal(matchesSecondarySchema(['']), false);
  assert.equal(matchesSecondarySchema(['Finance.Investing']), false);
  assert.equal(matchesSecondarySchema(['finance..investing']), false);
  assert.equal(
    matchesSecondarySchema(Array.from({ length: 6 }, (_, index) => `finance.test_${index}`)),
    false,
  );
}

function test_AC3_docs_define_primary_secondary_tags_and_constraints_boundary() {
  for (const doc of [offerSpec, schemaReadme]) {
    assert.match(doc, /offer_info\.category\.id/);
    assert.match(doc, /primary category/i);
    assert.match(doc, /offer_info\.secondary_category_ids/);
    assert.match(doc, /secondary categor/i);
    assert.match(doc, /offer_info\.tags/);
    assert.match(doc, /semantic hints/i);
    assert.match(doc, /constraints\.category_ids/);
  }
  assert.match(querySpec, /primary or secondary category/i);
  assert.match(providerSpec, /primary or secondary category/i);
  assert.match(taxonomySpec, /secondary_category_ids/);
}

function test_AC6_AC7_crypto_taxonomy_and_examples_use_primary_plus_secondary() {
  const ids = collectIds(taxonomy);
  assert.equal(
    ids.get('finance.investing.crypto_and_digital_assets'),
    'Crypto & Digital Assets',
  );
  assert.match(taxonomySpec, /finance\.investing\.crypto_and_digital_assets/);

  const exampleOffer = offerResponse.offers[0];
  assert.equal(Array.isArray(exampleOffer.offer_info.category), false);
  assert.equal(typeof exampleOffer.offer_info.category.id, 'string');
  assert.deepEqual(exampleOffer.offer_info.secondary_category_ids, [
    'finance.investing.crypto_and_digital_assets',
  ]);
}

test_AC1_secondary_category_ids_optional_keeps_existing_offer_valid();
test_AC2_secondary_category_ids_schema_shape_and_invalid_arrays();
test_AC3_docs_define_primary_secondary_tags_and_constraints_boundary();
test_AC6_AC7_crypto_taxonomy_and_examples_use_primary_plus_secondary();

console.log('offer-secondary-category-ids OK');
