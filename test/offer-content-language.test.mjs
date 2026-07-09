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
const offerQuerySchema = JSON.parse(
  readFileSync(resolve(schemaRoot, 'json-schema/offer-query-schema-v0.1.json'), 'utf8'),
);
const agentPostbackSchema = JSON.parse(
  readFileSync(resolve(schemaRoot, 'json-schema/postback-agent-payload-v0.1.json'), 'utf8'),
);
const partnerPostbackSchema = JSON.parse(
  readFileSync(resolve(schemaRoot, 'json-schema/postback-partner-payload-v0.1.json'), 'utf8'),
);
const offerTypes = readFileSync(resolve(schemaRoot, 'types/offer.types.ts'), 'utf8');
const schemaReadme = readFileSync(resolve(schemaRoot, 'README.md'), 'utf8');
const offerSpec = readFileSync(resolve(protocolRoot, 'specs/offer-schema.md'), 'utf8');
const querySpec = readFileSync(resolve(protocolRoot, 'specs/query-api.md'), 'utf8');
const eventsSpec = readFileSync(resolve(protocolRoot, 'specs/events.md'), 'utf8');
const postbackSpec = readFileSync(resolve(protocolRoot, 'specs/postback.md'), 'utf8');
const offerResponse = JSON.parse(
  readFileSync(resolve(examplesRoot, 'http/offer-response.json'), 'utf8'),
);
const productOffer = JSON.parse(readFileSync(resolve(examplesRoot, 'http/product-offer.json'), 'utf8'));

const contentLanguage = offerSchema.properties.content_language;

function matchesContentLanguage(value) {
  if (value === undefined) {
    return true;
  }
  if (typeof value !== 'string') {
    return false;
  }
  return new RegExp(contentLanguage.pattern).test(value);
}

function test_content_language_optional_and_not_required() {
  assert.ok(contentLanguage, 'top-level content_language schema must exist');
  assert.equal(contentLanguage.type, 'string');
  assert.equal(offerSchema.required.includes('content_language'), false);
  assert.match(contentLanguage.description, /user-facing content/i);
  assert.match(contentLanguage.description, /does not affect targeting/i);
  assert.match(offerTypes, /content_language\?: string;/);
  assert.match(offerTypes, /BCP 47 language tag/i);
}

function test_content_language_accepts_common_bcp47_tags() {
  for (const value of ['en', 'en-US', 'zh-Hans', 'zh-Hant-TW', 'pt-BR', 'es-419']) {
    assert.equal(matchesContentLanguage(value), true, `expected ${value} to be valid`);
  }
}

function test_content_language_rejects_invalid_present_values() {
  for (const value of [null, '', ' ', 'english', 'en_US']) {
    assert.equal(matchesContentLanguage(value), false, `expected ${JSON.stringify(value)} invalid`);
  }
}

function test_content_language_documentation_boundary() {
  assert.match(offerSpec, /`content_language`/);
  assert.match(offerSpec, /BCP 47/i);
  assert.match(offerSpec, /title, description, and action copy/i);
  assert.match(offerSpec, /does not change targeting/i);
  assert.match(offerSpec, /`targeting\[\]\.language`/);
  assert.match(offerSpec, /`context\.user_profile\.language`/);
  assert.match(schemaReadme, /content_language/);
  assert.match(querySpec, /BCP 47/i);
  assert.doesNotMatch(querySpec, /content_language/);
}

function test_content_language_examples_and_legacy_compatibility() {
  const responseOffer = offerResponse.offers[0];
  assert.equal(responseOffer.content_language, 'en-US');
  assert.equal(productOffer.content_language, 'en-US');

  const legacyOffer = { ...responseOffer };
  delete legacyOffer.content_language;
  assert.equal(matchesContentLanguage(legacyOffer.content_language), true);
}

function test_content_language_does_not_change_targeting_or_event_contracts() {
  const queryLanguage =
    offerQuerySchema.properties.context.properties.user_profile.properties.language;
  assert.equal(queryLanguage.type, 'string');
  assert.match(queryLanguage.description, /BCP 47/i);
  assert.equal(Object.hasOwn(offerQuerySchema.properties, 'content_language'), false);

  const serializedEvents = `${JSON.stringify(agentPostbackSchema)}\n${JSON.stringify(
    partnerPostbackSchema,
  )}\n${eventsSpec}\n${postbackSpec}`;
  assert.doesNotMatch(serializedEvents, /content_language/);
}

test_content_language_optional_and_not_required();
test_content_language_accepts_common_bcp47_tags();
test_content_language_rejects_invalid_present_values();
test_content_language_documentation_boundary();
test_content_language_examples_and_legacy_compatibility();
test_content_language_does_not_change_targeting_or_event_contracts();

console.log('offer-content-language OK');
