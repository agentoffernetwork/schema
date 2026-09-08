# AgentOffer Schema

Machine-readable schemas, TypeScript projections, validation vectors, and
semantic validators for the public AgentOffer Protocol.

## Current contract

Start with the schema for your role. The `v1.0/` directory carries the release
boundary while current leaf filenames remain stable and unversioned. These
artifacts define structural and semantic contract rules; they do not claim
deployment or runtime availability.

## Start here

- [Offer schema](v1.0/json-schema/offer-schema.json)
- [Query request schema](v1.0/json-schema/offer-query-schema.json)
- [Provider request schema](v1.0/json-schema/offer-provider-request.json)
- [Provider Postback schema](v1.0/json-schema/postback-partner-payload.json)
- [Agent Postback schema](v1.0/json-schema/postback-agent-payload.json)
- [Postback TypeScript types](v1.0/types/postback.types.ts)
- [Postback semantic validator](v1.0/validators/postback-semantics.mjs)
- [Postback signing, retry, and idempotency vectors](v1.0/fixtures/postback-agent-webhook.json)
- [Contract vectors](v1.0/fixtures/protocol-contract-vectors.json)
- [TypeScript Offer projection](v1.0/types/offer.types.ts)
- [Offer semantic validator](v1.0/validators/offer-semantics.mjs)
- [Offer semantic vectors](v1.0/fixtures/protocol-semantic-vectors.json)
- [Supply Offer Profile Registry](v1.0/json-schema/offer-profile-registry.json)
- [Generic Query Offer projection](v1.0/json-schema/offer-query-generic-projection.json)
- [Travel Supply Profile vectors](v1.0/fixtures/travel-offer-profiles.json)
- [AON Taxonomy](v1.0/taxonomy/aon-taxonomy.json)
- [AON Location Registry](v1.0/locations/aon-location-registry.json)

Read the integration guides in the
[protocol repository](https://github.com/agentoffernetwork/protocol).
Canonical payloads are published in the
[examples repository](https://github.com/agentoffernetwork/examples).

## Supply and Query boundaries

The canonical Offer and Partner/Provider supply carriers may include the
optional closed `offer_info.details` registry envelope for `flight` and
`hotel_rate`, plus observed commercial supply facts. Public and Generic Query
Offers may include one optional closed
`offer_info.commercial.display_price` object containing only `amount` and
`currency`; Partner Offers and OfferProvider success Offers reject it. The
Generic Query projection allows that response-scoped presentation field and
continues to reject `details`, `price.tax_status`, and `commercial.quote`.

`display_price` is presentation data for the response that created it. It
requires an original `price`, uses a different currency, preserves the source
price's zero/non-zero class, and never becomes checkout, settlement, or
transaction-authoritative data. Run structural validation before the v1.0
semantic validator; a present invalid object is a contract error, not a signal
to fall back to the original price.

## Provenance

Earlier releases remain available from immutable refs for audit and recovery.
They are not alternate current schema paths.

Licensed under [Apache License 2.0](LICENSE).
