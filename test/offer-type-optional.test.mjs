import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const schemaRoot = resolve(here, '..');

const offerSchema = JSON.parse(
  readFileSync(resolve(schemaRoot, 'json-schema/offer-schema-v0.1.json'), 'utf8'),
);
const offerTypes = readFileSync(resolve(schemaRoot, 'types/offer.types.ts'), 'utf8');

const offerInfo = offerSchema.properties.offer_info;
const offerType = offerInfo.properties.offer_type;
const publicOfferTypeValues = new Set(offerType.enum);

function minimalOfferInfo(overrides = {}) {
  return {
    title: 'Workspace Pro',
    category: { id: 'business_industrial.business_services' },
    description: 'Team workspace subscription.',
    ...overrides,
  };
}

function validateOfferInfoShape(value) {
  for (const key of offerInfo.required) {
    if (!Object.hasOwn(value, key)) {
      return { ok: false, error: `missing ${key}` };
    }
  }
  if (Object.hasOwn(value, 'offer_type')) {
    const raw = value.offer_type;
    if (typeof raw !== 'string' || !publicOfferTypeValues.has(raw)) {
      return { ok: false, error: 'invalid offer_type' };
    }
  }
  return { ok: true };
}

function test_missing_offer_type_is_valid_and_core_fields_remain_required() {
  assert.equal(offerInfo.required.includes('offer_type'), false);
  assert.deepEqual(validateOfferInfoShape(minimalOfferInfo()), { ok: true });

  for (const key of ['title', 'category', 'description']) {
    const value = minimalOfferInfo();
    delete value[key];
    assert.equal(validateOfferInfoShape(value).ok, false, `${key} should remain required`);
  }
}

function test_present_offer_type_legal_values_are_preserved() {
  assert.deepEqual(
    [...publicOfferTypeValues].sort(),
    ['content', 'digital_goods', 'offline_service', 'online_service', 'physical_product'].sort(),
  );
  for (const value of publicOfferTypeValues) {
    assert.deepEqual(validateOfferInfoShape(minimalOfferInfo({ offer_type: value })), { ok: true });
  }
  assert.match(offerTypes, /offer_type\?: OfferType;/);
  assert.match(offerTypes, /fulfillment hint/i);
}

function test_offer_type_public_boundaries_reject_null_empty_unknown_and_invalid_values() {
  for (const value of [null, '', 'unknown', 'not_a_type']) {
    assert.equal(
      validateOfferInfoShape(minimalOfferInfo({ offer_type: value })).ok,
      false,
      `expected ${JSON.stringify(value)} to be invalid`,
    );
  }
}

test_missing_offer_type_is_valid_and_core_fields_remain_required();
test_present_offer_type_legal_values_are_preserved();
test_offer_type_public_boundaries_reject_null_empty_unknown_and_invalid_values();

console.log('offer-type-optional OK');
