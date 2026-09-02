import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const v1Root = join(repositoryRoot, 'v1.0');
const schemaDirectory = join(v1Root, 'json-schema');

function collectFiles(directory, suffix) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) return collectFiles(entryPath, suffix);
    return entry.name.endsWith(suffix) ? [entryPath] : [];
  });
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

const ajv = new Ajv2020({
  allErrors: true,
  strictSchema: true,
  strictRequired: false,
  strictTypes: false,
});

addFormats(ajv);
ajv.addKeyword({ keyword: 'x-aon-maxUtf8Bytes', schemaType: 'number', valid: true });

const jsonFiles = collectFiles(v1Root, '.json');
for (const jsonFile of jsonFiles) {
  readJson(jsonFile);
}

const schemaDocuments = collectFiles(schemaDirectory, '.json').map(readJson);
for (const schemaDocument of schemaDocuments) {
  ajv.addSchema(schemaDocument);
}

for (const schemaDocument of schemaDocuments) {
  assert(ajv.getSchema(schemaDocument.$id), `Expected compiled schema ${schemaDocument.$id}`);
}

const partnerOfferSchema = readJson(join(schemaDirectory, 'offer-partner-schema.json'));
const validatePartnerOffer = ajv.getSchema(partnerOfferSchema.$id);
assert(validatePartnerOffer, `Expected schema ${partnerOfferSchema.$id}`);

const validPartnerOffer = readJson(join(v1Root, 'fixtures/offer-partner/valid.json'));
assert(
  validatePartnerOffer(validPartnerOffer),
  `fixtures/offer-partner/valid.json: ${ajv.errorsText(validatePartnerOffer.errors, { separator: '; ' })}`,
);

console.log(`Parsed ${jsonFiles.length} JSON documents and compiled ${schemaDocuments.length} schemas.`);
