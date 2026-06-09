import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const schemaRoot = resolve(here, '..');

const registry = JSON.parse(
  readFileSync(resolve(schemaRoot, 'locations/aon-location-registry-v1.json'), 'utf8'),
);
const registrySchema = JSON.parse(
  readFileSync(resolve(schemaRoot, 'json-schema/location-registry-v1.schema.json'), 'utf8'),
);

assert.equal(registry.version, 'v1');
assert.equal(registry.source_name, 'google-ads-geotargets');
assert.equal(registry.source_file_date, '2026-05-28');
assert.deepEqual(registry.supported_levels, ['COUNTRY', 'REGION', 'CITY']);
assert.equal(registrySchema.$defs.location.properties.location_id.pattern, '^[0-9]+$');

const byId = new Map(registry.locations.map((location) => [location.location_id, location]));

assert.equal(byId.get('2840')?.name, 'United States');
assert.equal(byId.get('2840')?.aon_level, 'COUNTRY');
assert.equal(byId.get('21137')?.name, 'California');
assert.equal(byId.get('21137')?.parent_location_id, '2840');
assert.equal(byId.get('1014221')?.name, 'San Francisco');
assert.deepEqual(byId.get('1014221')?.ancestor_location_ids, ['21137', '2840']);

console.log('location-contract-sync OK');
