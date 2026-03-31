# Contributing

Thanks for helping improve AgentOffer Schema.

## Scope

This repository owns the machine-readable contracts for AgentOffer Protocol: JSON Schema definitions, TypeScript types, and validation tooling.

## Where to Send Changes

- **Validator improvements, tooling fixes, comment updates:** direct pull request
- **Non-breaking schema additions** (new OPTIONAL fields): direct pull request
- **Breaking changes** (new REQUIRED fields, renames, removals, semantic changes): open an [RFC](https://github.com/agentoffernetwork/rfcs) first

## Pull Request Expectations

- Keep JSON Schema and TypeScript types aligned -- changes to one must be reflected in the other
- Ensure all example payloads in [`agentoffernetwork/examples`](https://github.com/agentoffernetwork/examples) still validate
- Explain the user or implementer impact
- Reference the relevant protocol spec or RFC if applicable

## Issue Routing

- `bug` -- incorrect schema validation behavior, type mismatch, or broken tooling
- `enhancement` -- new validator features, improved type definitions, better error messages
- `question` -- clarification about schema structure or intended usage

## Development Setup

```bash
# Clone the repository
git clone https://github.com/agentoffernetwork/schema.git
cd schema

# Validate an offer against the schema (requires ajv-cli)
npm install -g ajv-cli
ajv validate -s json-schema/offer-schema-v0.1.json -d ../examples/http/notion-offer.json --spec=draft2020
```

## Code of Conduct

By participating in this project, you agree to follow our [Code of Conduct](CODE_OF_CONDUCT.md).
