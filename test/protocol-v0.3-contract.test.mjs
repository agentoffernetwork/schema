import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import Ajv2020 from "ajv/dist/2020.js"
import addFormats from "ajv-formats"
import { validateListingSourceV03, validateOfferQueryResponseV03Semantics, validateOfferQueryV03Semantics, validateQueryHelperPatch } from "../validators/offer-v0.3-semantics.mjs"

const here = dirname(fileURLToPath(import.meta.url))
const schemaRoot = resolve(here, "..")
const readJson = (path) => JSON.parse(readFileSync(resolve(schemaRoot, path), "utf8"))
const schemaFiles = [
  "json-schema/offer-schema-v0.3.json",
  "json-schema/offer-query-schema-v0.3.json",
  "json-schema/offer-query-response-v0.3.json",
  "json-schema/offer-provider-request-v0.3.json",
  "json-schema/offer-provider-response-v0.3.json",
  "json-schema/offer-control-v0.3.json",
]

function createV03Registry() {
  const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false, allowUnionTypes: true })
  addFormats(ajv)
  const schemas = schemaFiles.map(readJson)
  for (const schema of schemas) ajv.addSchema(schema)
  return { ajv, schemas }
}

function assertValid(validator, payload, label) {
  assert.equal(validator(payload), true, `${label}: ${JSON.stringify(validator.errors)}`)
}

function assertInvalid(validator, payload, label) {
  assert.equal(validator(payload), false, `${label} unexpectedly passed`)
}

export function testV03AjvContracts() {
  const { ajv } = createV03Registry()
  const query = ajv.getSchema("https://agentoffernetwork.org/schema/offer-query/v0.3")
  const response = ajv.getSchema("https://agentoffernetwork.org/schema/offer-query-response/v0.3")
  const offer = ajv.getSchema("https://agentoffernetwork.org/schema/offer/v0.3")
  const control = ajv.getSchema("https://agentoffernetwork.org/schema/offer-control/v0.3")
  assert(query && response && offer && control, "v0.3 root schemas must compile and be registered")
  const fixture = readJson("../examples/http/offer-query-v0.3.json")
  assertValid(query, fixture.request, "query example")
  assertValid(response, fixture.response, "response example")
  const queryWithBudget = structuredClone(fixture.request)
  queryWithBudget.intent.signals.budget = { max: 250, currency: "USD" }
  assertValid(query, queryWithBudget, "query budget with currency")
  const queryWithPartialBudget = structuredClone(queryWithBudget)
  delete queryWithPartialBudget.intent.signals.budget.currency
  assertInvalid(query, queryWithPartialBudget, "query budget missing currency")
  const responseWithPartialBudgetPatch = structuredClone(fixture.response)
  delete responseWithPartialBudgetPatch.engagement.refinements[0].query_helper.request_patch.intent.signals.budget.currency
  assertInvalid(response, responseWithPartialBudgetPatch, "query helper budget missing currency")
  assertInvalid(offer, { ...fixture.response.offers[0], listing_source: { ...fixture.response.offers[0].listing_source, url: "https://example.com/listing" } }, "removed listing_source.url")
  assertInvalid(query, { ...fixture.request, context: { user_profile: {} } }, "removed user_profile")
  const { empty_reason: _emptyReason, ...responseWithoutEmptyReason } = fixture.response
  assertInvalid(response, { ...responseWithoutEmptyReason, offers: [] }, "missing empty_reason")
  assertInvalid(response, { ...fixture.response, empty_reason: "no_material" }, "empty_reason with offers")
  const controlExample = readJson("../examples/http/offer-control-v0.3.json")
  assertValid(control, controlExample, "control example")
  assertInvalid(control, { ...controlExample, target: { kind: "category", id: "travel.hotel" } }, "feedback target must be offer")
  assertInvalid(control, { ...controlExample, operation: "watch", feedback: "not_interested" }, "watch cannot carry feedback")
  const { idempotency_key: _idempotencyKey, ...controlWithoutIdempotencyKey } = controlExample
  assertInvalid(control, controlWithoutIdempotencyKey, "control missing idempotency key")
}

export function testV03SchemaInventory() {
  const schemas = [
    "json-schema/offer-schema-v0.3.json",
    "json-schema/offer-query-schema-v0.3.json",
    "json-schema/offer-query-response-v0.3.json",
    "json-schema/offer-provider-request-v0.3.json",
    "json-schema/offer-provider-response-v0.3.json",
    "json-schema/offer-control-v0.3.json",
  ].map(readJson)
  assert.equal(new Set(schemas.map((schema) => schema.$id)).size, schemas.length)
  assert(!JSON.stringify(schemas).includes("decision_factors"))
  assert.equal(schemas[0].properties.listing_source.properties.observed_at.type, "string")
  assert.equal(schemas[1].properties.response_options.properties.thinking_mode.default, true)
  assert.equal(schemas[1].properties.force_offer.default, false)
  assert.equal(schemas[5].required.includes("idempotency_key"), true)
  assert.equal(Object.hasOwn(schemas[5].properties, "availability"), false)
  assert.equal(schemas[5].properties.user_action.const, "explicit")
}

export function testV03FixtureInventory() {
  const vectors = readJson("fixtures/protocol-v0.3-contract-vectors.json")
  assert.equal(vectors.version, "v0.3")
  assert(Array.isArray(vectors.cases) && vectors.cases.length >= 6, "v0.3 contract vectors must cover the adopted surface")
  for (const testCase of vectors.cases) {
    assert.equal(typeof testCase.fixture, "string", `${testCase.id} must identify a fixture`)
    assert(existsSync(resolve(schemaRoot, "..", testCase.fixture)), `${testCase.id} fixture must exist: ${testCase.fixture}`)
  }
  assert(!JSON.stringify(vectors).includes("decision_factors"), "v0.3 vectors must not define decision_factors")
}

export function testV03SemanticRules() {
  assert.equal(validateOfferQueryV03Semantics({ context: {}, intent: { provenance: "user_expressed" }, response_options: { thinking_mode: "off" } }).valid, false)
  assert.equal(validateOfferQueryV03Semantics({ context: {}, intent: { provenance: "user_expressed" } }).valid, true)
  assert.equal(validateOfferQueryV03Semantics({ context: {}, intent: { provenance: "inferred_context" } }).valid, false)
  assert.equal(validateOfferQueryV03Semantics({ context: {}, intent: { provenance: "inferred_context", confidence: 0.8 } }).valid, true)
  assert.equal(validateOfferQueryV03Semantics({ context: {}, intent: { provenance: "user_expressed", origin: [{ kind: "topic", id: "same" }, { kind: "topic", id: "same" }] } }).valid, false)
  assert.equal(validateOfferQueryV03Semantics({ context: {}, intent: { provenance: "inferred_context", confidence: 0.8, origin: [{ kind: "topic", id: "same" }] } }).valid, false)
  assert.equal(validateOfferQueryV03Semantics({ context: {}, intent: { provenance: "user_expressed", signals: { budget: { max: 100 } } } }).valid, false)
  assert.equal(validateOfferQueryV03Semantics({ context: {}, intent: { provenance: "user_expressed", signals: { budget: { max: 100, currency: "usd" } } } }).valid, false)
  assert.equal(validateOfferQueryV03Semantics({ context: {}, intent: { provenance: "user_expressed", signals: { budget: { max: 100, currency: "USD" } } } }).valid, true)
  assert.equal(validateOfferQueryResponseV03Semantics({ offers: [{ match_reason: "x" }] }, { response_options: { thinking_mode: false } }).valid, false)
  assert.equal(validateOfferQueryResponseV03Semantics({ offers: [], empty_reason: "no_material" }).valid, true)
  assert.equal(validateOfferQueryResponseV03Semantics({ offers: [] }).valid, false)
  assert.equal(validateOfferQueryResponseV03Semantics({ offers: [{ id: "x" }], empty_reason: "no_material" }).valid, false)
  assert.equal(validateQueryHelperPatch({ constraints: { features: ["quiet"] } }).valid, true)
  assert.equal(validateQueryHelperPatch({ response_options: { thinking_mode: false } }).valid, false)
  assert.equal(validateQueryHelperPatch({ intent: { signals: { budget: { max: 100 } } } }).valid, false)
  assert.equal(validateQueryHelperPatch({ intent: { signals: { budget: { max: 100, currency: "USD" } } } }).valid, true)
  assert.equal(validateListingSourceV03({ kind: "marketplace", name: "Example Travel", observed_at: "2026-08-13T00:00:00Z" }, { name: "Example Hotels" }, new Date("2026-08-13T00:00:00Z")).valid, true)
  assert.equal(validateListingSourceV03({ kind: "marketplace", name: "Example Travel", observed_at: "2026-08-13T00:00:00+08:00" }, { name: "Example Hotels" }).action, "omit")
  assert.equal(validateListingSourceV03({ kind: "marketplace", name: "Example Travel", observed_at: "2026-08-13T00:00:00Z", url: "https://example.com?affiliate=secret" }, { name: "Example Hotels" }).action, "omit")
}

testV03AjvContracts()
testV03SchemaInventory()
testV03FixtureInventory()
testV03SemanticRules()
console.log("PASS: v0.3 schema inventory and semantic rules")
