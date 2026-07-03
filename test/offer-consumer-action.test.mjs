import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const schemaRoot = resolve(here, '..');
const protocolRoot = resolve(schemaRoot, '../protocol');
const examplesRoot = resolve(schemaRoot, '../examples');

const offerSchema = JSON.parse(
  readFileSync(resolve(schemaRoot, 'json-schema/offer-schema-v0.1.json'), 'utf8'),
);
const offerTypes = readFileSync(resolve(schemaRoot, 'types/offer.types.ts'), 'utf8');
const offerSpec = readFileSync(resolve(protocolRoot, 'specs/offer-schema.md'), 'utf8');
const eventsSpec = readFileSync(resolve(protocolRoot, 'specs/events.md'), 'utf8');
const postbackSpec = readFileSync(resolve(protocolRoot, 'specs/postback.md'), 'utf8');

const offerResponse = JSON.parse(
  readFileSync(resolve(examplesRoot, 'http/offer-response.json'), 'utf8'),
);
const productOffer = JSON.parse(
  readFileSync(resolve(examplesRoot, 'http/product-offer.json'), 'utf8'),
);
const entertainmentOffer = JSON.parse(
  readFileSync(resolve(examplesRoot, 'http/entertainment-offer.json'), 'utf8'),
);
const shortDramaOffer = JSON.parse(
  readFileSync(resolve(examplesRoot, 'http/short-drama-offer.json'), 'utf8'),
);
const contentOffer = JSON.parse(
  readFileSync(resolve(examplesRoot, 'http/content-offer.json'), 'utf8'),
);

const action = offerSchema.properties.action;
const consumerAction = action.properties.consumer_action;
const consumerActionEnum = [
  'learn_more',
  'watch',
  'play',
  'listen',
  'install',
  'download',
  'registration',
  'sign_up',
  'subscribe',
  'purchase',
  'apply',
  'submission',
  'start_trial',
  'read',
  'book',
  'claim',
  'redeem',
  'contact',
];
const consumerActionTypeBlock = offerTypes.match(
  /export type ConsumerAction =[\s\S]*?;\n/,
)?.[0] ?? '';

function cloneOfferWithConsumerAction(value) {
  const offer = JSON.parse(JSON.stringify(productOffer));
  if (value === undefined) {
    delete offer.action.consumer_action;
  } else {
    offer.action.consumer_action = value;
  }
  return offer;
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function matchesType(type, value) {
  switch (type) {
    case 'object':
      return isObject(value);
    case 'array':
      return Array.isArray(value);
    case 'string':
      return typeof value === 'string';
    case 'integer':
      return Number.isInteger(value);
    case 'number':
      return typeof value === 'number' && Number.isFinite(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'null':
      return value === null;
    default:
      return true;
  }
}

function sameJson(lhs, rhs) {
  return JSON.stringify(lhs) === JSON.stringify(rhs);
}

function validateSchema(schema, value, path = '$') {
  const errors = [];

  if (!schema || typeof schema !== 'object') {
    return errors;
  }

  const types = Array.isArray(schema.type) ? schema.type : schema.type ? [schema.type] : [];
  if (types.length > 0 && !types.some((type) => matchesType(type, value))) {
    errors.push(`${path} should match type ${types.join('|')}`);
    return errors;
  }

  if ('const' in schema && !sameJson(value, schema.const)) {
    errors.push(`${path} should equal ${JSON.stringify(schema.const)}`);
  }

  if (schema.enum && !schema.enum.some((candidate) => sameJson(value, candidate))) {
    errors.push(`${path} should be one of ${schema.enum.join(', ')}`);
  }

  if (typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      errors.push(`${path} should have minLength ${schema.minLength}`);
    }
    if (schema.maxLength !== undefined && value.length > schema.maxLength) {
      errors.push(`${path} should have maxLength ${schema.maxLength}`);
    }
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
      errors.push(`${path} should match pattern ${schema.pattern}`);
    }
  }

  if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) {
      errors.push(`${path} should be >= ${schema.minimum}`);
    }
    if (schema.maximum !== undefined && value > schema.maximum) {
      errors.push(`${path} should be <= ${schema.maximum}`);
    }
  }

  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      errors.push(`${path} should have minItems ${schema.minItems}`);
    }
    if (schema.maxItems !== undefined && value.length > schema.maxItems) {
      errors.push(`${path} should have maxItems ${schema.maxItems}`);
    }
    if (schema.uniqueItems) {
      const seen = new Set(value.map((item) => JSON.stringify(item)));
      if (seen.size !== value.length) {
        errors.push(`${path} should contain unique items`);
      }
    }
    if (schema.items) {
      value.forEach((item, index) => {
        errors.push(...validateSchema(schema.items, item, `${path}[${index}]`));
      });
    }
  }

  if (isObject(value)) {
    if (schema.required) {
      for (const key of schema.required) {
        if (!(key in value)) {
          errors.push(`${path}.${key} is required`);
        }
      }
    }
    if (schema.properties) {
      for (const [key, propertySchema] of Object.entries(schema.properties)) {
        if (key in value) {
          errors.push(...validateSchema(propertySchema, value[key], `${path}.${key}`));
        }
      }
    }
    if (schema.additionalProperties === false && schema.properties) {
      for (const key of Object.keys(value)) {
        if (!(key in schema.properties)) {
          errors.push(`${path}.${key} is not allowed`);
        }
      }
    }
  }

  if (schema.oneOf) {
    const matches = schema.oneOf.filter((candidate) => validateSchema(candidate, value, path).length === 0);
    if (matches.length !== 1) {
      errors.push(`${path} should match exactly one oneOf branch`);
    }
  }

  if (schema.allOf) {
    for (const candidate of schema.allOf) {
      errors.push(...validateSchema(candidate, value, path));
    }
  }

  if (schema.not && validateSchema(schema.not, value, path).length === 0) {
    errors.push(`${path} should not match forbidden schema`);
  }

  if (schema.if) {
    const ifMatches = validateSchema(schema.if, value, path).length === 0;
    if (ifMatches && schema.then) {
      errors.push(...validateSchema(schema.then, value, path));
    }
    if (!ifMatches && schema.else) {
      errors.push(...validateSchema(schema.else, value, path));
    }
  }

  return errors;
}

function isValidOfferPayload(offer) {
  return validateSchema(offerSchema, offer).length === 0;
}

function test_action_consumer_action_contract_shape() {
  assert.ok(consumerAction, 'action.consumer_action schema must exist');
  assert.equal(consumerAction.type, 'string');
  assert.equal(action.required.includes('consumer_action'), false);
  assert.deepEqual(consumerAction.enum, consumerActionEnum);
  assert.match(consumerAction.description, /main end-user action semantic/i);
  assert.match(offerTypes, /export type ConsumerAction =/);
  assert.match(offerTypes, /consumer_action\?: ConsumerAction;/);
  assert.match(offerSpec, /`action\.consumer_action`/);
  assert.match(offerSpec, /RECOMMENDED/);
}

function test_consumer_action_allowed_enum_values() {
  for (const value of consumerActionEnum) {
    assert.equal(isValidOfferPayload(cloneOfferWithConsumerAction(value)), true, `${value} should be a valid consumer_action`);
  }
  for (const value of ['open', 'view', 'pay', 'other', 'custom']) {
    assert.equal(isValidOfferPayload(cloneOfferWithConsumerAction(value)), false, `${value} should not be canonical`);
    assert.doesNotMatch(consumerActionTypeBlock, new RegExp(`'${value}'`));
  }
}

function test_consumer_action_invalid_values_and_missing_compatibility() {
  assert.equal(isValidOfferPayload(cloneOfferWithConsumerAction(undefined)), true);
  for (const value of [
    '',
    'pay',
    'view',
    'other',
    'custom',
    'signup',
    'sign-up',
    'Purchase',
    'Registration',
    'startTrial',
    'start-trial',
    'trial',
    'submit',
    'read_more',
    'request_quote',
    ' purchase ',
    null,
    [],
    {},
    123,
    true,
  ]) {
    assert.equal(isValidOfferPayload(cloneOfferWithConsumerAction(value)), false, `${JSON.stringify(value)} should be invalid`);
  }
}

function test_consumer_action_semantic_boundaries() {
  assert.match(offerSpec, /`action\.type`[^\n]+execution mechanism/i);
  assert.match(offerSpec, /`action\.destination_types`[^\n]+target shape/i);
  assert.match(offerSpec, /`action\.name`[^\n]+CTA text/i);
  assert.match(offerSpec, /`conversion_rule\.accepted_types`[^\n]+conversion result/i);
  assert.match(offerSpec, /consumer-owned analytics/i);
  assert.match(offerSpec, /`sign_up`[^\n]+legacy\/deprecated alias/i);
  assert.match(offerSpec, /`registration`[\s\S]+`sign_up`/i);
  assert.match(offerSpec, /`submission`[\s\S]+`apply`/i);
  assert.match(offerSpec, /`start_trial`[\s\S]+`subscribe`/i);
  assert.match(offerSpec, /`read`[\s\S]+`download`/i);
  assert.match(offerSpec, /MUST NOT modify `events\.md`/i);
  assert.doesNotMatch(eventsSpec, /consumer_action/);
  assert.doesNotMatch(postbackSpec, /consumer_action/);
}

function test_consumer_action_examples_cover_purchase_play_watch_trial_read() {
  assert.equal(offerResponse.offers[0].action.consumer_action, 'start_trial');
  assert.equal(productOffer.action.consumer_action, 'purchase');
  assert.equal(entertainmentOffer.action.consumer_action, 'play');
  assert.equal(shortDramaOffer.action.consumer_action, 'watch');
  assert.equal(contentOffer.action.consumer_action, 'read');

  for (const offer of [offerResponse.offers[0], productOffer, entertainmentOffer, shortDramaOffer, contentOffer]) {
    assert.ok(offer.action.type, `${offer.offer_id} action.type should remain present`);
    assert.ok(
      offer.action.payload?.target,
      `${offer.offer_id} action.payload.target should remain executable`,
    );
  }
}

test_action_consumer_action_contract_shape();
test_consumer_action_allowed_enum_values();
test_consumer_action_invalid_values_and_missing_compatibility();
test_consumer_action_semantic_boundaries();
test_consumer_action_examples_cover_purchase_play_watch_trial_read();

console.log('offer-consumer-action OK');
