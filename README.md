# AgentOffer Schema

JSON Schema, TypeScript types, semantic-validation inputs, and executable
contract vectors for AgentOffer Protocol.

**Current normative contract: Protocol v0.2**

The v0.2 source package is stable. Hosted runtime support is tracked
independently and is currently `not_available`; these artifacts define what
future implementations must accept and emit without claiming that a service
already does so.

## Canonical v0.2 files

| File | Role |
|---|---|
| `json-schema/goal-event-name-v0.2.json` | Shared Goal/Postback event-name grammar |
| `json-schema/offer-schema-v0.2.json` | Canonical Offer |
| `json-schema/offer-query-schema-v0.2.json` | Shared Query request business core |
| `json-schema/offer-query-response-v0.2.json` | `{request_id, offers[]}` protocol success payload |
| `json-schema/offer-provider-request-v0.2.json` | Shared core plus required `request_id` |
| `json-schema/offer-provider-response-v0.2.json` | Raw Provider success or Provider error |
| `json-schema/postback-partner-payload-v0.2.json` | Partner-to-AON conversion payload |
| `json-schema/postback-agent-payload-v0.2.json` | AON-to-Agent conversion payload |
| `types/offer-v0.2.types.ts` | TypeScript structural projection |
| `fixtures/protocol-v0.2-contract-vectors.json` | Canonical structural and downstream-contract vectors (S1) |
| `fixtures/protocol-v0.2-semantic-vectors.json` | BL-035 semantic vectors, executed after an Ajv schema gate |

JSON Schema is the machine-readable structural source. The human-readable
specification owns normative semantics that cannot be expressed structurally.
TypeScript types and examples project these sources and must not introduce
additional fields.

## Validation layers

- **Structural** validation runs JSON Schema against one payload's shape,
  required fields, closed objects, lexical patterns, and numeric bounds.
- **Semantic** validation runs only after the structural gate and checks
  cross-field Goal identity, CPA positivity, taxonomy registry/branch rules,
  and test-only declared-goal postback context.
- **Runtime** enforcement remains owned by downstream services. These local
  validators do not provide routing, tracking lookup, HMAC, retries,
  idempotency, settlement, or hosted error envelopes; `runtime_support`
  remains `not_available` until those owners deliver it.

## Validate locally

From this directory:

```bash
npm ci --ignore-scripts
npm run test:v0.2-baseline
npm run test:v0.2-semantic
npm test
```

`test:v0.2-baseline` validates S1 structural/downstream contracts. The semantic
runner validates only BL-035-owned vectors and fails closed on incompatible
manifest fields, payload sources, validators, schemas, taxonomy versions, and
postback context rules. `npm test` runs both runners, the taxonomy audit,
TypeScript checks, and the Postback reference suite.

The full gate:

- registers every required v0.2 schema and rejects missing references;
- validates structural cases and semantic-vector payloads with Ajv 2020;
- audits the taxonomy source tree, migration mappings, and example references;
- checks that Provider schemas reuse the Query and Offer definitions;
- compiles the TypeScript contract and negative type assertions;
- verifies Postback payload examples, HMAC vectors, retry, and idempotency;
- fails if required coverage, fixtures, navigation, or the known-bad canary is
  missing.

Semantic rejection is not a runtime result or hosted HTTP response. CPS
fraction-to-percent conversion and targeting evaluation remain downstream
runtime contracts rather than BL-035 semantic rules.

## Important v0.2 rules

- Required properties must be present and non-null unless their schema
  explicitly permits `null`; optional does not imply nullable.
- Closed protocol objects reject unknown fields.
- Offer `goals[]` is non-empty. Every Goal requires `event` and exactly one
  closed pricing branch: CPA amount/currency or CPS percentage rate.
- CPS `rate` is a decimal string in `0..100`, with at most four decimal places.
- Offer `bid`, `conversion_rule.accepted_types`, Postback `conversion_type`,
  and Postback `bid_amount` are not v0.2 fields.
- Offer geo targeting uses only `{location_id}` entries. Offer OS targeting is
  `ios`, `android`, `windows`, or `macos`; `linux` is not a valid Offer value.

## Registry data

AON Taxonomy v1 and AON Location Registry v1 remain shared registries used by
v0.2. Schema patterns validate shape; registry membership and hierarchy are
semantic checks.

## Historical material

Files carrying v0.1 in their names are historical references. They are not
loaded by `test:v0.2-baseline` and are not the current integration path.

Licensed under [Apache License 2.0](LICENSE).
