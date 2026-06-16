import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const schemaRoot = resolve(here, '..');
const monorepoRoot = resolve(schemaRoot, '../../..');

const protocolSpecPath = 'protocol/github-repos/protocol/specs/location-search-api.md';
const examplesDir = 'protocol/github-repos/examples/http/location-search';
const docsGuidePath = 'apps/docs-site/app/protocol/location-targeting/page.mdx';
const helpersPath = 'protocol/github-repos/schema/helpers/location-helpers.mjs';
const isMonorepo = existsSync(resolve(monorepoRoot, protocolSpecPath));
const repoRoot = isMonorepo ? monorepoRoot : schemaRoot;
const schemaPath = isMonorepo
  ? 'protocol/github-repos/schema/json-schema/location-search-response-v0.1.json'
  : 'json-schema/location-search-response-v0.1.json';
const typesPath = isMonorepo
  ? 'protocol/github-repos/schema/types/location.types.ts'
  : 'types/location.types.ts';

function read(relativePath) {
  return readFileSync(resolve(repoRoot, relativePath), 'utf8');
}

function readJson(relativePath) {
  return JSON.parse(read(relativePath));
}

for (const file of isMonorepo ? [protocolSpecPath, schemaPath, typesPath, docsGuidePath, helpersPath] : [schemaPath, typesPath]) {
  assert.equal(existsSync(resolve(repoRoot, file)), true, `${file} should exist`);
}

if (isMonorepo) {
  const spec = read(protocolSpecPath);
  for (const text of [
    'GET /v1/locations/search',
    'GET /v1/locations/{location_id}',
    '`q`',
    '`country`',
    '`levels`',
    '`subdivision_code`',
    '`subdivision_code_type`',
    '`limit`',
    '`locale`',
    '`location_id`',
    '`external_codes`',
    '`canonical_name`',
    '`parent_location_id`',
    '`provider_short`',
    '`path`',
    'GET /v1/locations/resolve',
    'Cloudflare',
    'Google Cloud',
    'ISO 3166-2',
    'COUNTRY',
    'REGION',
    'CITY',
    'not a caller-side offer search filter',
    'runtime API',
  ]) {
    assert.ok(spec.includes(text), `spec should include ${text}`);
  }
  assert.equal(spec.includes('ancestor_location_ids'), false);
  assert.equal(spec.includes('future runtime'), false);
  assert.equal(spec.includes('Until services expose'), false);
}

const schema = readJson(schemaPath);
const location = schema.$defs.locationSearchResult;
assert.equal(schema.properties.code.const, 'SUCCESS');
assert.equal(location.properties.location_id.pattern, '^[0-9]+$');
assert.deepEqual(location.properties.level.enum, ['COUNTRY', 'REGION', 'CITY']);
assert.ok(location.required.includes('path'));
assert.ok(!location.required.includes('external_codes'));
assert.equal(location.properties.external_codes.properties.iso_3166_2.pattern, '^[A-Z]{2}-[A-Z0-9]{1,3}$');
assert.equal(location.properties.external_codes.properties.cldr_subdivision.pattern, '^[A-Z]{2}[A-Z0-9]{1,3}$');
assert.equal(location.properties.external_codes.properties.provider_short.pattern, '^[A-Z0-9]{1,3}$');
assert.ok(schema.$defs.locationResolveResponse);
assert.equal(JSON.stringify(schema).includes('ancestor_location_ids'), false);

const types = read(typesPath);
for (const text of [
  'export type LocationLevel = "COUNTRY" | "REGION" | "CITY"',
  'export interface LocationExternalCodes',
  'provider_short?: string',
  'export interface LocationSearchQuery',
  'parent_location_id?: string',
  'export interface LocationSearchResult',
  'external_codes?: LocationExternalCodes',
  'export interface LocationSearchResponse',
  'export interface LocationLookupResponse',
  'export interface LocationResolveResponse',
  'subdivisionCodeToLocationId',
  'resolveLocationInput',
  'cloudflareHeadersToLocationContext',
  'googleCloudHeadersToLocationContext',
  'countryCodeToLocationId',
  'buildLocationChain',
]) {
  assert.ok(types.includes(text), `types should include ${text}`);
}

if (isMonorepo) {
  const california = readJson(`${examplesDir}/search-california-response.json`);
  const californiaNames = california.data.locations.map((item) => item.canonical_name);
  assert.ok(californiaNames.includes('California,United States'));
  assert.ok(californiaNames.includes('California,Maryland,United States'));
  assert.ok(california.data.locations.some((item) => item.location_id === '21137' && item.level === 'REGION'));
  assert.ok(california.data.locations.some((item) => item.level === 'CITY'));
  assert.deepEqual(
    california.data.locations.find((item) => item.location_id === '21137').external_codes,
    { iso_3166_2: 'US-CA', cldr_subdivision: 'USCA', provider_short: 'CA' },
  );

  const lookup = readJson(`${examplesDir}/lookup-san-francisco-response.json`);
  assert.deepEqual(lookup.data.location_ids, ['1014221', '21137', '2840']);
  assert.equal(lookup.data.location.location_id, '1014221');

  const migration = readJson(`${examplesDir}/migrate-country-geo.json`);
  assert.deepEqual(migration.structured_geo.include, [{ location_id: '2840' }, { location_id: '2702' }]);

  const queryChain = readJson(`${examplesDir}/query-location-chain.json`);
  assert.deepEqual(queryChain.context.user_profile.location_ids, ['1014221', '21137', '2840']);

  const isoResolve = readJson(`${examplesDir}/resolve-iso-subdivision.json`);
  assert.equal(isoResolve.request.subdivision_code, 'US-CA');
  assert.equal(isoResolve.response.data.location.location_id, '21137');
  assert.deepEqual(isoResolve.response.data.location.external_codes, {
    iso_3166_2: 'US-CA',
    cldr_subdivision: 'USCA',
    provider_short: 'CA',
  });

  const cloudflare = readJson(`${examplesDir}/resolve-cloudflare-headers.json`);
  assert.deepEqual(cloudflare.query_context.context.user_profile.location_ids, ['1014221', '21137', '2840']);

  const googleCloud = readJson(`${examplesDir}/resolve-google-cloud-headers.json`);
  assert.deepEqual(googleCloud.query_context.context.user_profile.location_ids, ['1014221', '21137', '2840']);

  const docsGuide = read(docsGuidePath);
  for (const text of [
    'Location Search API',
    'static registry',
    'ISO 3166-2',
    'Cloudflare',
    'Google Cloud',
    'subdivisionCodeToLocationId',
    'cloudflareHeadersToLocationContext',
    'countryCodeToLocationId',
    'buildLocationChain',
    'runtime Location Search API',
  ]) {
    assert.ok(docsGuide.includes(text), `docs guide should include ${text}`);
  }

  const helpers = read(helpersPath);
  for (const text of [
    'provider_short',
    'subdivisionCodeToLocationId',
    'toSearchResult',
  ]) {
    assert.ok(helpers.includes(text), `helpers should include ${text}`);
  }
}

console.log('location-search-contract OK');
