# AgentOffer Schema

Machine-readable schemas, TypeScript projections, validation vectors, and
semantic validators for the public AgentOffer Protocol.

## Current contract

Start with the schema for your role. The `v0.3/` directory carries the release
boundary while current leaf filenames remain stable and unversioned. These
artifacts define structural and semantic contract rules; they do not claim
deployment or runtime availability.

## Start here

- [Offer schema](v0.3/json-schema/offer-schema.json)
- [Query request schema](v0.3/json-schema/offer-query-schema.json)
- [Provider request schema](v0.3/json-schema/offer-provider-request.json)
- [Provider Postback schema](v0.3/json-schema/postback-partner-payload.json)
- [Agent Postback schema](v0.3/json-schema/postback-agent-payload.json)
- [Postback TypeScript types](v0.3/types/postback.types.ts)
- [Postback semantic validator](v0.3/validators/postback-semantics.mjs)
- [Postback signing, retry, and idempotency vectors](v0.3/fixtures/postback-agent-webhook.json)
- [Contract vectors](v0.3/fixtures/protocol-contract-vectors.json)
- [TypeScript Offer projection](v0.3/types/offer.types.ts)
- [AON Taxonomy](v0.3/taxonomy/aon-taxonomy.json)
- [AON Location Registry](v0.3/locations/aon-location-registry.json)

Read the integration guides in the
[protocol repository](https://github.com/agentoffernetwork/protocol).
Canonical payloads are published in the
[examples repository](https://github.com/agentoffernetwork/examples).

## Historical contracts

Historical v0.1 and v0.2 material is retained outside `main` on
`legacy/v0.1` and `legacy/v0.2`. Use the immutable `v0.1.0-legacy` and
`v0.2.0-legacy` tags for durable references.

Licensed under [Apache License 2.0](LICENSE).
