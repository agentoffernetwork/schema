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
| `types/offer.types.ts` | TypeScript type definitions for Offer, Query, and Response |
| `types/category-attributes.types.ts` | Per-category attribute definitions for all 6 verticals |
| `validators/` | Reserved for future packaged validation tooling; current validation examples use `ajv-cli` directly |

## Quick Start

### Validate an offer with JSON Schema

```bash
# Using ajv-cli
npm install -g ajv-cli
ajv validate -s json-schema/offer-schema-v0.1.json -d your-offer.json --spec=draft2020
```

### Use TypeScript types

```typescript
import type { Offer, QueryRequest, QueryResponse } from './types/offer.types';

const offer: Offer = {
  uuid: 'offer-001',
  version: 1,
  offer_info: {
    title: 'My SaaS Product',
    offer_type: 'online_service',
    category: { type: 'software_saas' },
    description: 'A great tool for teams',
  },
  entity: { id: 'entity-001', name: 'Acme Inc' },
  action: {
    type: 'web_redirect',
    payload: { target: 'https://example.com/offer' },
  },
};
```

## Core Offer Shape

**REQUIRED fields:**

- `uuid` -- unique offer identifier
- `version` -- schema version
- `offer_info` -- title, offer_type, category (type + attributes), description
- `entity` -- provider id and name
- `action` -- type and payload.target

**RECOMMENDED fields:**

- `material[]` -- creative assets (images, videos)
- `category.attributes` -- vertical-specific typed attributes
- `category.commercial` -- pricing and terms

**OPTIONAL fields:**

- `targeting`, `bid`, `conversion_rule`, `frequency_capping`, `tags`, `priority`, `status`

## Category Types

| Type | Sub-Types |
|------|-----------|
| `software_saas` | project_management, design, development_tools, crm, analytics, communication, security, ai_tools |
| `travel_hospitality` | hotel, flight, car_rental, vacation_package, restaurant, attraction |
| `education` | online_course, certification, bootcamp, language_learning, tutoring, academic_program |
| `financial_service` | credit_card, insurance, loan, investment, banking, payment |
| `electronics` | smartphone, laptop, audio, wearable, gaming_hardware, smart_home, camera |
| `entertainment` | game, streaming_video, ai_companion, social_audio, sports_betting, music_audio, live_streaming |

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
| Example payloads | [`agentoffernetwork/examples`](https://github.com/agentoffernetwork/examples) |
| Change proposals | [`agentoffernetwork/rfcs`](https://github.com/agentoffernetwork/rfcs) |

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
