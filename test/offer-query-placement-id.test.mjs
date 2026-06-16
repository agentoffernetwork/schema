import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const schemaRoot = resolve(here, '..');
const protocolRoot = resolve(schemaRoot, '../protocol');
const examplesRoot = resolve(schemaRoot, '../examples');

const querySchema = JSON.parse(
  readFileSync(resolve(schemaRoot, 'json-schema/offer-query-schema-v0.1.json'), 'utf8'),
);
const offerTypes = readFileSync(resolve(schemaRoot, 'types/offer.types.ts'), 'utf8');
const querySpec = readFileSync(resolve(protocolRoot, 'specs/query-api.md'), 'utf8');
const queryExample = JSON.parse(
  readFileSync(resolve(examplesRoot, 'http/offer-query-request.json'), 'utf8'),
);

function minimalRequest(overrides = {}) {
  return {
    context: {
      user_profile: {
        device_info: {
          device_type: 'other',
          os: 'other',
        },
      },
    },
    intent: {
      content: [
        {
          type: 'input_text',
          text: 'Find team collaboration software',
        },
      ],
    },
    ...overrides,
  };
}

function matchesPlacementSchema(value) {
  const placement = querySchema.properties.placement_id;
  return (
    typeof value === placement.type &&
    value.length >= placement.minLength &&
    value.length <= placement.maxLength &&
    new RegExp(placement.pattern).test(value)
  );
}

function validatePlacementRequest(request) {
  if (querySchema.additionalProperties === false) {
    for (const key of Object.keys(request)) {
      if (!Object.hasOwn(querySchema.properties, key)) {
        return false;
      }
    }
  }

  if (
    request.constraints &&
    querySchema.properties.constraints.additionalProperties === false &&
    Object.hasOwn(request.constraints, 'placement_id')
  ) {
    return false;
  }

  if (!Object.hasOwn(request, 'placement_id')) {
    return true;
  }
  return matchesPlacementSchema(request.placement_id);
}

function validates_offer_query_placement_id_schema_boundaries() {
  assert.equal(querySchema.additionalProperties, false);
  assert.equal(querySchema.required.includes('placement_id'), false);
  assert.deepEqual(querySchema.properties.placement_id, {
    type: 'string',
    minLength: 1,
    maxLength: 64,
    pattern: '^\\S+$',
    description:
      'Optional provider-neutral placement identifier for hosted routing. Values are bounded opaque strings; hosted AON placement IDs such as plc_... are platform examples, not a protocol grammar.',
  });

  assert.equal(validatePlacementRequest(minimalRequest()), true);
  assert.equal(validatePlacementRequest(minimalRequest({ placement_id: 'plc_A1b2C3d4E5f6G7h8' })), true);
  assert.equal(validatePlacementRequest(minimalRequest({ placement_id: 'x' })), true);
  assert.equal(validatePlacementRequest(minimalRequest({ placement_id: 'a'.repeat(64) })), true);

  assert.equal(validatePlacementRequest(minimalRequest({ placement_id: null })), false);
  assert.equal(validatePlacementRequest(minimalRequest({ placement_id: '' })), false);
  assert.equal(validatePlacementRequest(minimalRequest({ placement_id: '   ' })), false);
  assert.equal(validatePlacementRequest(minimalRequest({ placement_id: 'has whitespace' })), false);
  assert.equal(validatePlacementRequest(minimalRequest({ placement_id: 'a'.repeat(65) })), false);
  assert.equal(validatePlacementRequest(minimalRequest({ placement_id: 42 })), false);
  assert.equal(validatePlacementRequest(minimalRequest({ placement_id: ['plc_123'] })), false);
  assert.equal(
    validatePlacementRequest(minimalRequest({ constraints: { placement_id: 'plc_wrong' } })),
    false,
  );
  assert.equal(validatePlacementRequest(minimalRequest({ unknown_field: true })), false);
}

function offer_query_request_type_declares_optional_placement_id() {
  const interfaceMatch = offerTypes.match(/export interface OfferQueryRequest \{([\s\S]*?)\n\}/);
  assert.ok(interfaceMatch, 'OfferQueryRequest interface must exist');
  assert.match(interfaceMatch[1], /\bplacement_id\?: string;/);
  assert.doesNotMatch(interfaceMatch[1], /\bplacement_id\?: string \| null;/);
  assert.match(interfaceMatch[1], /\bcontext: QueryContext;/);
  assert.match(interfaceMatch[1], /\bintent: QueryIntent;/);
}

function offer_query_example_contains_top_level_placement_id() {
  assert.equal(queryExample.placement_id, 'plc_A1b2C3d4E5f6G7h8');
  assert.ok(queryExample.context);
  assert.ok(queryExample.intent);
  assert.equal(Object.hasOwn(queryExample.constraints ?? {}, 'placement_id'), false);
}

function protocol_query_api_request_summary_and_shape_include_placement() {
  assert.match(querySpec, /\| Request \|[\s\S]*optional `placement_id`/);
  assert.match(querySpec, /\| `placement_id` \| OPTIONAL \|/);
  assert.match(querySpec, /top-level request body field/i);
  assert.match(querySpec, /platform-defined/i);
  assert.doesNotMatch(querySpec, /`constraints\.placement_id` \|/);
}

validates_offer_query_placement_id_schema_boundaries();
offer_query_request_type_declares_optional_placement_id();
offer_query_example_contains_top_level_placement_id();
protocol_query_api_request_summary_and_shape_include_placement();

console.log('offer-query-placement-id OK');
