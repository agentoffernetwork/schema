<p align="center">
  <h1 align="center">AgentOffer Schema</h1>
  <p align="center">
    Machine-readable contracts for <a href="https://github.com/agentoffernetwork/protocol">AgentOffer Protocol</a>.
    <br />
    JSON Schema + TypeScript types + validators.
  </p>
</p>

<p align="center">
  <a href="https://www.apache.org/licenses/LICENSE-2.0"><img src="https://img.shields.io/badge/license-Apache--2.0-blue.svg" alt="License" /></a>
  <a href="#status"><img src="https://img.shields.io/badge/version-v0.1-orange.svg" alt="Version" /></a>
  <a href="#status"><img src="https://img.shields.io/badge/status-Draft-yellow.svg" alt="Status" /></a>
  <a href="https://github.com/agentoffernetwork/schema/issues"><img src="https://img.shields.io/github/issues/agentoffernetwork/schema.svg" alt="Issues" /></a>
  <a href="https://github.com/agentoffernetwork/schema/actions/workflows/validate.yml"><img src="https://github.com/agentoffernetwork/schema/actions/workflows/validate.yml/badge.svg" alt="Validate" /></a>
</p>

---

## What's Inside

| Path | Description |
|------|-------------|
| `json-schema/offer-schema-v0.1.json` | Offer object JSON Schema with RFC 2119 requirement levels |
| `json-schema/offer-query-schema-v0.1.json` | Query request schema for `POST /v1/offers/query` |
| `json-schema/taxonomy-v1.schema.json` | Source tree schema for AON Taxonomy v1 |
| `taxonomy/aon-taxonomy-v1.json` | AON Taxonomy v1 source tree (`name + children`) |
| `taxonomy/v0.1-to-taxonomy-v1.json` | Legacy v0.1 category migration mapping |
| `types/offer.types.ts` | TypeScript type definitions for Offer, Query, and Response |
| `types/category-attributes.types.ts` | AON Taxonomy v1 category id and registry types |
| `validators/` | Reserved for future packaged validation tooling; current validation examples use `ajv-cli` directly |

## Quick Start

If you are new to AON, start with the guided docs first:

| Need | Link |
|------|------|
| Understand mock mode and the first working request | [Docs Quick Start](https://docs.agentoffernetwork.com/quickstart) |
| Read field-level platform API tables | [AON API Reference](https://docs.agentoffernetwork.com/api) |
| Understand the human-readable protocol semantics | [Protocol source](https://github.com/agentoffernetwork/protocol) |

Use this repository when you need to validate payloads or reference TypeScript contract types.

### Validate a Query API request

Use this when you are building the body for `POST /v1/offers/query`.

```bash
npx --yes --package=ajv-cli@5 --package=ajv-formats@3 -- \
  ajv validate \
  -s json-schema/offer-query-schema-v0.1.json \
  -d your-query-request.json \
  --spec=draft2020
```

Start from the minimal request in the
[Query API spec](https://github.com/agentoffernetwork/protocol/blob/main/specs/query-api.md)
or the examples repository, then validate the payload your integration will actually send.

### Validate an offer with JSON Schema

```bash
npx --yes --package=ajv-cli@5 --package=ajv-formats@3 -- \
  ajv validate \
  -s json-schema/offer-schema-v0.1.json \
  -d ../examples/http/notion-offer.json \
  --spec=draft2020
```

### Use TypeScript types

```typescript
import type { Offer, OfferQueryRequest, OfferResponse } from './types/offer.types';

const offer: Offer = {
  offer_id: '019414a0-7e3b-7f1a-b5e2-0a1b2c3d4e5f',
  offer_instance_id: '019dd208-27d2-7673-b16f-6897fa120303',
  version: '1.0',
  offer_info: {
    title: 'My SaaS Product',
    offer_type: 'online_service',
    category: {
      id: 'computers_electronics.computers.software',
    },
    description: 'A great tool for teams',
  },
  entity: { id: 'entity-001', name: 'Acme Inc' },
  action: {
    type: 'web_redirect',
    payload: { target: 'https://example.com/offer' },
  },
  bid: { model: 'cpa', amount: '10.00', currency: 'USD' },
};
```

## Core Offer Shape

**REQUIRED fields:**

- `offer_id` -- stable inventory-level offer identifier
- `offer_instance_id` -- per-dispatch offer instance identifier
- `version` -- schema version
- `offer_info` -- title, offer_type, category id, description
- `entity` -- provider id and name
- `action` -- type and payload.target
- `bid` -- payout model, amount, and currency

**RECOMMENDED fields:**

- `material[]` -- creative assets (images, videos)
- `offer_info.commercial` -- pricing and terms
- `conversion_rule` -- attribution windows and accepted conversion types

**OPTIONAL fields:**

- `targeting`, `frequency_capping`, `tags`, `priority`, `status`

## Query API Validation Path

| Step | Use | File |
|------|-----|------|
| 1 | Read the human-readable API contract | [`protocol/specs/query-api.md`](https://github.com/agentoffernetwork/protocol/blob/main/specs/query-api.md) |
| 2 | Validate a request body | [`json-schema/offer-query-schema-v0.1.json`](json-schema/offer-query-schema-v0.1.json) |
| 3 | Inspect a canonical request payload | [`examples/http/offer-query-request.json`](https://github.com/agentoffernetwork/examples/blob/main/http/offer-query-request.json) |
| 4 | Understand returned `offers[]` objects | [`json-schema/offer-schema-v0.1.json`](json-schema/offer-schema-v0.1.json) |
| 5 | Inspect a canonical response payload | [`examples/http/offer-response.json`](https://github.com/agentoffernetwork/examples/blob/main/http/offer-response.json) |

The query request schema validates the request body. The offer schema validates each object inside `offers[]`.

## Common Validation Failures

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Missing required property `context` | Request body omitted the context object | Send `context` with at least `user_profile` |
| Missing required property `intent` | Request body omitted the user intent object | Send `intent.content[]` with at least one item |
| `intent.content[]` fails validation | Missing content item `type` or unsupported content type | Use `input_text` or `input_image` |
| Category id fails validation | Category id is malformed or not part of the current registry | Use a lowercase AON Taxonomy v1 id from the protocol taxonomy; schema pattern checks are not a substitute for registry validation |
| Stale identifier appears in offer payload | Payload still uses `uuid`, `original_offer_id`, or `source_offer_id` | Use `offer_id` and `offer_instance_id` |
| Response metadata mismatch | Payload still expects `query_id`, `trace_id`, `aon_trace_id`, `has_more`, or `total` in the canonical Query API JSON response | Use `request_id` and `offers[]`; use the hosted API `X-AON-TRACE-ID` response header for diagnostics |

## Category IDs

The current canonical category surface is defined by the human-readable
[Category Taxonomy](https://github.com/agentoffernetwork/protocol/blob/main/specs/category-taxonomy.md)
document in the `protocol` repository.

This repo follows that taxonomy boundary:

- current public machine-readable category values are AON Taxonomy v1 ids such as `travel_tourism`, `finance.credit_lending`, and `others`
- aliases and legacy v0.1 `category.type + attributes.sub_type` values are migration concerns, not public request fields
- JSON Schema enforces id shape; use the taxonomy guard or generated SDK validators for registry membership checks

## Field Requirement Levels

Following [RFC 2119](https://datatracker.ietf.org/doc/html/rfc2119):

| Level | Meaning |
|-------|---------|
| **REQUIRED** | MUST be present with a valid, non-empty value |
| **RECOMMENDED** | SHOULD be present; value MAY be empty or null |
| **OPTIONAL** | MAY be omitted entirely |

## Source of Truth

These artifacts are the machine-readable companion to the human-readable [protocol specification](https://github.com/agentoffernetwork/protocol).

| Need | Go to |
|------|-------|
| Human-readable spec | [`agentoffernetwork/protocol`](https://github.com/agentoffernetwork/protocol) |
| Category registry | [`specs/category-taxonomy.md`](https://github.com/agentoffernetwork/protocol/blob/main/specs/category-taxonomy.md) |
| Example payloads | [`agentoffernetwork/examples`](https://github.com/agentoffernetwork/examples) |
| Change proposals | [`agentoffernetwork/rfcs`](https://github.com/agentoffernetwork/rfcs) |

Use the protocol repo for semantics, this schema repo for validation, and the examples repo for payloads you can inspect or adapt.

## Status

- **Version:** `v0.1`
- **Status:** `Draft`
- **Release posture:** `Public beta for machine-readable contract artifacts`
- **Scope note:** This repo currently ships canonical JSON Schema and TypeScript types. Packaged validator tooling is planned follow-up work, not part of the current v0.1 deliverable.

## Contributing

- **Tooling/validation improvements** -- open a PR directly
- **Schema field changes** -- open an [RFC](https://github.com/agentoffernetwork/rfcs) when affecting the protocol contract

See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## License

Licensed under [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0).
