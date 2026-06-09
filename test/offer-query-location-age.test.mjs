import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const schemaRoot = resolve(here, '..');

const querySchema = JSON.parse(
  readFileSync(resolve(schemaRoot, 'json-schema/offer-query-schema-v0.1.json'), 'utf8'),
);

const userProfile =
  querySchema.properties.context.properties.user_profile.properties;

assert.equal(userProfile.country.pattern, '^[A-Z]{2}$');
assert.equal(userProfile.location_ids.items.pattern, '^[0-9]+$');
assert.equal(userProfile.location_ids.uniqueItems, true);
assert.equal(userProfile.verified_age_over.items.minimum, 13);
assert.equal(userProfile.verified_age_over.items.maximum, 120);
assert.equal(userProfile.verified_age_over.uniqueItems, true);

function isValidLocationIds(value) {
  return Array.isArray(value) && new Set(value).size === value.length && value.every((id) => /^[0-9]+$/.test(id));
}

function isValidVerifiedAgeOver(value) {
  return (
    Array.isArray(value) &&
    new Set(value).size === value.length &&
    value.every((age) => Number.isInteger(age) && age >= 13 && age <= 120)
  );
}

assert.equal(isValidLocationIds(['1014221', '21137', '2840']), true);
assert.equal(isValidLocationIds(['21137', '21137']), false);
assert.equal(isValidLocationIds(['US-CA']), false);
assert.equal(isValidVerifiedAgeOver([18, 21]), true);
assert.equal(isValidVerifiedAgeOver([12]), false);
assert.equal(isValidVerifiedAgeOver([18, 18]), false);

console.log('offer-query-location-age OK');
