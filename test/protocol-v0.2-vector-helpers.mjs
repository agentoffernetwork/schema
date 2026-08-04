import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const here = dirname(fileURLToPath(import.meta.url));

export const schemaRoot = resolve(here, '..');
export const githubReposRoot = resolve(schemaRoot, '..');
export const workspaceRoot = resolve(githubReposRoot, '..', '..');

const schemaFiles = [
  'json-schema/goal-event-name-v0.2.json',
  'json-schema/offer-schema-v0.2.json',
  'json-schema/offer-query-schema-v0.2.json',
  'json-schema/offer-query-response-v0.2.json',
  'json-schema/offer-provider-request-v0.2.json',
  'json-schema/offer-provider-response-v0.2.json',
  'json-schema/postback-partner-payload-v0.2.json',
  'json-schema/postback-agent-payload-v0.2.json',
];

export function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function deepClone(value) {
  return structuredClone(value);
}

function decodePointerToken(token) {
  return token.replaceAll('~1', '/').replaceAll('~0', '~');
}

function pointerTokens(pointer) {
  if (pointer === '') return [];
  assert.match(pointer, /^\//, `JSON Pointer must start with "/": ${pointer}`);
  return pointer.slice(1).split('/').map(decodePointerToken);
}

export function readPointer(document, pointer) {
  let value = document;
  for (const token of pointerTokens(pointer)) {
    if (Array.isArray(value)) {
      assert.match(token, /^(0|[1-9][0-9]*)$/, `array pointer token must be an index: ${pointer}`);
      const index = Number(token);
      assert(index < value.length, `array pointer index is out of range: ${pointer}`);
      value = value[index];
      continue;
    }
    assert(value !== null && typeof value === 'object', `pointer parent is not a container: ${pointer}`);
    assert(Object.hasOwn(value, token), `pointer does not exist: ${pointer}`);
    value = value[token];
  }
  return value;
}

function pointerParent(document, pointer) {
  const tokens = pointerTokens(pointer);
  assert(tokens.length > 0, 'mutation cannot target the document root');
  const finalToken = tokens.pop();
  const parentPointer = tokens.length === 0
    ? ''
    : `/${tokens.map((token) => token.replaceAll('~', '~0').replaceAll('/', '~1')).join('/')}`;
  return { parent: readPointer(document, parentPointer), finalToken };
}

export function applyMutation(document, mutation) {
  assert(mutation && typeof mutation === 'object', 'mutation must be an object');
  assert(['set', 'delete', 'append'].includes(mutation.op), `unknown mutation op: ${mutation.op}`);
  const before = deepClone(document);

  if (mutation.op === 'append') {
    const target = readPointer(document, mutation.path);
    assert(Array.isArray(target), `append target must be an array: ${mutation.path}`);
    target.push(deepClone(mutation.value));
  } else {
    const { parent, finalToken } = pointerParent(document, mutation.path);
    assert(parent !== null && typeof parent === 'object', `mutation parent must be a container: ${mutation.path}`);
    if (Array.isArray(parent)) {
      assert.match(finalToken, /^(0|[1-9][0-9]*)$/, `array mutation token must be an index: ${mutation.path}`);
      const index = Number(finalToken);
      assert(index < parent.length, `array mutation index is out of range: ${mutation.path}`);
      if (mutation.op === 'delete') {
        parent.splice(index, 1);
      } else {
        parent[index] = deepClone(mutation.value);
      }
    } else if (mutation.op === 'delete') {
      assert(Object.hasOwn(parent, finalToken), `delete target does not exist: ${mutation.path}`);
      delete parent[finalToken];
    } else {
      parent[finalToken] = deepClone(mutation.value);
    }
  }

  assert.notDeepEqual(document, before, `mutation must change the document: ${mutation.op} ${mutation.path}`);
}

export function testMutationEngine() {
  const setDocument = { value: 1 };
  applyMutation(setDocument, { op: 'set', path: '/value', value: 2 });
  assert.deepEqual(setDocument, { value: 2 });

  const deleteDocument = { nested: { value: true } };
  applyMutation(deleteDocument, { op: 'delete', path: '/nested/value' });
  assert.deepEqual(deleteDocument, { nested: {} });

  const appendDocument = { values: [1] };
  applyMutation(appendDocument, { op: 'append', path: '/values', value: 2 });
  assert.deepEqual(appendDocument, { values: [1, 2] });

  assert.throws(() => applyMutation({ value: 1 }, { op: 'unknown', path: '/value' }));
  assert.throws(() => applyMutation({ value: 1 }, { op: 'delete', path: '/missing' }));
  assert.throws(() => applyMutation({ value: 1 }, { op: 'append', path: '/value', value: 2 }));
  assert.throws(() => applyMutation({ value: 1 }, { op: 'set', path: '/value', value: 1 }));
  assert.throws(() => readPointer({ value: 1 }, 'value'));
}

export function createSchemaRegistry() {
  const ajv = new Ajv2020({
    allErrors: true,
    allowUnionTypes: true,
    strict: true,
    strictRequired: false,
    multipleOfPrecision: 10,
  });
  addFormats(ajv);
  const schemasById = new Map();

  for (const relativePath of schemaFiles) {
    const schema = readJson(resolve(schemaRoot, relativePath));
    assert.equal(typeof schema.$id, 'string', `${relativePath} must define $id`);
    assert(!schemasById.has(schema.$id), `duplicate schema $id: ${schema.$id}`);
    schemasById.set(schema.$id, schema);
    ajv.addSchema(schema);
  }

  return { ajv, schemasById };
}

export function resolveFixture(relativePath) {
  assert.equal(typeof relativePath, 'string', 'fixture path must be a string');
  const resolved = resolve(githubReposRoot, relativePath);
  assert(
    resolved.startsWith(`${githubReposRoot}/`),
    `fixture must stay under protocol/github-repos: ${relativePath}`,
  );
  return resolved;
}

export function loadCaseDocument(testCase) {
  const fixture = readJson(resolveFixture(testCase.fixture));
  let document = testCase.fixture_pointer
    ? deepClone(readPointer(fixture, testCase.fixture_pointer))
    : deepClone(fixture);
  for (const mutation of testCase.mutations ?? []) {
    applyMutation(document, mutation);
  }
  return document;
}

export function formatAjvErrors(errors) {
  return (errors ?? [])
    .map((error) => `${error.instancePath || '/'} ${error.keyword}: ${error.message}`)
    .join('; ');
}
