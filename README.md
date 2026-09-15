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
- [Query response schema](v1.0/json-schema/offer-query-response.json)
- [Query TypeScript projection](v1.0/types/offer-query.types.ts)
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

## Taxonomy definitions and downstream adoption

The definition-first AON Taxonomy v1 expansion preserves all 515 existing ids
and adds 272 definitions for 787 canonical ids. The tree and canonical metadata
define category semantics independently of product admission. Earlier candidate
records remain deferred in their evidence history; that status does not make
the corresponding ids unusable in the expanded definition release.

Generated candidate source outputs are the
[definition manifest](v1.0/taxonomy/aon-taxonomy-definition.json),
[definition crosswalk](v1.0/taxonomy/source-mappings/warehouse-aon-definition.json),
and [comparison table](v1.0/taxonomy/source-mappings/warehouse-aon-definition.md).
These links identify release target paths, not proof of completed public
publication. The ordinary protected protocol release publishes committed
definitions independently of downstream product validation. Pin the matching
immutable release
manifest when consuming the tree, metadata, resolver, and definition mappings.
`definition_status=defined` describes semantic definitions; the definition
digest and source commit bound by the outer protected release establish release
identity. The status itself does not assert publication or runtime support.

Runtime and classifier support, warehouse adaptation, historical backfill, and
product admission belong to a separate downstream Plan. A canonical id does
not certify product classification accuracy or activation eligibility. Preserve
product/platform/service and attribute boundaries, use a broad parent when
Offer evidence cannot support a narrower id, and evaluate primary and secondary
category subtree matching against the same pinned snapshot. See the
[category taxonomy](https://github.com/agentoffernetwork/protocol/blob/main/v1.0/specs/category-taxonomy.md)
for the classification and downstream boundaries.

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

Flight Profile schedules preserve source facts: endpoints use airport-local
`local_at` values in `YYYY-MM-DDTHH:mm:ss` form without offsets, and every
segment requires positive source-provided `duration_minutes`. Producers do not
need an airport-timezone table and must not use an LLM to invent timezone data.

## Query alternative Offers

An optional `alternative_offers` response array carries 1–3 closed
`{basis, selection_reason, offer}` items only when main `offers` is empty and
`empty_reason` is `below_relevance_threshold` or `no_material`. Initial `basis`
is only `regional_popularity`. Omit the array when unavailable; null, an empty
array and coexistence with nonempty main results are invalid.

Every nested Offer reuses the complete Generic projection but prohibits
`match_reason` in both thinking modes. Required `selection_reason` is 1–500
Unicode code points, contains a character outside ECMAScript `\s`, and is
retained with `thinking_mode=false`. Static `recommendation_reason` is not its
substitute. Stable `offer_id` values are unique, regardless of dispatch identity,
reason wording, or equivalent UUID casing.

Run the Query response JSON Schema, then
`validateOfferQueryResponseV10Semantics(response, request)` from the Offer
semantic validator. Paired validation rejects alternatives for `placement_id`
or `test_mode=true`; response-only validation does not certify route eligibility.
Real internal gates, explicit constraints, actual same-country popularity and
truthful explanations remain producer obligations; fixtures are not evidence
of those facts. Hooks continue to reference main Offers only.

Requests, exact selector `1.0`, Offer marker `"3.0"`, and `force_offer` are
unchanged. Old no-extension responses remain valid, but old closed readers may
reject new fields and permissive readers may discard them. Consumer adaptation
must precede producer enablement; protocol assets do not certify service, SDK,
or Agent deployment. See the [Query specification](https://github.com/agentoffernetwork/protocol/blob/main/v1.0/specs/query-api.md#optional-alternative-offers).

## Provenance

Earlier releases remain available from immutable refs for audit and recovery.
They are not alternate current schema paths.

Licensed under [Apache License 2.0](LICENSE).
