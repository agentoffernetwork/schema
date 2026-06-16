import assert from 'node:assert/strict';
import {
  buildLocationChain,
  cloudflareHeadersToLocationContext,
  countryCodeToLocationId,
  googleCloudHeadersToLocationContext,
  legacyCountryGeoToLocationGeo,
  resolveLocationInput,
  searchLocations,
  subdivisionCodeToLocationId,
  toSearchResult,
} from '../helpers/location-helpers.mjs';

assert.equal(countryCodeToLocationId('US'), '2840');
assert.equal(countryCodeToLocationId('us'), '2840');
assert.equal(countryCodeToLocationId('SG'), '2702');
assert.equal(countryCodeToLocationId('ZZ'), null);
assert.equal(countryCodeToLocationId(''), null);
assert.equal(countryCodeToLocationId(null), null);

assert.equal(subdivisionCodeToLocationId('US-CA'), '21137');
assert.equal(subdivisionCodeToLocationId('us-ca'), '21137');
assert.equal(subdivisionCodeToLocationId('USCA'), '21137');
assert.equal(subdivisionCodeToLocationId('CA', { country: 'US' }), '21137');
assert.equal(subdivisionCodeToLocationId('CA'), null);
assert.equal(subdivisionCodeToLocationId('US-ZZ'), null);

assert.deepEqual(legacyCountryGeoToLocationGeo(['US', 'SG']), [
  { location_id: '2840' },
  { location_id: '2702' },
]);
assert.deepEqual(legacyCountryGeoToLocationGeo(['us', 'US']), [{ location_id: '2840' }]);
assert.deepEqual(legacyCountryGeoToLocationGeo(['ZZ']), []);

assert.deepEqual(buildLocationChain('1014221'), ['1014221', '21137', '2840']);
assert.deepEqual(buildLocationChain('21137'), ['21137', '2840']);
assert.deepEqual(buildLocationChain('2840'), ['2840']);
assert.equal(buildLocationChain('999999999'), null);

const result = toSearchResult('1014221');
assert.equal(result.location_id, '1014221');
assert.equal(result.name, 'San Francisco');
assert.equal(result.country_code, 'US');
assert.equal(result.level, 'CITY');
assert.equal(result.target_type, 'City');
assert.equal(result.parent_location_id, '21137');
assert.equal(result.external_codes, undefined);
assert.deepEqual(
  result.path.map((item) => item.location_id),
  ['2840', '21137', '1014221'],
);
assert.equal(Object.hasOwn(result, 'ancestor_location_ids'), false);

const california = toSearchResult('21137');
assert.deepEqual(california.external_codes, {
  iso_3166_2: 'US-CA',
  cldr_subdivision: 'USCA',
  provider_short: 'CA',
});

const citySearch = searchLocations({
  q: 'san fran',
  country: 'US',
  levels: ['CITY'],
  subdivision_code: 'US-CA',
});
assert.ok(citySearch.locations.some((item) => item.location_id === '1014221'));
assert.equal(citySearch.locations.every((item) => item.level === 'CITY'), true);
assert.equal(
  citySearch.locations.every((item) =>
    buildLocationChain(item.location_id)?.includes('21137'),
  ),
  true,
);

const cloudflare = cloudflareHeadersToLocationContext({
  'cf-ipcountry': 'US',
  'cf-region-code': 'CA',
  'cf-ipcity': 'San Francisco',
});
assert.equal(cloudflare.location.location_id, '1014221');
assert.deepEqual(cloudflare.location_ids, ['1014221', '21137', '2840']);
assert.equal(cloudflare.input.subdivision_code, 'US-CA');

const googleCloud = googleCloudHeadersToLocationContext({
  client_region: 'US',
  client_region_subdivision: 'USCA',
  client_city: 'San Francisco',
});
assert.equal(googleCloud.location.location_id, '1014221');
assert.deepEqual(googleCloud.location_ids, ['1014221', '21137', '2840']);
assert.equal(googleCloud.input.subdivision_code, 'USCA');

const regionOnly = resolveLocationInput({ country: 'US', subdivision_code: 'US-CA' });
assert.equal(regionOnly.location.location_id, '21137');
assert.deepEqual(regionOnly.location_ids, ['21137', '2840']);

const unknown = resolveLocationInput({ country: 'US', subdivision_code: 'US-ZZ' });
assert.equal(unknown.location, null);
assert.deepEqual(unknown.location_ids, []);
assert.deepEqual(unknown.candidates, []);

console.log('location-helpers OK');
