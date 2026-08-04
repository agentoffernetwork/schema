import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { validateOfferV02Semantics } from '../validators/offer-v0.2-semantics.mjs';
import { validatePostbackDeclaredGoalContext } from '../validators/postback-v0.2-semantics.mjs';
import { validateTaxonomyConstraintsV02 } from '../validators/taxonomy-v0.2-semantics.mjs';
import {
  createSchemaRegistry,
  deepClone,
  formatAjvErrors,
  githubReposRoot,
  loadCaseDocument,
  readJson,
  resolveFixture,
  schemaRoot,
  workspaceRoot,
} from './protocol-v0.2-vector-helpers.mjs';

const manifestPath = resolve(schemaRoot, 'fixtures/protocol-v0.2-semantic-vectors.json');
const baselineManifestPath = resolve(schemaRoot, 'fixtures/protocol-v0.2-contract-vectors.json');

const OFFER_SCHEMA_ID = 'https://agentoffernetwork.org/schema/offer/v0.2';
const QUERY_SCHEMA_ID = 'https://agentoffernetwork.org/schema/offer-query/v0.2';
const PROVIDER_SCHEMA_ID = 'https://agentoffernetwork.org/schema/offer-provider-request/v0.2';
const PARTNER_POSTBACK_SCHEMA_ID = 'https://agentoffernetwork.org/schema/postback-partner-payload/v0.2';
const AGENT_POSTBACK_SCHEMA_ID = 'https://agentoffernetwork.org/schema/postback-agent-payload/v0.2';

const VALIDATOR_CONFIGS = new Map([
  ['offer', {
    schemaIds: new Set([OFFER_SCHEMA_ID]),
    taxonomyVersionRequired: true,
    validate(document) {
      return validateOfferV02Semantics(document);
    },
  }],
  ['taxonomy_constraints', {
    schemaIds: new Set([QUERY_SCHEMA_ID, PROVIDER_SCHEMA_ID]),
    taxonomyVersionRequired: true,
    validate(document) {
      return validateTaxonomyConstraintsV02(document);
    },
  }],
  ['postback_declared_goal_context', {
    schemaIds: new Set([PARTNER_POSTBACK_SCHEMA_ID, AGENT_POSTBACK_SCHEMA_ID]),
    taxonomyVersionRequired: false,
    validate(document, testCase) {
      return validatePostbackDeclaredGoalContext(
        document,
        Object.hasOwn(testCase, 'context') ? testCase.context : undefined,
      );
    },
  }],
]);

const MIGRATED_CASES = new Map([
  ['offer-duplicate-goal-same-pricing', 'offer.goal-duplicate.same-pricing'],
  ['offer-duplicate-goal-different-pricing', 'offer.goal-duplicate.different-pricing'],
  ['cpa-zero-semantic-rejected', 'cpa.zero.semantic-reject'],
  ['taxonomy-unknown-registry-id', 'taxonomy.registry-membership'],
  ['taxonomy-secondary-same-branch', 'taxonomy.secondary-cross-branch'],
]);

const REQUIRED_POSTBACK_COVERAGE = new Set([
  'postback.event.declared',
  'postback.context.required',
  'postback.context.non-object',
  'postback.context.missing-declared-goal-events',
  'postback.context.events-non-array',
  'postback.context.extra-key',
  'postback.context.empty',
  'postback.context.duplicate',
  'postback.context.event-invalid',
  'postback.event.undeclared',
]);

const CASE_FIELDS = new Set([
  'id',
  'consumer',
  'covers',
  'validator',
  'schema_id',
  'taxonomy_version',
  'fixture',
  'fixture_pointer',
  'mutations',
  'payload',
  'context',
  'expected',
]);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function assertNoUnknownFields(value, allowedFields, label) {
  assert(isPlainObject(value), `${label} must be an object`);
  for (const field of Object.keys(value)) {
    assert(allowedFields.has(field), `${label} has unknown field: ${field}`);
  }
}

function validateMutation(mutation, caseId) {
  assertNoUnknownFields(mutation, new Set(['op', 'path', 'value']), `mutation for ${caseId}`);
  assert(['set', 'delete', 'append'].includes(mutation.op), `unknown mutation op: ${caseId}`);
  assert.equal(typeof mutation.path, 'string', `mutation path must be a string: ${caseId}`);
  assert.match(mutation.path, /^\//, `mutation path must not target the root: ${caseId}`);
  if (mutation.op === 'delete') {
    assert(!Object.hasOwn(mutation, 'value'), `delete mutation must not include value: ${caseId}`);
  } else {
    assert(Object.hasOwn(mutation, 'value'), `mutation value is required: ${caseId}`);
  }
}

function validatePayloadSource(testCase) {
  const hasPayload = Object.hasOwn(testCase, 'payload');
  const hasFixture = Object.hasOwn(testCase, 'fixture');
  assert.notEqual(hasPayload, hasFixture, `case must define exactly one payload source: ${testCase.id}`);

  if (hasPayload) {
    assert(isPlainObject(testCase.payload), `inline payload must be an object: ${testCase.id}`);
    assert(!Object.hasOwn(testCase, 'fixture_pointer'), `inline payload forbids fixture_pointer: ${testCase.id}`);
    assert(!Object.hasOwn(testCase, 'mutations'), `inline payload forbids mutations: ${testCase.id}`);
    return;
  }

  assert.equal(typeof testCase.fixture, 'string', `fixture must be a string: ${testCase.id}`);
  assert.notEqual(testCase.fixture.trim(), '', `fixture must not be empty: ${testCase.id}`);
  resolveFixture(testCase.fixture);
  if (Object.hasOwn(testCase, 'fixture_pointer')) {
    assert.equal(typeof testCase.fixture_pointer, 'string', `fixture_pointer must be a string: ${testCase.id}`);
    assert(
      testCase.fixture_pointer === '' || testCase.fixture_pointer.startsWith('/'),
      `fixture_pointer must be an RFC 6901 pointer: ${testCase.id}`,
    );
  }
  if (Object.hasOwn(testCase, 'mutations')) {
    assert(Array.isArray(testCase.mutations) && testCase.mutations.length > 0, `mutations must be non-empty: ${testCase.id}`);
    testCase.mutations.forEach((mutation) => validateMutation(mutation, testCase.id));
  }
}

function validateExpected(expected, caseId) {
  assertNoUnknownFields(expected, new Set(['layer', 'result', 'rule']), `expected for ${caseId}`);
  assert.equal(expected.layer, 'semantic', `expected.layer must be semantic: ${caseId}`);
  assert(['accept', 'reject'].includes(expected.result), `unknown expected.result: ${caseId}`);
  if (expected.result === 'accept') {
    assert(!Object.hasOwn(expected, 'rule'), `accepted case must not include rule: ${caseId}`);
  } else {
    assert.equal(typeof expected.rule, 'string', `rejected case must define rule: ${caseId}`);
    assert.notEqual(expected.rule.trim(), '', `rejected rule must not be empty: ${caseId}`);
  }
}

function validateSemanticManifest(manifest) {
  assertNoUnknownFields(manifest, new Set(['manifest_version', 'protocol_version', 'cases']), 'semantic manifest');
  assert.equal(manifest.manifest_version, '1');
  assert.equal(manifest.protocol_version, '0.2');
  assert(Array.isArray(manifest.cases) && manifest.cases.length > 0, 'semantic manifest must contain cases');

  const caseIds = new Set();
  const coverage = new Set();
  for (const testCase of manifest.cases) {
    assertNoUnknownFields(testCase, CASE_FIELDS, `semantic case`);
    assert.equal(typeof testCase.id, 'string', 'semantic case id is required');
    assert.notEqual(testCase.id.trim(), '', 'semantic case id must not be empty');
    assert(!caseIds.has(testCase.id), `duplicate semantic case id: ${testCase.id}`);
    caseIds.add(testCase.id);
    assert.equal(testCase.consumer, 'BL-035', `semantic case consumer must be BL-035: ${testCase.id}`);
    assert(Array.isArray(testCase.covers) && testCase.covers.length > 0, `covers[] is required: ${testCase.id}`);
    const caseCoverage = new Set();
    for (const key of testCase.covers) {
      assert.equal(typeof key, 'string', `coverage key must be a string: ${testCase.id}`);
      assert.notEqual(key.trim(), '', `coverage key must not be empty: ${testCase.id}`);
      assert(!caseCoverage.has(key), `duplicate coverage in case: ${testCase.id}.${key}`);
      assert(!coverage.has(key), `duplicate semantic coverage key: ${key}`);
      caseCoverage.add(key);
      coverage.add(key);
    }

    assert.equal(typeof testCase.validator, 'string', `validator is required: ${testCase.id}`);
    const config = VALIDATOR_CONFIGS.get(testCase.validator);
    assert(config, `unknown semantic validator: ${testCase.id}`);
    assert(config.schemaIds.has(testCase.schema_id), `incompatible schema_id for validator: ${testCase.id}`);
    if (config.taxonomyVersionRequired) {
      assert.equal(testCase.taxonomy_version, 'aon-taxonomy-v1', `taxonomy_version is required: ${testCase.id}`);
    } else {
      assert(!Object.hasOwn(testCase, 'taxonomy_version'), `taxonomy_version is forbidden: ${testCase.id}`);
    }

    validatePayloadSource(testCase);
    assert(Object.hasOwn(testCase, 'expected'), `expected is required: ${testCase.id}`);
    validateExpected(testCase.expected, testCase.id);

    if (testCase.validator !== 'postback_declared_goal_context') {
      assert(!Object.hasOwn(testCase, 'context'), `context is only valid for postback vectors: ${testCase.id}`);
      continue;
    }
    const expectsContextRequired = testCase.expected.result === 'reject'
      && testCase.expected.rule === 'context_required';
    if (expectsContextRequired) {
      assert(!Object.hasOwn(testCase, 'context'), `context_required vector must omit context: ${testCase.id}`);
    } else {
      assert(Object.hasOwn(testCase, 'context'), `postback vector must supply raw context: ${testCase.id}`);
    }
  }

  for (const key of REQUIRED_POSTBACK_COVERAGE) {
    assert(coverage.has(key), `required postback semantic coverage is missing: ${key}`);
  }
}

function loadSemanticDocument(testCase) {
  if (Object.hasOwn(testCase, 'payload')) return deepClone(testCase.payload);
  return loadCaseDocument(testCase);
}

function casesById(manifest, ids) {
  const cases = ids.map((id) => manifest.cases.find((testCase) => testCase.id === id));
  for (let index = 0; index < cases.length; index += 1) {
    assert(cases[index], `required semantic case is missing: ${ids[index]}`);
  }
  return cases;
}

export function testOfferGoalIdentityAndDisplayPattern(manifest) {
  const cases = casesById(manifest, [
    'offer-duplicate-goal-same-pricing',
    'offer-duplicate-goal-different-pricing',
    'offer-custom-goal-accepted',
    'offer-display-pattern-token-rejected',
  ]);
  assert.deepEqual(
    cases.map((testCase) => testCase.expected.result),
    ['reject', 'reject', 'accept', 'reject'],
  );
  assert.deepEqual(
    cases.filter((testCase) => testCase.expected.result === 'reject').map(
      (testCase) => testCase.expected.rule,
    ),
    ['event_unique', 'event_unique', 'display_pattern_token'],
  );
}

export function testPricingBoundaryOwnership(manifest) {
  const cases = casesById(manifest, [
    'cpa-zero-semantic-rejected',
    'offer-cpa-currency-zzz-accepted',
    'offer-cps-zero-accepted',
    'offer-cps-zero-precision-accepted',
    'offer-cps-fractional-upper-boundary-accepted',
    'offer-cps-whole-upper-boundary-accepted',
    'offer-cps-upper-boundaries-accepted',
  ]);
  assert.equal(cases[0].expected.rule, 'amount_positive');
  for (const testCase of cases.slice(1)) {
    assert.equal(testCase.expected.result, 'accept', `${testCase.id} must remain semantically accepted`);
  }
}

export function testOfferTaxonomyMembershipAndRelationships(manifest) {
  const cases = casesById(manifest, [
    'taxonomy-unknown-registry-id',
    'taxonomy-secondary-same-branch',
    'offer-taxonomy-secondary-equals-primary-rejected',
    'offer-taxonomy-secondary-descendant-rejected',
    'offer-taxonomy-sibling-accepted',
  ]);
  assert.equal(cases[0].expected.rule, 'taxonomy_registry_membership');
  for (const testCase of cases.slice(1, 4)) {
    assert.equal(testCase.expected.rule, 'taxonomy_branch_conflict');
  }
  assert.equal(cases[4].expected.result, 'accept');
}

export function testQueryAndProviderTaxonomyMembership(manifest) {
  const cases = casesById(manifest, [
    'query-taxonomy-registry-known',
    'query-taxonomy-registry-unknown',
    'provider-taxonomy-registry-known',
    'provider-taxonomy-registry-unknown',
  ]);
  assert.deepEqual(
    cases.map((testCase) => testCase.expected.result),
    ['accept', 'reject', 'accept', 'reject'],
  );
  assert.equal(cases[1].expected.rule, 'taxonomy_registry_membership');
  assert.equal(cases[3].expected.rule, 'taxonomy_registry_membership');
}

export function testPostbackDeclaredGoalContext(manifest) {
  const coverage = new Set(
    manifest.cases
      .filter((testCase) => testCase.validator === 'postback_declared_goal_context')
      .flatMap((testCase) => testCase.covers),
  );
  assert.deepEqual(coverage, REQUIRED_POSTBACK_COVERAGE);
}

function testMigrationOwnership(manifest) {
  const baseline = readJson(baselineManifestPath);
  const baselineIds = new Set(baseline.cases.map((testCase) => testCase.id));
  const allIds = new Set(baselineIds);

  for (const testCase of manifest.cases) {
    assert(!allIds.has(testCase.id), `vector id must be globally unique: ${testCase.id}`);
    allIds.add(testCase.id);
  }

  for (const [id, coverageKey] of MIGRATED_CASES) {
    const semanticCase = manifest.cases.find((testCase) => testCase.id === id);
    assert(semanticCase, `migrated semantic case is missing: ${id}`);
    assert.deepEqual(semanticCase.covers, [coverageKey], `migrated coverage drift: ${id}`);
    assert(!baselineIds.has(id), `migrated case must not remain in S1: ${id}`);
    assert(
      !baseline.cases.some((testCase) => testCase.covers.includes(coverageKey)),
      `migrated coverage must not remain in S1: ${coverageKey}`,
    );
  }

  const downstreamPostback = baseline.cases.find(
    (testCase) => testCase.id === 'postback-event-name-undeclared',
  );
  assert(downstreamPostback, 'BL-039 postback downstream contract is missing from S1');
  assert.equal(downstreamPostback.enforcement, 'downstream-contract');
  assert.equal(downstreamPostback.consumer, 'BL-039');
}

function testManifestFailClosedCanaries(manifest) {
  const unknownField = deepClone(manifest);
  unknownField.cases[0].unexpected = true;
  assert.throws(() => validateSemanticManifest(unknownField), /unknown field/);

  const duplicateCoverage = deepClone(manifest);
  duplicateCoverage.cases[1].covers = [...duplicateCoverage.cases[0].covers];
  assert.throws(() => validateSemanticManifest(duplicateCoverage), /duplicate semantic coverage key/);

  const duplicateSource = deepClone(manifest);
  duplicateSource.cases[0].payload = {};
  assert.throws(() => validateSemanticManifest(duplicateSource), /exactly one payload source/);

  const missingContext = deepClone(manifest);
  delete missingContext.cases.find((testCase) => testCase.id === 'postback-event-declared').context;
  assert.throws(() => validateSemanticManifest(missingContext), /must supply raw context/);

  const duplicateGlobalId = deepClone(manifest);
  duplicateGlobalId.cases.find(
    (testCase) => testCase.id === 'offer-custom-goal-accepted',
  ).id = readJson(baselineManifestPath).cases[0].id;
  assert.throws(() => testMigrationOwnership(duplicateGlobalId), /globally unique/);
}

export function testSemanticVectorFormatAndDispatch(manifest, registry) {
  validateSemanticManifest(manifest);
  testManifestFailClosedCanaries(manifest);

  for (const testCase of manifest.cases) {
    const schemaValidator = registry.ajv.getSchema(testCase.schema_id);
    assert(schemaValidator, `schema is not registered: ${testCase.id}`);
    const document = loadSemanticDocument(testCase);
    assert.equal(
      schemaValidator(document),
      true,
      `${testCase.id}: semantic vector payload must pass schema; ${formatAjvErrors(schemaValidator.errors)}`,
    );

    const result = VALIDATOR_CONFIGS.get(testCase.validator).validate(document, testCase);
    const expectedValid = testCase.expected.result === 'accept';
    assert.equal(result.valid, expectedValid, `${testCase.id}: semantic accept/reject mismatch`);
    if (expectedValid) {
      assert.deepEqual(result.errors, [], `${testCase.id}: accepted vector must have no semantic errors`);
    } else {
      assert.deepEqual(
        result.errors.map((error) => error.code),
        [testCase.expected.rule],
        `${testCase.id}: semantic rule mismatch`,
      );
    }
  }
}

export function testBaselineAndSemanticSelectorOwnership(manifest) {
  testMigrationOwnership(manifest);
}

export function testDocumentationLayerBoundaries() {
  const schemaReadme = readFileSync(resolve(githubReposRoot, 'schema/README.md'), 'utf8');
  const validatorsReadme = readFileSync(resolve(githubReposRoot, 'schema/validators/README.md'), 'utf8');
  for (const [path, text] of [
    ['schema/README.md', schemaReadme],
    ['schema/validators/README.md', validatorsReadme],
  ]) {
    for (const layer of ['structural', 'semantic', 'runtime']) {
      assert(text.toLowerCase().includes(layer), `${path} must describe the ${layer} layer`);
    }
  }

  const governance = readJson(resolve(workspaceRoot, 'protocol/docs/contract-governance/contracts.json'));
  const v02 = governance.contracts.find((contract) => contract.version === 'public-v0.2');
  assert(v02, 'public-v0.2 governance contract is missing');
  assert(
    v02.downstream_follow_graph.some((edge) => edge.runtime_support === 'not_available'),
    'semantic validation must not imply runtime support',
  );
}

export function runSemanticVectors() {
  const manifest = readJson(manifestPath);
  const registry = createSchemaRegistry();
  testOfferGoalIdentityAndDisplayPattern(manifest);
  testPricingBoundaryOwnership(manifest);
  testOfferTaxonomyMembershipAndRelationships(manifest);
  testQueryAndProviderTaxonomyMembership(manifest);
  testPostbackDeclaredGoalContext(manifest);
  testSemanticVectorFormatAndDispatch(manifest, registry);
  testBaselineAndSemanticSelectorOwnership(manifest);
  testDocumentationLayerBoundaries();
  console.log(`protocol v0.2 semantic vectors OK (${manifest.cases.length} cases)`);
}

runSemanticVectors();
