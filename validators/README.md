# Validators

Schema validation tooling for AgentOffer Protocol.

## Status

> **Coming soon.** We are building validators that make it easy to check offer payloads against the official JSON Schema.

## Planned Features

- **JSON Schema validator** -- validate offer objects using [ajv](https://ajv.js.org/) with AON-specific error messages
- **TypeScript runtime validator** -- type-safe validation using [zod](https://zod.dev/) generated from the JSON Schema
- **CLI validation** -- `npx @agentoffernetwork/schema validate <file>` for quick command-line checks

## Validate Today

You can already validate offers against the schema using ajv-cli:

```bash
npm install -g ajv-cli
ajv validate -s ../json-schema/offer-schema-v0.1.json -d your-offer.json --spec=draft2020
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
