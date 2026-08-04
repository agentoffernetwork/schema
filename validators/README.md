# Validators

Schema validation tooling for AgentOffer Protocol.

## Status

Run JSON Schema **structural** validation first, then use these pure
**semantic** validators for rules that cannot be expressed cleanly in one
payload schema. They do not implement **runtime** enforcement and must not be
used to claim that a hosted service is supported.

## Offer v0.2 Semantic Validator

```javascript
import { validateOfferV02Semantics } from './offer-v0.2-semantics.mjs';

const result = validateOfferV02Semantics(offer);
if (!result.valid) {
  console.error(result.errors);
}
```

The Offer validator checks:

- `goals[].event` uniqueness within one Offer.
- Strictly positive `cpa.amount`; CPS range and precision remain JSON Schema
  responsibilities, so `"0"` and `"0.0000"` are accepted semantically.
- `offer_info.properties[].display_pattern` token grammar.
- AON Taxonomy v1 primary/secondary registry membership and branch conflicts.

The validator deliberately does not create a currency registry: a schema-valid
three-letter uppercase value such as `ZZZ` remains valid. Taxonomy facts come
from the immutable resolver derived from `aon-taxonomy-v1.json`.

## Query and Provider Taxonomy Validator

```javascript
import { validateTaxonomyConstraintsV02 } from './taxonomy-v0.2-semantics.mjs';

const result = validateTaxonomyConstraintsV02(queryOrProviderRequest);
```

This validator checks `constraints.category_ids` against AON Taxonomy v1. It
does not perform Query subtree matching or Provider routing; those are runtime
responsibilities.

## Postback Declared-Goal Context Validator

```javascript
import { validatePostbackDeclaredGoalContext } from './postback-v0.2-semantics.mjs';

const result = validatePostbackDeclaredGoalContext(postback, {
  declared_goal_events: ['trial', 'subscription'],
});
```

This context is a semantic-vector test input only. It does not read tracking
anchors, databases, provider configuration, HMAC state, retry state,
idempotency state, or settlement state.

Stable semantic rule codes are `event_unique`, `amount_positive`,
`taxonomy_registry_membership`, `taxonomy_branch_conflict`, `context_required`,
`context_invalid`, and `event_undeclared`. They are not hosted HTTP error codes.

## Run semantic vectors

From `schema/`:

```bash
npm run test:v0.2-semantic
```

The runner validates every vector structurally with Ajv before dispatching its
closed semantic validator set. `npm test` also runs the S1 baseline,
TypeScript checks, and the Postback reference suite.

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
