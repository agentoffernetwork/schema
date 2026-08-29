import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const registryPath = resolve(here, '../locations/aon-location-registry-v1.json');
const registry = JSON.parse(readFileSync(registryPath, 'utf8'));

const locationsById = new Map(registry.locations.map((location) => [location.location_id, location]));
const countryLocationIds = new Map(
  registry.locations
    .filter((location) => location.aon_level === 'COUNTRY')
    .map((location) => [location.country_code, location.location_id]),
);

const US_STATE_SUBDIVISION_NAMES = {
  AL: 'Alabama',
  AK: 'Alaska',
  AZ: 'Arizona',
  AR: 'Arkansas',
  CA: 'California',
  CO: 'Colorado',
  CT: 'Connecticut',
  DE: 'Delaware',
  DC: 'District of Columbia',
  FL: 'Florida',
  GA: 'Georgia',
  HI: 'Hawaii',
  ID: 'Idaho',
  IL: 'Illinois',
  IN: 'Indiana',
  IA: 'Iowa',
  KS: 'Kansas',
  KY: 'Kentucky',
  LA: 'Louisiana',
  ME: 'Maine',
  MD: 'Maryland',
  MA: 'Massachusetts',
  MI: 'Michigan',
  MN: 'Minnesota',
  MS: 'Mississippi',
  MO: 'Missouri',
  MT: 'Montana',
  NE: 'Nebraska',
  NV: 'Nevada',
  NH: 'New Hampshire',
  NJ: 'New Jersey',
  NM: 'New Mexico',
  NY: 'New York',
  NC: 'North Carolina',
  ND: 'North Dakota',
  OH: 'Ohio',
  OK: 'Oklahoma',
  OR: 'Oregon',
  PA: 'Pennsylvania',
  RI: 'Rhode Island',
  SC: 'South Carolina',
  SD: 'South Dakota',
  TN: 'Tennessee',
  TX: 'Texas',
  UT: 'Utah',
  VT: 'Vermont',
  VA: 'Virginia',
  WA: 'Washington',
  WV: 'West Virginia',
  WI: 'Wisconsin',
  WY: 'Wyoming',
};

const externalCodesByLocationId = new Map();
const subdivisionLocationIdsByIso = new Map();
const subdivisionLocationIdsByCldr = new Map();

for (const [subdivisionCode, subdivisionName] of Object.entries(US_STATE_SUBDIVISION_NAMES)) {
  const location = registry.locations.find(
    (entry) =>
      entry.country_code === 'US' &&
      entry.aon_level === 'REGION' &&
      entry.target_type === 'State' &&
      entry.name === subdivisionName,
  );

  if (!location) continue;

  const iso_3166_2 = `US-${subdivisionCode}`;
  const cldr_subdivision = `US${subdivisionCode}`;
  const provider_short = subdivisionCode;

  subdivisionLocationIdsByIso.set(iso_3166_2, location.location_id);
  subdivisionLocationIdsByCldr.set(cldr_subdivision, location.location_id);
  externalCodesByLocationId.set(location.location_id, {
    iso_3166_2,
    cldr_subdivision,
    provider_short,
  });
}

function normalizeCountryCode(countryCode) {
  if (typeof countryCode !== 'string') return null;

  const normalized = countryCode.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(normalized) ? normalized : null;
}

function normalizeCodeType(codeType) {
  if (typeof codeType !== 'string') return 'AUTO';

  const normalized = codeType.trim().toUpperCase();
  return ['AUTO', 'ISO_3166_2', 'CLDR', 'PROVIDER_SHORT'].includes(normalized)
    ? normalized
    : 'AUTO';
}

function hasSelfOrAncestor(location, ancestorLocationId) {
  const chain = buildLocationChain(location.location_id);
  return chain ? chain.includes(ancestorLocationId) : false;
}

function getHeader(headers, name) {
  if (!headers || typeof headers !== 'object') return null;

  const wanted = name.toLowerCase();
  const key = Object.keys(headers).find((candidate) => candidate.toLowerCase() === wanted);
  const value = key ? headers[key] : null;

  if (Array.isArray(value)) return value[0] == null ? null : String(value[0]);
  return value == null ? null : String(value);
}

function locationLevelRank(level) {
  return { COUNTRY: 0, REGION: 1, CITY: 2 }[level] ?? 9;
}

function locationMatchRank(location, query) {
  if (!query) return 0;

  const name = location.name.toLowerCase();
  const canonicalName = location.canonical_name.toLowerCase();

  if (name === query) return 0;
  if (name.startsWith(query)) return 1;
  if (name.includes(query)) return 2;
  if (canonicalName.startsWith(query)) return 3;
  if (canonicalName.includes(query)) return 4;
  return 9;
}

export function countryCodeToLocationId(countryCode) {
  const normalized = normalizeCountryCode(countryCode);
  if (!normalized) return null;

  return countryLocationIds.get(normalized) ?? null;
}

export function subdivisionCodeToLocationId(code, { country, codeType = 'AUTO' } = {}) {
  if (typeof code !== 'string') return null;

  const normalizedCode = code.trim().toUpperCase();
  if (!normalizedCode) return null;

  const normalizedCountry = normalizeCountryCode(country);
  const normalizedCodeType = normalizeCodeType(codeType);
  const candidates = [];

  if (normalizedCodeType === 'AUTO' || normalizedCodeType === 'ISO_3166_2') {
    if (/^[A-Z]{2}-[A-Z0-9]{1,3}$/.test(normalizedCode)) {
      candidates.push({
        country: normalizedCode.slice(0, 2),
        iso: normalizedCode,
      });
    }
  }

  if (normalizedCodeType === 'AUTO' || normalizedCodeType === 'CLDR') {
    if (/^[A-Z]{2}[A-Z0-9]{1,3}$/.test(normalizedCode)) {
      candidates.push({
        country: normalizedCode.slice(0, 2),
        cldr: normalizedCode,
      });
    }
  }

  if (normalizedCountry && (normalizedCodeType === 'AUTO' || normalizedCodeType === 'PROVIDER_SHORT')) {
    if (/^[A-Z0-9]{1,3}$/.test(normalizedCode)) {
      candidates.push({
        country: normalizedCountry,
        iso: `${normalizedCountry}-${normalizedCode}`,
        cldr: `${normalizedCountry}${normalizedCode}`,
      });
    }
  }

  for (const candidate of candidates) {
    if (normalizedCountry && candidate.country !== normalizedCountry) continue;

    const locationId =
      (candidate.iso ? subdivisionLocationIdsByIso.get(candidate.iso) : null) ??
      (candidate.cldr ? subdivisionLocationIdsByCldr.get(candidate.cldr) : null);

    if (locationId) return locationId;
  }

  return null;
}

export function legacyCountryGeoToLocationGeo(countries) {
  if (!Array.isArray(countries)) return [];

  const seen = new Set();
  const entries = [];

  for (const country of countries) {
    const locationId = countryCodeToLocationId(country);
    if (!locationId || seen.has(locationId)) continue;

    seen.add(locationId);
    entries.push({ location_id: locationId });
  }

  return entries;
}

export function buildLocationChain(locationId) {
  if (typeof locationId !== 'string' || !/^[0-9]+$/.test(locationId)) return null;

  const chain = [];
  const seen = new Set();
  let current = locationsById.get(locationId);

  while (current) {
    if (seen.has(current.location_id)) return null;

    seen.add(current.location_id);
    chain.push(current.location_id);

    if (!current.parent_location_id) return chain;
    current = locationsById.get(current.parent_location_id);
  }

  return null;
}

export function toSearchResult(locationOrId) {
  const location =
    typeof locationOrId === 'string' ? locationsById.get(locationOrId) : locationOrId;

  if (!location) return null;

  const chain = buildLocationChain(location.location_id);
  if (!chain) return null;

  const path = chain
    .slice()
    .reverse()
    .map((id) => {
      const item = locationsById.get(id);

      return {
        location_id: item.location_id,
        name: item.name,
        level: item.aon_level,
      };
    });

  return {
    location_id: location.location_id,
    name: location.name,
    canonical_name: location.canonical_name,
    country_code: location.country_code,
    level: location.aon_level,
    target_type: location.target_type,
    parent_location_id: location.parent_location_id,
    path,
    ...(externalCodesByLocationId.has(location.location_id)
      ? { external_codes: externalCodesByLocationId.get(location.location_id) }
      : {}),
  };
}

export function searchLocations({
  q = '',
  country,
  levels,
  subdivision_code,
  subdivision_code_type = 'AUTO',
  limit = 20,
} = {}) {
  const query = typeof q === 'string' ? q.trim().toLowerCase() : '';
  const countryCode = normalizeCountryCode(country);
  const levelSet = Array.isArray(levels)
    ? new Set(levels.map((level) => String(level).trim().toUpperCase()))
    : null;
  const max = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 50) : 20;
  const subdivisionLocationId = subdivision_code
    ? subdivisionCodeToLocationId(subdivision_code, {
        country: countryCode,
        codeType: subdivision_code_type,
      })
    : null;

  if (subdivision_code && !subdivisionLocationId) {
    return {
      registry_version: registry.version,
      source_file_date: registry.source_file_date,
      locations: [],
    };
  }

  const results = registry.locations
    .filter((location) => {
      if (countryCode && location.country_code !== countryCode) return false;
      if (levelSet && !levelSet.has(location.aon_level)) return false;
      if (subdivisionLocationId && !hasSelfOrAncestor(location, subdivisionLocationId)) return false;
      if (!query) return true;

      return (
        location.name.toLowerCase().includes(query) ||
        location.canonical_name.toLowerCase().includes(query)
      );
    })
    .sort((left, right) => {
      const leftRank = locationMatchRank(left, query);
      const rightRank = locationMatchRank(right, query);
      if (leftRank !== rightRank) return leftRank - rightRank;

      const leftLevel = locationLevelRank(left.aon_level);
      const rightLevel = locationLevelRank(right.aon_level);
      if (leftLevel !== rightLevel) return leftLevel - rightLevel;

      return left.canonical_name.localeCompare(right.canonical_name);
    })
    .slice(0, max)
    .map(toSearchResult)
    .filter(Boolean);

  return {
    registry_version: registry.version,
    source_file_date: registry.source_file_date,
    locations: results,
  };
}

export function getLocationById(locationId) {
  return toSearchResult(locationId);
}

export function resolveLocationInput({
  country,
  subdivision_code,
  subdivision_code_type = 'AUTO',
  city,
  limit = 10,
} = {}) {
  const countryCode = normalizeCountryCode(country);
  const normalizedCity = typeof city === 'string' ? city.trim() : '';
  const normalizedSubdivision =
    typeof subdivision_code === 'string' ? subdivision_code.trim().toUpperCase() : null;

  const subdivisionLocationId = normalizedSubdivision
    ? subdivisionCodeToLocationId(normalizedSubdivision, {
        country: countryCode,
        codeType: subdivision_code_type,
      })
    : null;

  const input = {
    ...(countryCode ? { country: countryCode } : {}),
    ...(normalizedSubdivision ? { subdivision_code: normalizedSubdivision } : {}),
    ...(subdivision_code_type ? { subdivision_code_type: normalizeCodeType(subdivision_code_type) } : {}),
    ...(normalizedCity ? { city: normalizedCity } : {}),
  };

  let candidates = [];

  if (normalizedCity) {
    candidates = searchLocations({
      q: normalizedCity,
      country: countryCode,
      levels: ['CITY'],
      subdivision_code: normalizedSubdivision,
      subdivision_code_type,
      limit,
    }).locations;
  } else if (subdivisionLocationId) {
    const location = toSearchResult(subdivisionLocationId);
    candidates = location ? [location] : [];
  } else if (!normalizedSubdivision && countryCode) {
    const countryLocationId = countryCodeToLocationId(countryCode);
    const location = countryLocationId ? toSearchResult(countryLocationId) : null;
    candidates = location ? [location] : [];
  }

  const location = candidates[0] ?? null;
  const location_ids = location ? buildLocationChain(location.location_id) ?? [] : [];

  return {
    registry_version: registry.version,
    source_file_date: registry.source_file_date,
    location,
    location_ids,
    candidates,
    input,
  };
}

export function cloudflareHeadersToLocationContext(headers) {
  const country = normalizeCountryCode(getHeader(headers, 'cf-ipcountry'));
  const regionCode = getHeader(headers, 'cf-region-code');
  const city = getHeader(headers, 'cf-ipcity');
  const subdivision_code =
    country && typeof regionCode === 'string' && regionCode.trim()
      ? `${country}-${regionCode.trim().toUpperCase()}`
      : undefined;

  return resolveLocationInput({
    country,
    subdivision_code,
    subdivision_code_type: 'ISO_3166_2',
    city,
  });
}

export function googleCloudHeadersToLocationContext(headers) {
  return resolveLocationInput({
    country: getHeader(headers, 'client_region'),
    subdivision_code: getHeader(headers, 'client_region_subdivision'),
    subdivision_code_type: 'CLDR',
    city: getHeader(headers, 'client_city'),
  });
}

export { registry };
