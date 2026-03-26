# AgentOffer Schema

Machine-readable contracts for AgentOffer Protocol, including JSON Schema, type definitions, and validation tooling.

## What Is Included

- `json-schema/offer-schema-v0.1.json` — Offer object schema with RFC 2119 requirement levels
- `json-schema/offer-query-schema-v0.1.json` — Query request schema for `POST /v1/offers/query`
- `types/offer.types.ts` — TypeScript type definitions for Offer, Query, and Response
- `types/category-attributes.types.ts` — Per-type attribute definitions for each category vertical
- `validators/` — reserved for schema validation tooling

## Field Requirement Levels

The schema uses three requirement levels as defined in [RFC 2119](https://datatracker.ietf.org/doc/html/rfc2119):

| Level | Label | Meaning |
|-------|-------|---------|
| **REQUIRED** | Required | Field MUST be present with a valid, non-empty value. |
| **RECOMMENDED** | Recommended | Field SHOULD be present and follow the standard structure; value MAY be empty or null. |
| **OPTIONAL** | Optional | Field MAY be omitted entirely. |

## Core Offer Shape

- `uuid` (REQUIRED)
- `version` (REQUIRED)
- `offer_info` (REQUIRED): `title`, `offer_type`, `category` (type + attributes + commercial), `description`
- `entity` (REQUIRED): `id`, `name`
- `action` (REQUIRED): `type`, `payload.target`
- `material` (RECOMMENDED): array of creative assets
- `targeting`, `commission`, `conversion_rule`, `frequency_capping`, `tags` (OPTIONAL)

## Category Types

Six registered industry verticals. `entertainment` uses `attributes.sub_type` for finer classification.

| type | sub_type |
|------|----------|
| `software_saas` | — |
| `travel_hospitality` | — |
| `education` | — |
| `financial_service` | — |
| `electronics` | — |
| `entertainment` | `game`, `streaming_video`, `ai_companion`, `social_audio`, `sports_betting`, `music_audio`, `live_streaming` |

See `types/category-attributes.types.ts` for per-type attribute definitions.

## Query Request Shape

- `request_id`, `timestamp`, `context`, `intent` (REQUIRED)
- `context.platform`, `session_id`, `user_profile` fields, `pagination` (RECOMMENDED)
- `test_mode`, `conversation_id` (OPTIONAL)

## Source Of Truth

These artifacts are the machine-readable companion to the human-readable protocol repository.

- Protocol docs live in `agentoffernetwork/protocol`
- Example payloads live in `agentoffernetwork/examples`

## Status

- Version: `v0.1`
- Status: `Draft`

## Contributing

- Tooling or validation improvements can be proposed directly in this repository
- Schema field additions, removals, or semantic changes should start with an RFC when they affect the protocol contract
