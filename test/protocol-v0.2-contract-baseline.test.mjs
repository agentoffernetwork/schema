import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  createSchemaRegistry,
  deepClone,
  formatAjvErrors,
  githubReposRoot,
  loadCaseDocument,
  readJson,
  resolveFixture,
  schemaRoot,
  testMutationEngine,
  workspaceRoot,
} from './protocol-v0.2-vector-helpers.mjs';
const manifestPath = resolve(schemaRoot, 'fixtures/protocol-v0.2-contract-vectors.json');

const REQUIRED_COVERAGE_KEYS = new Set([
  'version.header.omitted',
  'version.header.v02',
  'version.header.v01-compatibility',
  'version.header.unknown-reject',
  'version.response-echo',
  'version.http-shell-v1',
  'required.absent',
  'required.null',
  'optional.omitted',
  'optional.present-null',
  'unknown.top-level',
  'unknown.nested',
  'offer.valid',
  'offer.goals.empty',
  'offer.goal.pricing-missing',
  'offer.commercial-price.complete',
  'offer.bid.forbidden',
  'offer.accepted-types.forbidden',
  'offer.goal-slug.min',
  'offer.goal-slug.max',
  'offer.goal-slug.invalid',
  'query.minimal',
  'query.full',
  'query.viewer-context.missing',
  'query.viewer-language.invalid-reachable',
  'query.legacy-country.forbidden',
  'query.intent.empty',
  'query.intent.text.valid',
  'query.intent.text.invalid',
  'query.intent.image.valid',
  'query.intent.image.invalid',
  'query.pagination.limit-1',
  'query.pagination.limit-100',
  'query.pagination.limit-0',
  'query.pagination.limit-101',
  'query.response.empty-offers',
  'query.response.nonempty-offers',
  'query.response.protocol-root',
  'query.response.hosted-data',
  'query.response.hosted-wrapper-rejected',
  'provider.request.shared-core',
  'provider.request-id.required',
  'provider.response.success-root',
  'provider.response.error-root',
  'provider.response.wrapper-rejected',
  'postback.partner.event-name',
  'postback.agent.event-name',
  'postback.event-name.missing',
  'postback.event-name.null',
  'postback.event-name.invalid',
  'postback.event-name.undeclared',
  'postback.conversion-type.forbidden',
  'postback.bid-amount.forbidden',
  'cps.valid.0',
  'cps.valid.0.0000',
  'cps.valid.99.9999',
  'cps.valid.100',
  'cps.valid.100.0000',
  'cps.invalid.negative',
  'cps.invalid.over-100',
  'cps.invalid.scale-5',
  'cps.invalid.leading-zero',
  'cps.invalid.number',
  'cps.invalid.currency',
  'cps.invalid.amount',
  'cps.mapping.fraction-to-percent',
  'taxonomy.query-subtree',
  'targeting.unrestricted.absent',
  'targeting.unrestricted.empty-array',
  'targeting.unrestricted.empty-rule',
  'targeting.unrestricted.empty-dimensions',
  'targeting.geo.structured-only',
  'targeting.geo.unknown-fail-closed',
  'targeting.age.unknown-lenient',
  'targeting.language.unknown-lenient',
  'targeting.device.unknown-lenient',
  'targeting.os.unknown-lenient',
  'targeting.os.linux-forbidden',
  'targeting.rule-or',
  'targeting.dimension-and',
  'targeting.exclude-first',
  'navigation.v02-primary',
  'navigation.governance-current',
  'navigation.runtime-boundary',
]);

const REQUIRED_FOLLOW_UP_CONTRACTS = new Map([
  ['version-header-omitted', {
    surface: 'version',
    enforcement: 'downstream-contract',
    expected: {
      selected_version: '0.1',
    },
    spec_ref: 'protocol/specs/query-api.md#protocol-version',
    consumer: 'BL-034',
    covers: ['version.header.omitted', 'version.http-shell-v1'],
  }],
  ['version-header-v02', {
    surface: 'version',
    enforcement: 'downstream-contract',
    expected: {
      selected_version: '0.2',
      response_header: 'AON-Protocol-Version: 0.2',
    },
    spec_ref: 'protocol/specs/query-api.md#protocol-version',
    consumer: 'BL-034',
    covers: ['version.header.v02', 'version.response-echo'],
  }],
  ['version-header-v01-compatibility', {
    surface: 'version',
    enforcement: 'downstream-contract',
    expected: {
      selected_version: '0.1',
    },
    spec_ref: 'protocol/specs/query-api.md#protocol-version',
    consumer: 'BL-034',
    covers: ['version.header.v01-compatibility'],
  }],
  ['version-header-unknown-rejected', {
    surface: 'version',
    enforcement: 'downstream-contract',
    expected: 'fail_closed',
    spec_ref: 'protocol/specs/query-api.md#protocol-version',
    consumer: 'BL-034',
    covers: ['version.header.unknown-reject'],
  }],
  ['postback-event-name-undeclared', {
    surface: 'postback',
    enforcement: 'downstream-contract',
    schema_id: 'https://agentoffernetwork.org/schema/postback-partner-payload/v0.2',
    fixture: 'examples/http/postback/partner/basic-conversion-v0.2.json',
    mutations: [{
      op: 'set',
      path: '/event_name',
      value: 'undeclared_custom_goal',
    }],
    expected: 'reject',
    spec_ref: 'protocol/specs/postback.md#goal-identity',
    consumer: 'BL-039',
    covers: ['postback.event-name.undeclared'],
  }],
  ['cps-fraction-to-percent', {
    surface: 'cps',
    enforcement: 'downstream-contract',
    expected: { internal_fraction: '0.2', public_rate: '20' },
    spec_ref: 'protocol/specs/offer-schema-v0.2.md#boundary-conversion',
    consumer: 'BL-034',
    covers: ['cps.mapping.fraction-to-percent'],
  }],
  ['taxonomy-query-subtree', {
    surface: 'taxonomy',
    enforcement: 'downstream-contract',
    expected: {
      operator: 'OR',
      match: 'exact-or-descendant',
      against: ['primary', 'secondaries'],
    },
    spec_ref: 'protocol/specs/query-api.md#taxonomy-constraints',
    consumer: 'BL-034',
    covers: ['taxonomy.query-subtree'],
  }],
  ['targeting-composition-and-unknowns', {
    surface: 'targeting',
    enforcement: 'downstream-contract',
    expected: {
      inter_rule: 'OR',
      intra_rule: 'AND across active dimensions',
      exclude: 'wins',
      active_geo_unknown: 'reject',
      missing_age_language_device_os: 'pass',
    },
    spec_ref: 'protocol/specs/offer-schema-v0.2.md#targeting-truth-table',
    consumer: 'BL-034',
    covers: [
      'targeting.geo.unknown-fail-closed',
      'targeting.age.unknown-lenient',
      'targeting.language.unknown-lenient',
      'targeting.device.unknown-lenient',
      'targeting.os.unknown-lenient',
      'targeting.rule-or',
      'targeting.dimension-and',
      'targeting.exclude-first',
    ],
  }],
  ['navigation-v02-current', {
    surface: 'navigation',
    enforcement: 'downstream-contract',
    expected: {
      normative: 'public-v0.2',
      runtime_support: 'not_available',
    },
    spec_ref: 'protocol/docs/contract-governance/contracts.json#offers.query-public-v0.2',
    consumer: 'BL-038',
    covers: [
      'navigation.v02-primary',
      'navigation.governance-current',
      'navigation.runtime-boundary',
    ],
  }],
]);

const NON_STRUCTURAL_COVERAGE_KEYS = new Set(
  [...REQUIRED_FOLLOW_UP_CONTRACTS.values()].flatMap((contract) => contract.covers),
);

const CANONICAL_FIXTURE_CONTRACTS = [
  {
    id: 'offer-query-minimal',
    schema_id: 'https://agentoffernetwork.org/schema/offer-query/v0.2',
    fixture: 'examples/http/offer-query-request-v0.2-minimal.json',
  },
  {
    id: 'offer-query-full',
    schema_id: 'https://agentoffernetwork.org/schema/offer-query/v0.2',
    fixture: 'examples/http/offer-query-request-v0.2-full.json',
  },
  {
    id: 'offer-query-response',
    schema_id: 'https://agentoffernetwork.org/schema/offer-query-response/v0.2',
    fixture: 'examples/http/offer-response-v0.2.json',
  },
  {
    id: 'offer-provider-basic',
    schema_id: 'https://agentoffernetwork.org/schema/offer-provider-request/v0.2',
    fixture: 'examples/http/offer-provider/basic-query-v0.2.json',
  },
  {
    id: 'offer-provider-full',
    schema_id: 'https://agentoffernetwork.org/schema/offer-provider-request/v0.2',
    fixture: 'examples/http/offer-provider/full-query-v0.2.json',
  },
  {
    id: 'offer-provider-success',
    schema_id: 'https://agentoffernetwork.org/schema/offer-provider-response/v0.2',
    fixture: 'examples/http/offer-provider/success-v0.2.json',
  },
  {
    id: 'offer-provider-error',
    schema_id: 'https://agentoffernetwork.org/schema/offer-provider-response/v0.2',
    fixture: 'examples/http/offer-provider/error-bad-request-v0.2.json',
  },
  {
    id: 'postback-partner',
    schema_id: 'https://agentoffernetwork.org/schema/postback-partner-payload/v0.2',
    fixture: 'examples/http/postback/partner/basic-conversion-v0.2.json',
  },
  {
    id: 'postback-agent',
    schema_id: 'https://agentoffernetwork.org/schema/postback-agent-payload/v0.2',
    fixture: 'examples/http/postback/agent/basic-conversion.json',
  },
];

function validateManifest(manifest) {
  assert.equal(manifest.manifest_version, '1');
  assert.equal(manifest.protocol_version, '0.2');
  assert(Array.isArray(manifest.cases) && manifest.cases.length > 0, 'manifest must contain cases');

  const caseIds = new Set();
  const covered = new Set();
  const structurallyCovered = new Set();
  const validEnforcements = new Set(['structural', 'downstream-contract']);

  for (const testCase of manifest.cases) {
    assert.equal(typeof testCase.id, 'string', 'case id is required');
    assert(!caseIds.has(testCase.id), `duplicate case id: ${testCase.id}`);
    caseIds.add(testCase.id);
    assert.equal(typeof testCase.surface, 'string', `surface is required: ${testCase.id}`);
    assert(validEnforcements.has(testCase.enforcement), `unknown enforcement: ${testCase.id}`);
    assert.equal(typeof testCase.spec_ref, 'string', `spec_ref is required: ${testCase.id}`);
    const relativeSpecPath = testCase.spec_ref.split('#', 1)[0];
    const resolvedSpecPath = relativeSpecPath.startsWith('protocol/docs/')
      ? resolve(workspaceRoot, relativeSpecPath)
      : resolve(githubReposRoot, relativeSpecPath);
    assert(existsSync(resolvedSpecPath), `spec_ref target does not exist: ${testCase.spec_ref}`);
    assert(Array.isArray(testCase.covers) && testCase.covers.length > 0, `covers[] is required: ${testCase.id}`);
    for (const key of testCase.covers) {
      covered.add(key);
      if (testCase.enforcement === 'structural') structurallyCovered.add(key);
    }

    if (testCase.enforcement === 'structural') {
      assert.equal(typeof testCase.schema_id, 'string', `schema_id is required: ${testCase.id}`);
      assert.equal(typeof testCase.fixture, 'string', `fixture is required: ${testCase.id}`);
      assert(['valid', 'reject'].includes(testCase.expected), `structural expected must be valid/reject: ${testCase.id}`);
    } else {
      assert.equal(typeof testCase.consumer, 'string', `consumer is required: ${testCase.id}`);
      assert(testCase.expected !== undefined, `expected is required: ${testCase.id}`);
    }
  }

  const missingCoverage = [...REQUIRED_COVERAGE_KEYS].filter((key) => !covered.has(key));
  assert.deepEqual(missingCoverage, [], `missing required coverage keys: ${missingCoverage.join(', ')}`);

  const missingStructuralCoverage = [...REQUIRED_COVERAGE_KEYS].filter(
    (key) => !NON_STRUCTURAL_COVERAGE_KEYS.has(key) && !structurallyCovered.has(key),
  );
  assert.deepEqual(
    missingStructuralCoverage,
    [],
    `required structural coverage is not structurally enforced: ${missingStructuralCoverage.join(', ')}`,
  );

  for (const [id, requiredContract] of REQUIRED_FOLLOW_UP_CONTRACTS) {
    const actual = manifest.cases.find((testCase) => testCase.id === id);
    assert(actual, `required follow-up case is missing: ${id}`);
    for (const [field, expected] of Object.entries(requiredContract)) {
      assert.deepEqual(
        actual[field],
        expected,
        `required follow-up contract drift: ${id}.${field}`,
      );
    }
  }
}

function executeManifestCases(manifest, registry, { surfaceFilter } = {}) {
  const counts = {
    structural: 0,
    'semantic-follow-up': 0,
    'downstream-contract': 0,
  };

  for (const testCase of manifest.cases) {
    if (surfaceFilter && testCase.surface !== surfaceFilter) continue;
    counts[testCase.enforcement] += 1;

    if (testCase.enforcement === 'structural') {
      const validator = registry.ajv.getSchema(testCase.schema_id);
      assert(validator, `schema is not registered for ${testCase.id}: ${testCase.schema_id}`);
      const valid = validator(loadCaseDocument(testCase));
      const expectedValid = testCase.expected === 'valid';
      assert.equal(
        valid,
        expectedValid,
        `${testCase.id}: expected ${testCase.expected}; ${formatAjvErrors(validator.errors)}`,
      );
      continue;
    }

    if (testCase.fixture && testCase.schema_id) {
      const validator = registry.ajv.getSchema(testCase.schema_id);
      assert(validator, `follow-up schema is not registered: ${testCase.id}`);
      const structurallyValid = validator(loadCaseDocument(testCase));
      assert.equal(
        structurallyValid,
        true,
        `${testCase.id}: follow-up payload must be structurally valid; ${formatAjvErrors(validator.errors)}`,
      );
    }
  }

  return counts;
}

function testReferenceTopology(registry) {
  const providerRequest = registry.schemasById.get(
    'https://agentoffernetwork.org/schema/offer-provider-request/v0.2',
  );
  assert.deepEqual(providerRequest.allOf[0], {
    $ref: 'https://agentoffernetwork.org/schema/offer-query/v0.2',
  });
  assert.deepEqual(providerRequest.allOf[1], {
    type: 'object',
    required: ['request_id'],
  });
  assert(!Object.hasOwn(providerRequest, 'properties'), 'Provider request must not duplicate Query properties');

  const queryResponse = registry.schemasById.get(
    'https://agentoffernetwork.org/schema/offer-query-response/v0.2',
  );
  assert.equal(
    queryResponse.properties.offers.items.$ref,
    'https://agentoffernetwork.org/schema/offer/v0.2',
  );

  const providerResponse = registry.schemasById.get(
    'https://agentoffernetwork.org/schema/offer-provider-response/v0.2',
  );
  assert.equal(
    providerResponse.oneOf[0].$ref,
    'https://agentoffernetwork.org/schema/offer-query-response/v0.2',
  );

  const offer = registry.schemasById.get('https://agentoffernetwork.org/schema/offer/v0.2');
  const partnerPostback = registry.schemasById.get(
    'https://agentoffernetwork.org/schema/postback-partner-payload/v0.2',
  );
  const agentPostback = registry.schemasById.get(
    'https://agentoffernetwork.org/schema/postback-agent-payload/v0.2',
  );
  const goalEventRef = 'https://agentoffernetwork.org/schema/goal-event-name/v0.2';
  assert.equal(offer.properties.goals.items.properties.event.$ref, goalEventRef);
  assert.equal(partnerPostback.properties.event_name.$ref, goalEventRef);
  assert.equal(agentPostback.properties.event_name.$ref, goalEventRef);
}

function testCanonicalFixtures(registry) {
  for (const contract of CANONICAL_FIXTURE_CONTRACTS) {
    const validator = registry.ajv.getSchema(contract.schema_id);
    assert(validator, `canonical fixture schema is not registered: ${contract.id}`);
    const valid = validator(readJson(resolveFixture(contract.fixture)));
    assert.equal(
      valid,
      true,
      `${contract.id}: canonical fixture must be independently valid; ${formatAjvErrors(validator.errors)}`,
    );
  }
}

function testManifestFailClosedCanaries(manifest) {
  const expectedDrift = deepClone(manifest);
  expectedDrift.cases.find((testCase) => testCase.id === 'version-header-omitted').expected = {
    selected_version: '0.1',
    response_header: 'AON-Protocol-Version: 0.1',
  };
  assert.throws(
    () => validateManifest(expectedDrift),
    /required follow-up contract drift/,
    'downstream expected-value reversal must fail manifest validation',
  );

  const enforcementDemotion = deepClone(manifest);
  const bidCase = enforcementDemotion.cases.find(
    (testCase) => testCase.id === 'offer-bid-forbidden',
  );
  bidCase.enforcement = 'semantic-follow-up';
  bidCase.consumer = 'BL-035';
  delete bidCase.schema_id;
  delete bidCase.fixture;
  delete bidCase.fixture_pointer;
  delete bidCase.mutations;
  assert.throws(
    () => validateManifest(enforcementDemotion),
    /unknown enforcement/,
    'S1 semantic enforcement must fail manifest validation',
  );

  const missingFollowUp = deepClone(manifest);
  missingFollowUp.cases = missingFollowUp.cases.filter(
    (testCase) => testCase.id !== 'postback-event-name-undeclared',
  );
  assert.throws(
    () => validateManifest(missingFollowUp),
    /missing required coverage keys|required follow-up case is missing/,
    'required downstream follow-up removal must fail manifest validation',
  );
}

function assertIncludes(path, requiredTexts) {
  const text = readFileSync(path, 'utf8');
  for (const requiredText of requiredTexts) {
    assert(text.includes(requiredText), `${path} must include: ${requiredText}`);
  }
}

function assertExcludes(path, forbiddenTexts) {
  const text = readFileSync(path, 'utf8');
  for (const forbiddenText of forbiddenTexts) {
    assert(!text.includes(forbiddenText), `${path} must not include active stale rule: ${forbiddenText}`);
  }
}

function testPublicNavigation() {
  const protocolReadme = resolve(githubReposRoot, 'protocol/README.md');
  const schemaReadme = resolve(githubReposRoot, 'schema/README.md');
  const examplesReadme = resolve(githubReposRoot, 'examples/README.md');
  const querySpec = resolve(githubReposRoot, 'protocol/specs/query-api.md');
  const providerSpec = resolve(githubReposRoot, 'protocol/specs/offer-provider-api.md');
  const offerV02Spec = resolve(githubReposRoot, 'protocol/specs/offer-schema-v0.2.md');
  const historicalOfferSpec = resolve(githubReposRoot, 'protocol/specs/offer-schema.md');
  const eventsSpec = resolve(githubReposRoot, 'protocol/specs/events.md');
  const contractGovernanceSpec = resolve(githubReposRoot, 'protocol/specs/contract-governance.md');
  const formalRfc = resolve(
    githubReposRoot,
    'rfcs/rfcs/RFC-0002-conversion-goals-v0-2-formal.md',
  );
  const protocolChangelog = resolve(githubReposRoot, 'protocol/CHANGELOG.md');
  const schemaChangelog = resolve(githubReposRoot, 'schema/CHANGELOG.md');
  const examplesChangelog = resolve(githubReposRoot, 'examples/CHANGELOG.md');
  const governanceReadme = resolve(workspaceRoot, 'protocol/docs/contract-governance/README.md');
  const releaseChecklist = resolve(workspaceRoot, 'protocol/docs/contract-governance/release-checklist.md');

  assertIncludes(protocolReadme, [
    'Current normative contract: Protocol v0.3',
    'Protocol v0.2 remains an explicit compatibility path',
  ]);
  assertIncludes(schemaReadme, [
    'Current normative contract: Protocol v0.3',
    'not change the stable v0.2 files',
  ]);
  assertIncludes(examplesReadme, ['Current normative contract: Protocol v0.2']);
  assertIncludes(querySpec, [
    'AON-Protocol-Version: 0.2',
    'BL-034 delivers the hosted Query boundary',
    'public lifecycle promotion remains governed by BL-038',
  ]);
  assertIncludes(providerSpec, [
    'offer-provider-request-v0.2.json',
    'offer-provider-response-v0.2.json',
  ]);
  assertIncludes(offerV02Spec, [
    'CPA `amount` is a strictly positive decimal string',
    'When `offer_info.commercial.price` is present',
  ]);
  assertIncludes(historicalOfferSpec, [
    'Historical snapshot: Protocol v0.1 — not current integration guidance.',
    'The current normative contract is',
    'Omitted or explicit `0.2`',
  ]);
  assertIncludes(formalRfc, [
    'Omitted or explicit `0.2` selects the v0.2 contract',
    'Explicit `0.1` and unknown versions fail closed',
    'legacy top-level `bid`',
  ]);
  assertIncludes(eventsSpec, [
    'Canonical conversion identity: `event_name`.',
    'Forbidden legacy conversion fields: `bid_amount`, `conversion_type`.',
    'This event specification is an explanatory projection.',
  ]);
  assertIncludes(contractGovernanceSpec, [
    'for example `0.2`; omission also selects v0.2',
    '`offers[].goals[].event`',
  ]);
  for (const path of [protocolChangelog, schemaChangelog, examplesChangelog]) {
    assertIncludes(path, [
      'Protocol v0.2 canonical contract baseline (2026-07-27)',
      'Historical v0.1 development log (formerly Unreleased)',
    ]);
  }
  assertExcludes(formalRfc, [
    'Omitted or explicit `0.1` resolves to v0.1',
    'Explicit `0.2` is unsupported',
  ]);
  assertExcludes(eventsSpec, [
    '| `bid_amount` | number | Yes |',
    '| `conversion_type` | string | Yes |',
    'This event specification owns the normalized',
  ]);
  assertExcludes(historicalOfferSpec, [
    'v0.1 remains the active compatibility contract',
    'an omitted header resolves to v0.1',
  ]);
  assertIncludes(governanceReadme, ['Current normative contract: `offers.query/public-v0.2`']);
  assertIncludes(releaseChecklist, ['BL-033 v0.2 artifact baseline']);

  const governance = readJson(resolve(workspaceRoot, 'protocol/docs/contract-governance/contracts.json'));
  const queryV01 = governance.contracts.find(
    (contract) => contract.contract_id === 'offers.query' && contract.version === 'public-v0.1',
  );
  const queryV02 = governance.contracts.find(
    (contract) => contract.contract_id === 'offers.query' && contract.version === 'public-v0.2',
  );
  assert.equal(queryV01.status, 'compatibility');
  assert.equal(queryV02.status, 'active');
  assert.equal(queryV02.runtime_support, 'not_available');

  const relatedPaths = new Set(queryV02.related_sources.map((source) => source.path));
  for (const path of [
    'json-schema/offer-query-schema-v0.2.json',
    'json-schema/offer-query-response-v0.2.json',
    'json-schema/offer-provider-request-v0.2.json',
    'json-schema/offer-provider-response-v0.2.json',
    'json-schema/postback-partner-payload-v0.2.json',
    'json-schema/postback-agent-payload-v0.2.json',
    'http/offer-query-request-v0.2-minimal.json',
    'http/offer-query-request-v0.2-full.json',
    'http/offer-response-v0.2.json',
    'http/offer-provider/basic-query-v0.2.json',
    'http/offer-provider/full-query-v0.2.json',
    'http/offer-provider/success-v0.2.json',
    'http/offer-provider/error-bad-request-v0.2.json',
    'http/postback/partner/basic-conversion-v0.2.json',
    'http/postback/agent/basic-conversion.json',
  ]) {
    assert(relatedPaths.has(path), `public-v0.2 governance must register ${path}`);
  }
  for (const source of queryV02.related_sources) {
    const sourcePath = resolve(workspaceRoot, source.repo, source.path);
    assert(existsSync(sourcePath), `active public-v0.2 source does not exist: ${sourcePath}`);
  }

  const requestFieldPaths = new Set(queryV02.request_fields.map((field) => field.path));
  assert.deepEqual(
    requestFieldPaths,
    new Set([
      'request_id',
      'timestamp',
      'test_mode',
      'placement_id',
      'context',
      'intent',
      'constraints',
      'pagination',
    ]),
    'active public-v0.2 governance must expose the complete Query request inventory',
  );
  const canonicalFieldPaths = new Set(queryV02.canonical_fields.map((field) => field.path));
  for (const path of [
    'AON-Protocol-Version',
    'request_id',
    'offers',
    'offers[].offer_id',
    'offers[].offer_instance_id',
    'offers[].goals[].event',
    'partner_postback.event_name',
    'agent_postback.event_name',
  ]) {
    assert(canonicalFieldPaths.has(path), `public-v0.2 governance must inventory ${path}`);
  }

  const followUps = JSON.stringify(queryV02.downstream_follow_graph);
  for (const owner of ['BL-034', 'BL-035', 'BL-036', 'BL-037', 'BL-038', 'BL-039', 'WS-22']) {
    assert(followUps.includes(owner), `public-v0.2 follow graph must include ${owner}`);
  }
}

function testBadStructureCanary(registry) {
  const response = readJson(resolve(githubReposRoot, 'examples/http/offer-response-v0.2.json'));
  const offer = deepClone(response.offers[0]);
  offer.__known_bad_canary = true;
  const validator = registry.ajv.getSchema('https://agentoffernetwork.org/schema/offer/v0.2');
  assert.equal(validator(offer), false, 'known-bad additional-property canary must be rejected');
}

export function runBaseline({ postbackOnly = false } = {}) {
  testMutationEngine();
  const manifest = readJson(manifestPath);
  validateManifest(manifest);
  const registry = createSchemaRegistry();
  const counts = executeManifestCases(
    manifest,
    registry,
    postbackOnly ? { surfaceFilter: 'postback' } : {},
  );

  if (!postbackOnly) {
    assert(counts.structural > 0, 'structural case count must be > 0');
    assert.equal(counts['semantic-follow-up'], 0, 'S1 must not retain semantic follow-up cases');
    assert(counts['downstream-contract'] > 0, 'downstream contract count must be > 0');
    testManifestFailClosedCanaries(manifest);
    testReferenceTopology(registry);
    testCanonicalFixtures(registry);
    testPublicNavigation();
    testBadStructureCanary(registry);
  } else {
    assert(counts.structural > 0, 'postback structural case count must be > 0');
  }

  console.log(
    `protocol v0.2 baseline OK `
      + `(structural=${counts.structural}, `
      + `semantic-follow-up=${counts['semantic-follow-up']}, `
      + `downstream-contract=${counts['downstream-contract']})`,
  );
}

const postbackOnly = process.argv.includes('--postback-only');
try {
  runBaseline({ postbackOnly });
} catch (error) {
  const detail = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(`protocol v0.2 baseline FAILED\n${detail}`);
  process.exitCode = 1;
}
