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
const offerTypes = readFileSync(resolve(schemaRoot, 'types/offer.types.ts'), 'utf8');
const schemaReadme = readFileSync(resolve(schemaRoot, 'README.md'), 'utf8');
const offerSpec = readFileSync(resolve(protocolRoot, 'specs/offer-schema.md'), 'utf8');
const offerResponse = JSON.parse(
  readFileSync(resolve(examplesRoot, 'http/offer-response.json'), 'utf8'),
);

const offerInfo = offerSchema.properties.offer_info;
const tags = offerInfo.properties.tags;

function test_offer_info_tags_schema_shape() {
  assert.ok(tags, 'offer_info.tags schema must exist');
  assert.equal(tags.type, 'array');
  assert.equal(tags.maxItems, 50);
  assert.equal(tags.uniqueItems, true);
  assert.equal(tags.items.type, 'string');
  assert.equal(tags.items.minLength, 1);
  assert.equal(tags.items.maxLength, 80);
  assert.equal(tags.items.pattern, '\\S');
  assert.equal(offerInfo.required.includes('tags'), false);
  assert.match(offerTypes, /tags\?: string\[\];/);
  assert.match(offerTypes, /partner-supplied content matching tags/i);
}

function test_offer_info_tags_optional_compatibility() {
  const required = new Set(offerInfo.required);
  assert.equal(required.has('title'), true);
  assert.equal(required.has('offer_type'), false);
  assert.equal(required.has('category'), true);
  assert.equal(required.has('description'), true);
  assert.equal(required.has('tags'), false);
}

function matchesTagsSchema(value) {
  if (value === undefined) {
    return true;
  }
  if (!Array.isArray(value)) {
    return false;
  }
  if (value.length > tags.maxItems) {
    return false;
  }
  if (tags.uniqueItems && new Set(value).size !== value.length) {
    return false;
  }
  const pattern = new RegExp(tags.items.pattern);
  return value.every(
    (item) =>
      typeof item === 'string' &&
      item.length >= tags.items.minLength &&
      item.length <= tags.items.maxLength &&
      pattern.test(item),
  );
}

function test_offer_info_tags_invalid_arrays() {
  assert.equal(matchesTagsSchema(undefined), true);
  assert.equal(matchesTagsSchema(['cashback', 'travel rewards']), true);
  assert.equal(matchesTagsSchema(['']), false);
  assert.equal(matchesTagsSchema(['   ']), false);
  assert.equal(matchesTagsSchema(['cashback', 'cashback']), false);
  assert.equal(
    matchesTagsSchema(Array.from({ length: 51 }, (_, index) => `tag-${index}`)),
    false,
  );
}

function test_offer_info_tags_documentation_boundary() {
  assert.match(offerSpec, /offer_info\.tags/);
  assert.match(offerSpec, /partner-supplied content matching hints/i);
  assert.match(offerSpec, /MUST NOT replace `offer_info\.category\.id`/);
  assert.match(offerSpec, /targeting/);
  assert.match(offerSpec, /query filters/);
  assert.match(offerSpec, /compliance/i);
  assert.match(offerSpec, /guaranteed end-user display/i);
  assert.match(schemaReadme, /offer_info\.tags/);
  assert.doesNotMatch(schemaReadme, /`targeting`, `frequency_capping`, `tags`, `priority`, `status`/);
}

function test_offer_info_tags_example_path() {
  const offer = offerResponse.offers[0];
  assert.equal(Object.hasOwn(offer, 'tags'), false);
  assert.deepEqual(offer.offer_info.tags, ['project-management', 'team-collaboration', 'free-trial']);
}

test_offer_info_tags_schema_shape();
test_offer_info_tags_optional_compatibility();
test_offer_info_tags_invalid_arrays();
test_offer_info_tags_documentation_boundary();
test_offer_info_tags_example_path();

console.log('offer-info-tags OK');
