# Validators

Schema validation tooling for AgentOffer Protocol.

## Status

`offer-v0.2-semantics.mjs` is available for the public Offer v0.2 contract. Run
JSON Schema validation first, then run this semantic validator for rules that
cannot be expressed cleanly in JSON Schema.

## Offer v0.2 Semantic Validator

```javascript
import { validateOfferV02Semantics } from './offer-v0.2-semantics.mjs';

const result = validateOfferV02Semantics(offer);
if (!result.valid) {
  console.error(result.errors);
}
```

The validator checks:

- `goals[].event` uniqueness within one Offer.
- Positive decimal pricing for `cpa.amount` and `cps.rate`.
- `offer_info.properties[].display_pattern` token grammar.

## Planned Packaging

- **JSON Schema validator** -- validate offer objects using [ajv](https://ajv.js.org/) with AON-specific error messages
- **TypeScript runtime validator** -- type-safe validation using [zod](https://zod.dev/) generated from the JSON Schema
- **CLI validation** -- `npx @agentoffernetwork/schema validate <file>` for quick command-line checks

## Validate with Ajv

Validate structural shape with ajv-cli before semantic checks:

```bash
npx --yes --package=ajv-cli@5 --package=ajv-formats@3 -- \
  ajv validate \
  -s ../json-schema/offer-schema-v0.2.json \
  -d your-offer.json \
  --spec=draft2020
```

## Contributing

Want to help build the validators? We'd welcome contributions:

1. Check the [issues](https://github.com/agentoffernetwork/schema/issues) for validator-related tasks
2. Read the [JSON Schema](../json-schema/) to understand the validation rules
3. See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines

The validator should:
- Accept a JSON object and return a typed result (valid/invalid with error details)
- Support both Node.js and browser environments
- Provide clear, actionable error messages referencing the spec
