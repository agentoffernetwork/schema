import rawAssert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const schemaRoot = resolve(here, '..');
const protocolRoot = resolve(schemaRoot, '../protocol');
const examplesRoot = resolve(schemaRoot, '../examples');

const draftSchemaRaw = readFileSync(
  resolve(schemaRoot, 'json-schema/offer-conversion-goals-v0.2-draft.json'),
  'utf8',
);
const draftSchema = JSON.parse(draftSchemaRaw);
const activeOfferSchema = JSON.parse(
  readFileSync(resolve(schemaRoot, 'json-schema/offer-schema-v0.1.json'), 'utf8'),
);
const draftTypes = readFileSync(
  resolve(schemaRoot, 'types/offer-conversion-goals-v0.2-draft.types.ts'),
  'utf8',
);
const draftSpec = readFileSync(
  resolve(protocolRoot, 'specs/conversion-goals-v0.2-draft.md'),
  'utf8',
);
const offerSpec = readFileSync(resolve(protocolRoot, 'specs/offer-schema.md'), 'utf8');
const eventsSpec = readFileSync(resolve(protocolRoot, 'specs/events.md'), 'utf8');
const governanceRoot = resolve(schemaRoot, '../../docs/contract-governance');
const governanceContracts = JSON.parse(
  readFileSync(resolve(governanceRoot, 'contracts.json'), 'utf8'),
);
const governanceReadme = readFileSync(resolve(governanceRoot, 'README.md'), 'utf8');
const releaseChecklist = readFileSync(resolve(governanceRoot, 'release-checklist.md'), 'utf8');
const rfcRoot = resolve(schemaRoot, '../rfcs');
const rfcReadme = readFileSync(resolve(rfcRoot, 'README.md'), 'utf8');
const draftRfc = readFileSync(
  resolve(rfcRoot, 'rfcs/RFC-0001-conversion-goals-v0.2-draft.md'),
  'utf8',
);
const draftExampleRaw = readFileSync(
  resolve(examplesRoot, 'http/offer-conversion-goals-v0.2-draft.json'),
  'utf8',
);
const draftExample = JSON.parse(draftExampleRaw);
const eventRegistry = JSON.parse(
  readFileSync(resolve(schemaRoot, 'conversion-events/aon-conversion-events-v0.2-draft.json'), 'utf8'),
);

// Assertion counter: every assertion routes through this proxy so the suite
// can prove it actually asserted something (guards against a hollowed-out
// rewrite reporting green with zero checks).
let assertCount = 0;
const assert = new Proxy(rawAssert, {
  get(target, prop) {
    const member = target[prop];
    if (typeof member !== 'function') {
      return member;
    }
    return (...args) => {
      assertCount += 1;
      return member.apply(target, args);
    };
  },
});

const goalSchema = draftSchema.properties.goals.items;

// Normative clause grep anchors. Single authority = TECH §Spec 内容计划 item 3;
// these literals must match the spec text verbatim.
const NORMATIVE_ANCHORS = [
  'unique within one offer',
  'replaces the goal',
  'exact decimal-string passthrough',
  'MUST be greater than zero',
  'recognized occurrence',
  'MUST NOT derive billing',
];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function matchesType(type, value) {
  switch (type) {
    case 'object':
      return isObject(value);
    case 'array':
      return Array.isArray(value);
    case 'string':
      return typeof value === 'string';
    default:
      return true;
  }
}

function validateSchema(schema, value, path = '$') {
  const errors = [];

  if (!schema || typeof schema !== 'object') {
    return errors;
  }

  const types = Array.isArray(schema.type) ? schema.type : schema.type ? [schema.type] : [];
  if (types.length > 0 && !types.some((type) => matchesType(type, value))) {
    errors.push(`${path} should match type ${types.join('|')}`);
    return errors;
  }

  if (schema.const !== undefined && value !== schema.const) {
    errors.push(`${path} should equal const ${schema.const}`);
  }

  if (schema.enum && !schema.enum.includes(value)) {
    errors.push(`${path} should be one of ${schema.enum.join(', ')}`);
  }

  if (typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      errors.push(`${path} should have minLength ${schema.minLength}`);
    }
    if (schema.maxLength !== undefined && value.length > schema.maxLength) {
      errors.push(`${path} should have maxLength ${schema.maxLength}`);
    }
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
      errors.push(`${path} should match pattern ${schema.pattern}`);
    }
  }

  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      errors.push(`${path} should have minItems ${schema.minItems}`);
    }
    if (schema.items) {
      value.forEach((item, index) => {
        errors.push(...validateSchema(schema.items, item, `${path}[${index}]`));
      });
    }
  }

  if (isObject(value)) {
    if (schema.required) {
      for (const key of schema.required) {
        if (!(key in value)) {
          errors.push(`${path}.${key} is required`);
        }
      }
    }
    if (schema.properties) {
      for (const [key, propertySchema] of Object.entries(schema.properties)) {
        if (key in value) {
          errors.push(...validateSchema(propertySchema, value[key], `${path}.${key}`));
        }
      }
    }
    if (schema.additionalProperties === false && schema.properties) {
      for (const key of Object.keys(value)) {
        if (!(key in schema.properties)) {
          errors.push(`${path}.${key} is not allowed`);
        }
      }
    }
  }

  if (schema.oneOf) {
    const matches = schema.oneOf.filter((candidate) => validateSchema(candidate, value, path).length === 0);
    if (matches.length !== 1) {
      errors.push(`${path} should match exactly one oneOf branch`);
    }
  }

  return errors;
}

// Draft-level semantics the JSON Schema cannot express:
// - event uniqueness within one offer (exact string comparison)
// - numeric "> 0" for amount/rate (pattern alone admits "0" / "0.000000")
function validateDraftOffer(offer) {
  const errors = validateSchema(draftSchema, offer);
  const seenEvents = new Set();
  for (const [index, goal] of (offer.goals ?? []).entries()) {
    const event = goal?.event;
    if (typeof event === 'string') {
      if (seenEvents.has(event)) {
        errors.push(`$.goals[${index}].event duplicates another goal`);
      }
      seenEvents.add(event);
    }
    const pricing = goal?.pricing ?? {};
    for (const key of ['amount', 'rate']) {
      if (typeof pricing[key] === 'string' && !(Number(pricing[key]) > 0)) {
        errors.push(`$.goals[${index}].pricing.${key} must be greater than zero`);
      }
    }
  }
  return errors;
}

function goalWithPricing(pricing) {
  return { goals: [{ event: 'sale', pricing }] };
}

// T-001 · AC-1
function test_purged_tokens_absent_in_data_artifacts() {
  // Sanity anchors first, so the guard cannot pass vacuously on a wrong file.
  assert.ok(draftSchemaRaw.includes('"goals"'));
  assert.ok(draftTypes.includes('pricing'));
  assert.ok(draftExampleRaw.includes('"event"'));

  const purgedTokens = [
    'goal_id',
    'event_aliases',
    'account_id',
    'registry_key',
    'registry_owner',
    'unit',
    'model_subtype',
    'hybrid',
    'bid',
  ];
  for (const token of purgedTokens) {
    const pattern = new RegExp(`\\b${token}\\b`);
    assert.doesNotMatch(draftSchemaRaw, pattern, `schema must not contain ${token}`);
    assert.doesNotMatch(draftTypes, pattern, `types must not contain ${token}`);
    assert.doesNotMatch(draftExampleRaw, pattern, `example must not contain ${token}`);
  }
}

// T-002 · AC-2
function test_event_syntax_pattern_and_bounds() {
  const eventSchema = goalSchema.properties.event;
  assert.equal(eventSchema.type, 'string');
  assert.equal(eventSchema.pattern, '^[a-z0-9][a-z0-9_.-]{0,63}$');
  assert.equal(eventSchema.enum, undefined);
  assert.equal(eventSchema.oneOf, undefined);

  const eventPattern = new RegExp(eventSchema.pattern);
  assert.equal(eventPattern.test(''), false);
  assert.equal(eventPattern.test('a'.repeat(64)), true);
  assert.equal(eventPattern.test('a'.repeat(65)), false);
  assert.equal(eventPattern.test('Sale'), false);
  assert.equal(eventPattern.test('first deposit'), false);
  assert.equal(eventPattern.test('_lead'), false);
  assert.equal(eventPattern.test('install'), true);
  assert.equal(eventPattern.test('first_deposit'), true);
  assert.equal(eventPattern.test('x.y-z'), true);

  const badEvent = clone(draftExample);
  badEvent.goals[0].event = 'Sale';
  assert.notDeepEqual(validateDraftOffer(badEvent), []);

  assert.ok(draftSpec.includes(NORMATIVE_ANCHORS[0]), 'spec must state event uniqueness');
  assert.ok(draftSpec.includes(NORMATIVE_ANCHORS[1]), 'spec must state replace-on-change');
}

// T-003 · AC-2 / AC-5
function test_duplicate_event_rejected() {
  const duplicate = clone(draftExample);
  duplicate.goals[1].event = duplicate.goals[0].event;
  const errors = validateDraftOffer(duplicate);
  assert.notDeepEqual(errors, []);
  assert.ok(errors.some((error) => error.includes('duplicates another goal')));
}

// T-004 · AC-3 / AC-5
function test_pricing_discriminated_union_and_positive_values() {
  const pricingSchema = goalSchema.properties.pricing;
  assert.equal(pricingSchema.oneOf.length, 2);
  assert.equal(pricingSchema.oneOf[0].properties.model.const, 'cpa');
  assert.equal(pricingSchema.oneOf[1].properties.model.const, 'cps');
  assert.equal(pricingSchema.oneOf[0].additionalProperties, false);
  assert.equal(pricingSchema.oneOf[1].additionalProperties, false);
  assert.deepEqual(pricingSchema.oneOf[0].required, ['model', 'amount', 'currency']);
  assert.deepEqual(pricingSchema.oneOf[1].required, ['model', 'rate']);

  const pass = [
    { model: 'cpa', amount: '2.50', currency: 'USD' },
    { model: 'cpa', amount: '50', currency: 'USD' },
    { model: 'cps', rate: '8.5' },
    { model: 'cps', rate: '100' },
    { model: 'cps', rate: '0.5' },
  ];
  for (const pricing of pass) {
    assert.deepEqual(validateDraftOffer(goalWithPricing(pricing)), [], JSON.stringify(pricing));
  }

  const reject = [
    { model: 'cpa', amount: '0', currency: 'USD' },
    { model: 'cpa', amount: '0.000000', currency: 'USD' },
    { model: 'cpa', amount: '2.1234567', currency: 'USD' },
    { model: 'cpa', amount: '2.50' },
    { model: 'cpa', amount: '2.50', currency: 'usd' },
    { model: 'cps', rate: '0' },
    { model: 'cps', rate: '0.0000' },
    { model: 'cps', rate: '100.0001' },
    { model: 'cps', rate: '101' },
    { model: 'cps', rate: '8.5', currency: 'USD' },
    { model: 'cps', rate: '8.5', amount: '8.5' },
    { model: 'cps', amount: '8.5', currency: 'USD' },
    { model: 'wrong', amount: '2.50', currency: 'USD' },
    { model: 'cpa', amount: '2.50', currency: 'USD', extra: true },
  ];
  for (const pricing of reject) {
    assert.notDeepEqual(validateDraftOffer(goalWithPricing(pricing)), [], JSON.stringify(pricing));
  }
}

// T-005 · AC-4
function test_top_level_compat_removed_and_boundary_retained() {
  assert.deepEqual(draftSchema.required, ['goals']);
  assert.deepEqual(Object.keys(draftSchema.properties), ['goals']);

  // v0.1 GA surface untouched.
  assert.equal(activeOfferSchema.required.includes('bid'), true);
  assert.equal(Object.hasOwn(activeOfferSchema.properties, 'goals'), false);
  assert.match(offerSpec, /conversion-goals-v0\.2-draft\.md/);

  // v0.1 events/postback boundary retained in the draft spec.
  assert.match(eventsSpec, /`conversion_type`/);
  assert.match(eventsSpec, /`bid_amount`/);
  assert.doesNotMatch(eventsSpec, /goal_id/);
  assert.match(draftSpec, /does not add per-goal event fields/i);
  assert.match(draftSpec, /v0\.1 events\/postback remain flat compatibility/i);
  assert.match(draftSpec, /WS-15-S6/);

  // Migration guidance survives only as a non-normative appendix.
  assert.match(draftSpec, /Migration from v0\.1/i);
  assert.match(draftSpec, /non-normative/i);
}

// T-006 · AC-5
function test_example_validates_and_suite_self_check() {
  assert.deepEqual(validateDraftOffer(draftExample), []);
  assert.equal(draftExample.goals.length >= 2, true);
  const events = draftExample.goals.map((goal) => goal.event);
  assert.equal(new Set(events).size, events.length);

  const singleGoal = clone(draftExample);
  singleGoal.goals = [singleGoal.goals[0]];
  assert.deepEqual(validateDraftOffer(singleGoal), []);

  // Canary: a known-bad payload MUST be rejected. If the validator ever gets
  // hollowed out, this test fails before anything else reports green.
  const canary = { goals: [] };
  assert.notDeepEqual(validateDraftOffer(canary), []);
  const mislabel = goalWithPricing({ model: 'cps', amount: '8.5', currency: 'USD' });
  assert.notDeepEqual(validateDraftOffer(mislabel), []);
}

// T-007 · AC-6
function test_well_known_events_non_normative() {
  assert.equal(eventRegistry.status, 'non-normative');
  assert.match(eventRegistry.description, /non-normative/i);
  assert.match(eventRegistry.description, /not required for validation/i);

  const codes = eventRegistry.well_known_events.map((event) => event.code);
  for (const code of ['install', 'sale', 'lead', 'subscription', 'trial']) {
    assert.equal(codes.includes(code), true, `${code} missing from well-known events`);
  }
  for (const event of eventRegistry.well_known_events) {
    assert.equal(typeof event.code, 'string');
    assert.equal(typeof event.display_label, 'string');
    assert.equal(typeof event.description, 'string');
    assert.equal('default_model_subtype' in event, false);
  }

  assert.match(draftSpec, /Well-known event names/i);
  assert.ok(draftSpec.includes('not required for validation'));
}

// T-008 · AC-7
function test_normative_clause_anchors() {
  for (const anchor of NORMATIVE_ANCHORS) {
    assert.ok(draftSpec.includes(anchor), `spec missing normative anchor: ${anchor}`);
  }
}

// T-009 · AC-8
function test_contract_governance_and_rfc_alignment() {
  const contract = governanceContracts.contracts.find(
    (candidate) => candidate.contract_id === 'offers.conversion-goals.v0.2-draft',
  );
  assert.ok(contract, 'conversion goals draft contract must be registered');
  assert.equal(contract.status, 'historical');
  assert.equal(contract.version, 'v0.2-draft');
  assert.equal(contract.source_ref.path, 'specs/conversion-goals-v0.2-draft.md');

  const canonicalPaths = contract.canonical_fields.map((field) => field.path);
  assert.deepEqual(canonicalPaths, ['goals', 'goals[].event', 'goals[].pricing']);
  const canonicalDescriptions = JSON.stringify(contract.canonical_fields);
  assert.doesNotMatch(canonicalDescriptions, /custom event object/i);
  assert.doesNotMatch(canonicalDescriptions, /BidModel/);

  assert.deepEqual(contract.deprecated_fields, []);

  assert.equal(contract.open_questions.length, 1);
  assert.match(contract.open_questions[0], /WS-15-S6/);
  assert.doesNotMatch(JSON.stringify(contract.open_questions), /hybrid|custom event registry/i);

  const registrySource = contract.related_sources.find(
    (source) => source.path === 'conversion-events/aon-conversion-events-v0.2-draft.json',
  );
  assert.ok(registrySource, 'well-known events data source must stay registered');
  assert.equal(registrySource.role, 'well-known-events-non-normative');

  const followGraph = JSON.stringify(contract.downstream_follow_graph);
  for (const token of [
    'SVC-PLATFORM',
    'WS-15-S4',
    'SVC-CORE',
    'WS-15-S6',
    'PTR',
    'WS-15-S5',
    'ADMIN',
    'WS-15-S7',
    'DOCS',
    'SDK',
    'AON-ORG',
  ]) {
    assert.match(followGraph, new RegExp(token));
  }

  assert.match(governanceReadme, /offers\.conversion-goals\.v0\.2-draft/);
  assert.match(releaseChecklist, /Conversion Goals v0\.2 Draft|v0\.2 formal gate/);
  assert.match(releaseChecklist, /non-GA/i);
  assert.match(rfcReadme, /RFC-0001-conversion-goals-v0\.2-draft\.md/);
  assert.match(draftRfc, /Status\*\*: `(?:draft|historical \/ superseded by RFC-0002)`/);
  assert.match(draftRfc, /non-GA/i);
  assert.match(draftRfc, /Open Questions/i);
  assert.doesNotMatch(draftRfc, /cpa, cps, or hybrid/);
  assert.match(draftRfc, /`cpa` or `cps`/);
  assert.doesNotMatch(draftRfc, /goal_id|event_aliases/);
}

test_purged_tokens_absent_in_data_artifacts();
test_event_syntax_pattern_and_bounds();
test_duplicate_event_rejected();
test_pricing_discriminated_union_and_positive_values();
test_top_level_compat_removed_and_boundary_retained();
test_example_validates_and_suite_self_check();
test_well_known_events_non_normative();
test_normative_clause_anchors();
test_contract_governance_and_rfc_alignment();

rawAssert.ok(assertCount > 0, 'suite must execute a non-zero number of assertions');
console.log(`offer-conversion-goals-draft OK (${assertCount} assertions)`);
