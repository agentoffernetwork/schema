import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const schemaRoot = resolve(here, '..');

const offerSchema = JSON.parse(
  readFileSync(resolve(schemaRoot, 'json-schema/offer-schema-v0.1.json'), 'utf8'),
);

const targeting = offerSchema.properties.targeting.items.properties;
const geo = targeting.geo.properties;

assert.equal(targeting.eligibility.properties.min_age.minimum, 13);
assert.equal(targeting.eligibility.properties.min_age.maximum, 120);
assert.equal(geo.include.oneOf.length, 3);
assert.equal(geo.exclude.oneOf.length, 3);

function isLegacyCountryArray(value) {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((item) => typeof item === 'string' && /^([A-Z]{2}|ALL)$/.test(item))
  );
}

function isLocationIdArray(value) {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(
      (item) =>
        item &&
        typeof item === 'object' &&
        Object.keys(item).length === 1 &&
        typeof item.location_id === 'string' &&
        /^[0-9]+$/.test(item.location_id),
    )
  );
}

function matchesGeoArray(value) {
  if (Array.isArray(value) && value.length === 0) {
    return true;
  }
  return [isLegacyCountryArray(value), isLocationIdArray(value)].filter(Boolean).length === 1;
}

assert.equal(matchesGeoArray(['US', 'CA']), true);
assert.equal(matchesGeoArray([{ location_id: '2840' }, { location_id: '21137' }]), true);
assert.equal(matchesGeoArray(['US', { location_id: '21137' }]), false);
assert.equal(matchesGeoArray([]), true);
assert.equal(matchesGeoArray([{ location_id: 'US-CA' }]), false);

console.log('offer-schema-location-age OK');
