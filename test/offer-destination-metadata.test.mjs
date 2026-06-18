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
const offerSpec = readFileSync(resolve(protocolRoot, 'specs/offer-schema.md'), 'utf8');
const offerResponse = JSON.parse(
  readFileSync(resolve(examplesRoot, 'http/offer-response.json'), 'utf8'),
);

const action = offerSchema.properties.action;
const entity = offerSchema.properties.entity;
const destinationTypes = action.properties.destination_types;
const offerExtra = offerSchema.properties.extra;
const entityLogo = entity.properties.logo;
const destinationEnum = ['website', 'app_store', 'google_play', 'apk', 'agent', 'others'];

function matchesDestinationTypes(value) {
  if (value === undefined) {
    return true;
  }
  if (!Array.isArray(value)) {
    return false;
  }
  if (value.length < destinationTypes.minItems) {
    return false;
  }
  if (destinationTypes.uniqueItems && new Set(value).size !== value.length) {
    return false;
  }
  const allowed = new Set(destinationTypes.items.enum);
  return value.every((item) => typeof item === 'string' && allowed.has(item));
}

function matchesOfferExtra(value) {
  if (value === undefined) {
    return true;
  }
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value)
  );
}

function matchesEntityLogo(value) {
  if (value === undefined) {
    return true;
  }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const keys = Object.keys(value);
  if (!keys.includes('url')) {
    return false;
  }
  if (keys.some((key) => !['url', 'alt_text'].includes(key))) {
    return false;
  }
  if (typeof value.url !== 'string' || !/^https?:\/\//.test(value.url)) {
    return false;
  }
  return value.alt_text === undefined || typeof value.alt_text === 'string';
}

function test_action_destination_types_schema_shape() {
  assert.ok(destinationTypes, 'action.destination_types schema must exist');
  assert.equal(action.required.includes('destination_types'), false);
  assert.equal(destinationTypes.type, 'array');
  assert.equal(destinationTypes.minItems, 1);
  assert.equal(destinationTypes.uniqueItems, true);
  assert.deepEqual(destinationTypes.items.enum, destinationEnum);
  assert.deepEqual(action.properties.type.enum, ['web_redirect', 'app_deep_link']);
}

function test_entity_logo_schema_shape() {
  assert.ok(entityLogo, 'entity.logo schema must exist');
  assert.equal(entity.required.includes('logo'), false);
  assert.equal(entityLogo.type, 'object');
  assert.deepEqual(entityLogo.required, ['url']);
  assert.equal(entityLogo.properties.url.format, 'uri');
  assert.equal(entityLogo.properties.url.pattern, '^https?://');
  assert.equal(entityLogo.additionalProperties, false);
  assert.match(offerSpec, /`entity\.logo`/);
  assert.match(offerSpec, /HTTP\(S\) `url`/);
  assert.match(offerSpec, /`material\[\]` creative assets/i);
}

function test_offer_extra_schema_shape() {
  assert.ok(offerExtra, 'offer.extra schema must exist');
  assert.equal(offerSchema.required.includes('extra'), false);
  assert.equal(offerExtra.type, 'object');
  assert.equal(Object.hasOwn(offerExtra, 'required'), false);
  assert.equal(Object.hasOwn(offerExtra, 'properties'), false);
  assert.equal(offerExtra.additionalProperties, true);
  assert.match(offerSpec, /`offer\.extra`/);
  assert.match(offerSpec, /response envelope `extra`/i);
}

function test_destination_types_and_extra_accept_valid_values() {
  assert.equal(matchesDestinationTypes(['website']), true);
  assert.equal(matchesDestinationTypes(['app_store', 'google_play']), true);
  assert.equal(matchesDestinationTypes(['agent', 'others']), true);
  assert.equal(matchesOfferExtra({}), true);
  assert.equal(
    matchesOfferExtra({
      app_platform: 'ios',
      score: 0.92,
      enabled: true,
      nullable: null,
      tags: ['partner', 'manual'],
      nested: { source: 'partner_config' },
    }),
    true,
  );
  assert.match(offerTypes, /export type DestinationType =/);
  assert.match(offerTypes, /destination_types\?: DestinationType\[\];/);
  assert.match(offerTypes, /extra\?: Record<string, unknown>;/);
  assert.match(offerTypes, /logo\?: EntityLogo;/);
  assert.equal(matchesEntityLogo({ url: 'https://cdn.example.com/logo.png' }), true);
  assert.equal(
    matchesEntityLogo({ url: 'https://cdn.example.com/logo.png', alt_text: 'Brand logo' }),
    true,
  );
}

function test_old_payload_compatibility() {
  assert.equal(offerSchema.required.includes('extra'), false);
  assert.equal(action.required.includes('destination_types'), false);
  assert.equal(entity.required.includes('logo'), false);
  for (const key of ['offer_id', 'offer_instance_id', 'version', 'offer_info', 'entity', 'action', 'bid']) {
    assert.equal(offerSchema.required.includes(key), true, `${key} should remain required`);
  }
  assert.deepEqual(action.required, ['type', 'payload']);
}

function test_invalid_destination_types_and_extra_rejected() {
  assert.equal(matchesDestinationTypes('website'), false);
  assert.equal(matchesDestinationTypes([]), false);
  assert.equal(matchesDestinationTypes(['website', 'website']), false);
  assert.equal(matchesDestinationTypes(['unknown']), false);
  assert.equal(matchesDestinationTypes(['app_store', 123]), false);
  for (const value of ['raw', 1, true, null, []]) {
    assert.equal(matchesOfferExtra(value), false, `${JSON.stringify(value)} should not match offer.extra`);
  }
  assert.equal(matchesEntityLogo({}), false);
  assert.equal(matchesEntityLogo({ url: 123 }), false);
  assert.equal(matchesEntityLogo({ url: 'data:image/png;base64,abc' }), false);
  assert.equal(matchesEntityLogo({ url: 'ftp://cdn.example.com/logo.png' }), false);
  assert.equal(matchesEntityLogo({ url: 'javascript:alert(1)' }), false);
  assert.equal(matchesEntityLogo({ url: 'https://cdn.example.com/logo.png', extra: true }), false);
}

function test_docs_examples_and_types_boundaries() {
  assert.match(offerSpec, /`action\.type`[^\\n]+execution mechanism/i);
  assert.match(offerSpec, /`action\.destination_types`[^\\n]+target shape/i);
  assert.match(offerSpec, /not a list of click URLs/i);
  assert.match(offerSpec, /not express priority/i);
  assert.match(offerSpec, /`action\.payload\.target` remains the executable target/i);
  assert.match(offerSpec, /`data\.offers\[\]\.extra`/);

  const offer = offerResponse.offers[0];
  assert.deepEqual(offer.action.destination_types, ['website']);
  assert.equal(offer.action.payload.target, 'https://www.teamflow.example/signup');
  assert.deepEqual(offer.extra, {
    metadata_source: 'partner_config',
    metadata_confidence: 'high',
  });
  assert.deepEqual(offer.entity.logo, {
    url: 'https://cdn.example.com/logos/teamflow.png',
    alt_text: 'TeamFlow logo',
  });
}

test_action_destination_types_schema_shape();
test_entity_logo_schema_shape();
test_offer_extra_schema_shape();
test_destination_types_and_extra_accept_valid_values();
test_old_payload_compatibility();
test_invalid_destination_types_and_extra_rejected();
test_docs_examples_and_types_boundaries();

console.log('offer-destination-metadata OK');
