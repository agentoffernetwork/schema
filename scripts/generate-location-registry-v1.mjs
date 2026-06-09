#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const defaultOutput = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  '../locations/aon-location-registry-v1.json',
);

const regionTargetTypes = new Set([
  'Autonomous Community',
  'Canton',
  'Department',
  'Division',
  'Governorate',
  'Okrug',
  'Prefecture',
  'Province',
  'Region',
  'State',
  'Territory',
]);

function parseArgs(argv) {
  const args = { output: defaultOutput };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--csv') {
      args.csv = argv[++i];
    } else if (arg === '--output') {
      args.output = argv[++i];
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }
  if (!args.csv) {
    throw new Error('usage: generate-location-registry-v1.mjs --csv <geotargets.csv> [--output <path>]');
  }
  return args;
}

function parseCsv(text) {
  const rows = [];
  let current = '';
  let row = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];
    if (ch === '"' && inQuotes && next === '"') {
      current += '"';
      i += 1;
    } else if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      row.push(current);
      current = '';
    } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && next === '\n') {
        i += 1;
      }
      row.push(current);
      current = '';
      if (row.some((value) => value.length > 0)) {
        rows.push(row);
      }
      row = [];
    } else {
      current += ch;
    }
  }
  if (current.length > 0 || row.length > 0) {
    row.push(current);
    rows.push(row);
  }
  const [headers, ...dataRows] = rows;
  return dataRows.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ''])));
}

function aonLevel(row) {
  if (row['Target Type'] === 'Country') {
    return 'COUNTRY';
  }
  if (regionTargetTypes.has(row['Target Type'])) {
    return 'REGION';
  }
  if (row['Target Type'] === 'City') {
    return 'CITY';
  }
  return null;
}

function sourceDateFromName(file) {
  const match = path.basename(file).match(/(\d{4}-\d{2}-\d{2})/);
  if (!match) {
    throw new Error(`cannot infer source_file_date from ${file}`);
  }
  return match[1];
}

function nearestSupportedParent(row, byId, supportedIds) {
  let parentId = row['Parent ID'];
  while (parentId) {
    if (supportedIds.has(parentId)) {
      return parentId;
    }
    parentId = byId.get(parentId)?.['Parent ID'] ?? '';
  }
  if (row['Target Type'] !== 'Country') {
    const country = [...supportedIds]
      .map((id) => byId.get(id))
      .find((candidate) => candidate?.['Target Type'] === 'Country' && candidate['Country Code'] === row['Country Code']);
    return country?.['Criteria ID'] ?? null;
  }
  return null;
}

function ancestorsFor(row, byId, supportedIds) {
  const ancestors = [];
  let parentId = nearestSupportedParent(row, byId, supportedIds);
  while (parentId) {
    ancestors.push(parentId);
    const parent = byId.get(parentId);
    parentId = parent ? nearestSupportedParent(parent, byId, supportedIds) : null;
  }
  return ancestors;
}

function buildRegistry(csvPath) {
  const bytes = fs.readFileSync(csvPath);
  const rows = parseCsv(bytes.toString('utf8').replace(/^\uFEFF/, ''));
  const byId = new Map(rows.map((row) => [row['Criteria ID'], row]));
  const supportedRows = rows
    .filter((row) => row.Status === 'Active')
    .map((row) => ({ row, level: aonLevel(row) }))
    .filter(({ level }) => level);
  const supportedIds = new Set(supportedRows.map(({ row }) => row['Criteria ID']));

  const locations = supportedRows.map(({ row, level }) => {
    const parent = nearestSupportedParent(row, byId, supportedIds);
    return {
      location_id: row['Criteria ID'],
      source_criteria_id: row['Criteria ID'],
      name: row.Name,
      canonical_name: row['Canonical Name'],
      country_code: row['Country Code'],
      target_type: row['Target Type'],
      aon_level: level,
      parent_location_id: parent,
      ancestor_location_ids: ancestorsFor(row, byId, supportedIds),
      status: 'ACTIVE',
    };
  });

  return {
    version: 'v1',
    source_name: 'google-ads-geotargets',
    source_file: path.basename(csvPath),
    source_file_date: sourceDateFromName(csvPath),
    source_sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
    generated_at: new Date().toISOString(),
    supported_levels: ['COUNTRY', 'REGION', 'CITY'],
    locations,
  };
}

function main() {
  const args = parseArgs(process.argv);
  const registry = buildRegistry(path.resolve(args.csv));
  fs.mkdirSync(path.dirname(path.resolve(args.output)), { recursive: true });
  fs.writeFileSync(path.resolve(args.output), `${JSON.stringify(registry)}\n`);
  console.log(`wrote ${registry.locations.length} locations to ${args.output}`);
}

main();
