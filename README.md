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
- [AON Taxonomy](v1.0/taxonomy/aon-taxonomy.json)
- [AON Location Registry](v1.0/locations/aon-location-registry.json)

Read the integration guides in the
[protocol repository](https://github.com/agentoffernetwork/protocol).
Canonical payloads are published in the
[examples repository](https://github.com/agentoffernetwork/examples).

## Provenance

Earlier releases remain available from immutable refs for audit and recovery.
They are not alternate current schema paths.

Licensed under [Apache License 2.0](LICENSE).
