import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { validateOfferV02Semantics } from '../validators/offer-v0.2-semantics.mjs';

const root = path.resolve(import.meta.dirname, '..');
const worktree = path.resolve(root, '../../..');
const github = path.resolve(root, '..');
const projectRoot = path.resolve(github, '..');
const base = (p) => p.startsWith('docs/') ? path.join(projectRoot, p) : path.join(github, p);
const read = (p) => fs.readFileSync(base(p), 'utf8');
const exists = (p) => fs.existsSync(base(p));
const json = (p) => JSON.parse(read(p));
const schema = json('schema/json-schema/offer-schema-v0.2.json');
const exampleEnvelope = json('examples/http/offer-response-v0.2.json');
const offer = exampleEnvelope.offers[0];
const ajv = new Ajv2020({ allErrors: true, strict: false, multipleOfPrecision: 10 });
addFormats(ajv);
const validate = ajv.compile(schema);
let assertions = 0;
const ok = (condition, message) => { assertions += 1; assert.equal(condition, true, message); };
const valid = (value) => validate(value) && validateOfferV02Semantics(value).valid;
const clone = (value) => structuredClone(value);

export function test_AC1_formal_artifacts_align_on_complete_v02_offer() {
  for (const p of ['protocol/specs/offer-schema-v0.2.md', 'schema/json-schema/offer-schema-v0.2.json', 'schema/types/offer-v0.2.types.ts', 'examples/http/offer-response-v0.2.json']) ok(exists(p), `missing ${p}`);
  ok(schema.properties.version.const === '2.0', 'Offer version const');
  ok(schema.required.includes('goals') && schema.properties.goals.minItems === 1, 'goals required/minItems');
  ok(!('maxItems' in schema.properties.goals), 'goals has no maxItems');
  ok(valid(offer), 'complete v0.2 example validates');
  ok(read('protocol/specs/offer-schema-v0.2.md').includes('AON-Protocol-Version'), 'spec names protocol header');
}

export function test_AC2_v02_artifact_set_is_zero_bid_and_rejects_removed_fields() {
  const formal = [
    'protocol/specs/offer-schema-v0.2.md', 'schema/json-schema/offer-schema-v0.2.json',
    'schema/types/offer-v0.2.types.ts', 'schema/validators/offer-v0.2-semantics.mjs',
    'examples/http/offer-response-v0.2.json', 'rfcs/rfcs/RFC-0002-conversion-goals-v0-2-formal.md',
    'rfcs/rfcs/RFC-0003-offer-v0-2-card-display-fields.md',
  ];
  for (const p of formal) ok(!new RegExp('\\bbid\\b', 'i').test(read(p)), `removed token in ${p}`);
  for (const bad of ['bid', 'unknown']) { const value = clone(offer); value[bad] = {}; ok(!valid(value), `reject top-level ${bad}`); }
  const removed = clone(offer); removed.conversion_rule.accepted_types = ['sale'];
  ok(!valid(removed), 'reject removed conversion field');
}

export function test_AC2_v02_inherits_v01_surface_and_preserves_extra_extension() {
  ok(Object.keys(schema.properties).includes('offer_info') && Object.keys(schema.properties).includes('entity'), 'stable surface retained');
  const extended = clone(offer); extended.extra.new_partner_key = 'allowed';
  ok(valid(extended), 'extra extension remains open');
  const leaked = clone(extended); leaked.new_partner_key = true;
  ok(!valid(leaked), 'top-level extension rejected');
}

const v01Fixtures = ['adult-entertainment-offer.json','automotive-offer.json','content-offer.json','entertainment-offer.json','fashion-offer.json','financial-service-offer.json','food-grocery-offer.json','health-beauty-offer.json','igaming-offer.json','notion-offer.json','offline-service-offer.json','product-offer.json','short-drama-offer.json','home-garden-offer.json'];
export function test_AC3_v01_positive_fixtures_remain_valid() {
  const oldAjv = new Ajv2020({ allErrors: true, strict: false }); addFormats(oldAjv);
  const oldValidate = oldAjv.compile(json('schema/json-schema/offer-schema-v0.1.json'));
  ok(v01Fixtures.length === 14, 'explicit v0.1 fixture manifest');
  for (const file of v01Fixtures) { const value = json(`examples/http/${file}`); ok(value.version === '1.0', `${file} remains v0.1`); ok(oldValidate(value), `${file} validates against v0.1`); }
}

export function test_AC3_v01_negative_fixtures_remain_rejected() {
  const v01 = json('schema/json-schema/offer-schema-v0.1.json');
  const oldAjv = new Ajv2020({ allErrors: true, strict: false }); addFormats(oldAjv);
  const oldValidate = oldAjv.compile(v01);
  const baseline = json('examples/http/notion-offer.json');
  const missingBid = clone(baseline); delete missingBid.bid;
  const addsGoals = clone(baseline); addsGoals.goals = [{ event: 'sale', pricing: { model: 'cpa', amount: '1', currency: 'USD' } }];
  const unknownTop = clone(baseline); unknownTop.unexpected = true;
  const invalidPricing = clone(baseline); invalidPricing.bid.amount = 0;
  for (const [name, value] of [['missing bid', missingBid], ['goals', addsGoals], ['unknown top-level', unknownTop], ['invalid pricing', invalidPricing]]) ok(!oldValidate(value), `v0.1 rejects ${name}`);
  ok(v01.required.includes('bid') && !v01.properties.goals, 'v0.1 schema unchanged');
}

export function test_AC4_query_protocol_version_matrix_and_resolved_header() {
  const text = read('protocol/specs/query-api.md');
  for (const row of ['| omitted | v0.1 | v0.1 | `AON-Protocol-Version: 0.1` |', '| `0.1` | v0.1 | v0.1 | `AON-Protocol-Version: 0.1` |', '| `0.2` | unsupported | v0.2 | `AON-Protocol-Version: 0.2` |', '| unknown | unsupported | unsupported | none |']) ok(text.includes(row), `query matrix row ${row}`);
  ok(text.includes('without silent fallback'), 'query no downgrade');
  ok(text.includes('/v1/offers/query'), 'query path remains v1');
}

export function test_AC4_offer_provider_matrix_and_v1_payload_policy() {
  const text = read('protocol/specs/offer-provider-api.md');
  for (const row of ['| omitted | any | v0.1 compatibility interpretation |', '| `0.1` | any | v0.1 envelope and offers |', '| `0.2` | not declared | do not dispatch / unsupported |', '| `0.2` | both sides explicitly support | unchanged envelope with all v0.2 offers |', '| unknown | any | unsupported |']) ok(text.includes(row), `provider matrix row ${row}`);
  ok(text.includes('MUST NOT downgrade') && text.includes('header-selectable payload revisions do not require a new path major'), 'provider policy');
  ok(text.includes('/v1/offers/query'), 'provider path remains v1');
}

export function test_AC5_governance_lifecycle_and_release_gate() {
  const manifest = json('docs/contract-governance/contracts.json');
  ok(manifest.schema_version === 'aon-contract-governance/v0.2', 'governance schema version');
  const v02 = manifest.contracts.find((c) => c.contract_id === 'offers.query' && c.version === 'public-v0.2');
  ok(v02?.status === 'active' && v02?.stability === 'stable' && v02?.runtime_support === 'not_available', 'v0.2 lifecycle');
  ok(v02.release_gate.workstream_slice === 'WS-15-S4', 'release gate');
  const draft = manifest.contracts.find((c) => c.contract_id === 'offers.conversion-goals.v0.2-draft');
  ok(draft?.status === 'historical' && draft?.superseded_by?.version === 'public-v0.2', 'draft retirement');
  const pairs = manifest.contracts.map((c) => `${c.contract_id}/${c.version}`);
  ok(new Set(pairs).size === pairs.length, 'contract pairs unique');
  ok(manifest.contracts.some((c) => c.contract_id === draft.superseded_by.contract_id && c.version === draft.superseded_by.version), 'superseded pair resolves');
}

export function test_AC6_rev2_exact_boundary_equivalence_classes() {
  const cases = [
    ['empty goals', { ...clone(offer), goals: [] }, false],
    ['event uppercase', { ...clone(offer), goals: [{ event: 'Sale', pricing: { model: 'cpa', amount: '1', currency: 'USD' } }] }, false],
    ['zero amount', { ...clone(offer), goals: [{ event: 'sale', pricing: { model: 'cpa', amount: '0', currency: 'USD' } }] }, false],
    ['duplicate event', { ...clone(offer), goals: [{ event: 'sale', pricing: { model: 'cpa', amount: '1', currency: 'USD' } }, { event: 'sale', pricing: { model: 'cps', rate: '1' } }] }, false],
    ['null goals', { ...clone(offer), goals: null }, false],
    ['object goals', { ...clone(offer), goals: {} }, false],
    ['null event', { ...clone(offer), goals: [{ event: null, pricing: { model: 'cpa', amount: '1', currency: 'USD' } }] }, false],
    ['zero cps', { ...clone(offer), goals: [{ event: 'sale', pricing: { model: 'cps', rate: '0' } }] }, false],
    ['cps currency mix', { ...clone(offer), goals: [{ event: 'sale', pricing: { model: 'cps', rate: '1', currency: 'USD' } }] }, false],
    ['unknown goal field', { ...clone(offer), goals: [{ event: 'sale', pricing: { model: 'cpa', amount: '1', currency: 'USD' }, unknown: true }] }, false],
  ];
  for (const [name, value, expected] of cases) ok(valid(value) === expected, name);
  const boundary = clone(offer); boundary.goals = [{ event: 'a'.repeat(64), pricing: { model: 'cpa', amount: '1', currency: 'USD' } }];
  ok(valid(boundary), '64-char event passes');
  const maxDesc = clone(offer); maxDesc.goals[0].description = 'x'.repeat(500); ok(valid(maxDesc), '500-char description passes');
  const longDesc = clone(maxDesc); longDesc.goals[0].description += 'x'; ok(!valid(longDesc), '501-char description rejects');
  const many = clone(offer); many.goals = Array.from({ length: 100 }, (_, i) => ({ event: `event${i}`, pricing: { model: 'cpa', amount: '1', currency: 'USD' } })); ok(valid(many), 'goals has no maxItems');
}

export function test_AC9_card_display_fields_validate_and_reject_bad_templates() {
  ok(valid(offer), 'baseline example with card display fields validates');
  ok(offer.offer_info.rating.value === 4.6 && offer.offer_info.commercial.price.unit === 'month', 'example carries rating and price unit');
  const ratingZero = clone(offer); ratingZero.offer_info.rating.value = 0; ok(valid(ratingZero), 'rating 0 passes');
  const ratingFive = clone(offer); ratingFive.offer_info.rating.value = 5; ok(valid(ratingFive), 'rating 5 passes');
  const ratingPrecision = clone(offer); ratingPrecision.offer_info.rating.value = 4.65; ok(!valid(ratingPrecision), 'rating with more than one decimal rejects');
  const unknownUnit = clone(offer); unknownUnit.offer_info.commercial.price.unit = 'hour'; ok(!valid(unknownUnit), 'unknown price unit rejects');
  const missingUnit = clone(offer); delete missingUnit.offer_info.commercial.price.unit; ok(valid(missingUnit), 'missing price unit remains valid');
  const tooManyProperties = clone(offer);
  tooManyProperties.offer_info.properties = Array.from({ length: 7 }, (_, i) => ({ type: `prop_${i}`, value: i }));
  ok(!valid(tooManyProperties), 'properties maxItems 6 rejects');
  const unknownTypeNoPattern = clone(offer);
  unknownTypeNoPattern.offer_info.properties = [{ type: 'partner_specific_flag', value: true }];
  ok(valid(unknownTypeNoPattern), 'unknown property type without display_pattern is valid for round-trip');
  const spacedToken = clone(offer);
  spacedToken.offer_info.properties[0].display_pattern = 'Cashback ${ value }';
  ok(!valid(spacedToken), 'spaced display_pattern token rejects');
  const propertyAccess = clone(offer);
  propertyAccess.offer_info.properties[0].display_pattern = 'Cashback ${value.amount}';
  ok(!valid(propertyAccess), 'property access display_pattern token rejects');
  const unclosed = clone(offer);
  unclosed.offer_info.properties[0].display_pattern = 'Cashback ${value';
  ok(!valid(unclosed), 'unclosed display_pattern token rejects');
  const longAlt = clone(offer);
  longAlt.material[0].alt_text = 'x'.repeat(201);
  ok(!valid(longAlt), 'material alt_text maxLength rejects');
}

export function test_AC7_migration_guidance_and_token_gate() {
  const text = read('protocol/specs/offer-schema-v0.2.md');
  for (const token of ['cpa', 'cps', 'Hybrid', 'goals[].event', 'WS-15-S4']) ok(text.toLowerCase().includes(token.toLowerCase()), `migration ${token}`);
  for (const p of ['protocol/CHANGELOG.md', 'schema/CHANGELOG.md', 'examples/CHANGELOG.md', 'rfcs/CHANGELOG.md']) ok(read(p).includes('Offer v0.2 card display fields'), `changelog ${p}`);
  for (const [file, heading] of [['protocol/README.md', 'Stable v0.2 contract'], ['schema/README.md', 'formal Offer v0.2 contract'], ['examples/README.md', 'Stable v0.2 response']]) { const body = read(file); const start = body.indexOf(heading); const section = body.slice(start, body.indexOf('\n## ', start + heading.length) === -1 ? body.length : body.indexOf('\n## ', start + heading.length)); ok(start >= 0 && section.length > heading.length, `${file} primary section non-empty`); ok(!/\bbid\b/i.test(section), `${file} primary section zero token`); }
  ok(!/\bbid\b/i.test(JSON.stringify(json('docs/contract-governance/contracts.json').contracts.find((c) => c.version === 'public-v0.2'))), 'governance v0.2 zero token');
}

export function test_AC8_downstream_follow_graph_is_lossless() {
  const manifest = json('docs/contract-governance/contracts.json');
  const v02 = manifest.contracts.find((c) => c.version === 'public-v0.2');
  const projects = new Set(v02.downstream_follow_graph.map((x) => x.project));
  for (const project of ['SVC-PLATFORM','SVC-CORE','PTR','ADMIN','DOCS','SDK','AON-ORG']) ok(projects.has(project), `follow ${project}`);
  for (const edge of v02.downstream_follow_graph) ok(Boolean(['not_started','in_progress','follows_public_v0.2'].includes(edge.source_status) && ['not_available','supported'].includes(edge.runtime_support) && ['planned','in_progress','complete'].includes(edge.follow_up_status) && edge.workstream_slice), `${edge.project} statuses`);
  const surfaces = new Set(v02.public_surfaces.map((x) => x.surface_id));
  for (const surface of ['services.openapi','sdk.chatgpt-action-openapi','github.examples']) ok(surfaces.has(surface), `surface ${surface}`);
  for (const surface of v02.public_surfaces) { ok(surface.follows_contract === 'offers.query' && surface.follows_version === 'public-v0.2', `${surface.surface_id} pair`); ok(['not_started','in_progress','follows_public_v0.2'].includes(surface.source_status), `${surface.surface_id} source status`); }
}

const tests = [test_AC1_formal_artifacts_align_on_complete_v02_offer, test_AC2_v02_artifact_set_is_zero_bid_and_rejects_removed_fields, test_AC2_v02_inherits_v01_surface_and_preserves_extra_extension, test_AC3_v01_positive_fixtures_remain_valid, test_AC3_v01_negative_fixtures_remain_rejected, test_AC4_query_protocol_version_matrix_and_resolved_header, test_AC4_offer_provider_matrix_and_v1_payload_policy, test_AC5_governance_lifecycle_and_release_gate, test_AC6_rev2_exact_boundary_equivalence_classes, test_AC9_card_display_fields_validate_and_reject_bad_templates, test_AC7_migration_guidance_and_token_gate, test_AC8_downstream_follow_graph_is_lossless];
for (const test of tests) test();
console.log(`offer-conversion-goals-v0.2 OK (${assertions} assertions)`);
