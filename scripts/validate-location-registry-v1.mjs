#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const schemaRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const registryPath = path.join(schemaRoot, 'locations/aon-location-registry-v1.json');
const requiredIds = new Map([
  ['2840', 'United States'],
  ['21137', 'California'],
  ['21180', 'Washington'],
  ['1014221', 'San Francisco'],
]);
const supportedLevels = new Set(['COUNTRY', 'REGION', 'CITY']);

function fail(message) {
  throw new Error(message);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function parentChain(location, byId) {
  const chain = [];
  const seen = new Set([location.location_id]);
  let parentId = location.parent_location_id;

  while (parentId) {
    if (seen.has(parentId)) {
      fail(`parent cycle detected for ${location.location_id}`);
    }
    const parent = byId.get(parentId);
    if (!parent) {
      fail(`parent ${parentId} missing for ${location.location_id}`);
    }
    chain.push(parentId);
    seen.add(parentId);
    parentId = parent.parent_location_id;
  }

  return chain;
}

function validateRegistry(registry) {
  if (registry.version !== 'v1') fail('version must be v1');
  if (registry.source_name !== 'google-ads-geotargets') fail('source_name must be google-ads-geotargets');
  if (registry.source_file_date !== '2026-05-28') fail('source_file_date must be 2026-05-28');
  if (!/^[a-f0-9]{64}$/.test(registry.source_sha256 ?? '')) fail('source_sha256 must be lowercase sha256 hex');
  if (!Array.isArray(registry.locations) || registry.locations.length === 0) fail('locations must be non-empty');
  const byId = new Map();
  for (const location of registry.locations) {
    if (!/^[0-9]+$/.test(location.location_id)) fail(`invalid location_id: ${location.location_id}`);
    if (location.source_criteria_id !== location.location_id) fail(`source_criteria_id mismatch: ${location.location_id}`);
    if (!supportedLevels.has(location.aon_level)) fail(`unsupported aon_level: ${location.aon_level}`);
    if (location.status !== 'ACTIVE') fail(`non-active location in registry: ${location.location_id}`);
    if (location.parent_location_id !== null && !/^[0-9]+$/.test(location.parent_location_id)) {
      fail(`invalid parent_location_id for ${location.location_id}`);
    }
    if (Object.prototype.hasOwnProperty.call(location, 'ancestor_location_ids')) {
      fail(`ancestor_location_ids must not be published for ${location.location_id}`);
    }
    byId.set(location.location_id, location);
  }
  for (const [id, name] of requiredIds) {
    const location = byId.get(id);
    if (!location) fail(`required location_id missing: ${id}`);
    if (location.name !== name) fail(`required location ${id} expected ${name}, got ${location.name}`);
  }
  for (const location of registry.locations) {
    const ancestors = parentChain(location, byId);
    if (location.aon_level === 'CITY' && ancestors.length === 0) {
      fail(`city ${location.location_id} must have at least one supported ancestor`);
    }
  }
  const unsupportedTypes = new Set(['Postal Code', 'District', 'DMA Region', 'TV Region', 'Airport', 'University']);
  for (const location of registry.locations) {
    if (unsupportedTypes.has(location.target_type)) {
      fail(`unsupported target_type leaked into registry: ${location.target_type} ${location.location_id}`);
    }
  }
  return { count: registry.locations.length };
}

function main() {
  const result = validateRegistry(readJson(registryPath));
  console.log(`AON Location Registry v1 OK: ${result.count} locations`);
}

main();
