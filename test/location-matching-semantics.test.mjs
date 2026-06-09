import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const schemaRoot = resolve(here, '..');
const registry = JSON.parse(
  readFileSync(resolve(schemaRoot, 'locations/aon-location-registry-v1.json'), 'utf8'),
);
const locationIds = new Set(registry.locations.map((location) => location.location_id));

function knownLocationId(id) {
  return typeof id === 'string' && locationIds.has(id);
}

function locationMatches({ include = [], exclude = [] }, viewerLocationIds) {
  if (!Array.isArray(viewerLocationIds) || viewerLocationIds.length === 0) {
    return false;
  }
  if (!viewerLocationIds.every(knownLocationId)) {
    return false;
  }
  if (!include.every(knownLocationId) || !exclude.every(knownLocationId)) {
    return false;
  }

  const viewerSet = new Set(viewerLocationIds);
  if (exclude.some((id) => viewerSet.has(id))) {
    return false;
  }
  return include.some((id) => viewerSet.has(id));
}

function ageMatches(minAge, verifiedAgeOver) {
  if (minAge == null) {
    return true;
  }
  return Array.isArray(verifiedAgeOver) && verifiedAgeOver.some((threshold) => threshold >= minAge);
}

const sanFranciscoViewer = ['1014221', '21137', '2840'];

assert.equal(locationMatches({ include: ['2840'] }, sanFranciscoViewer), true);
assert.equal(locationMatches({ include: ['21137'] }, sanFranciscoViewer), true);
assert.equal(locationMatches({ include: ['1014221'] }, sanFranciscoViewer), true);
assert.equal(locationMatches({ include: ['21180'] }, sanFranciscoViewer), false);
assert.equal(locationMatches({ include: ['2840'], exclude: ['21137'] }, sanFranciscoViewer), false);
assert.equal(locationMatches({ include: ['999999999'] }, sanFranciscoViewer), false);
assert.equal(locationMatches({ include: ['2840'] }, ['999999999']), false);

assert.equal(ageMatches(18, [18]), true);
assert.equal(ageMatches(18, [21]), true);
assert.equal(ageMatches(21, [18]), false);
assert.equal(ageMatches(18, undefined), false);

console.log('location-matching-semantics OK');
