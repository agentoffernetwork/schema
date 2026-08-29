import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const goalEventSchema = JSON.parse(readFileSync(resolve(here, '../json-schema/goal-event-name-v1.0.json'), 'utf8'));
const goalEventPattern = new RegExp(goalEventSchema.pattern);
const identityFields = ['event_id', 'order_id', 'partner_txn_id'];

const error = (code, instancePath, message) => ({ code, instancePath, message });
const result = (errors) => ({ valid: errors.length === 0, errors });
const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

export function validatePostbackV10Semantics(postback, context) {
  const errors = [];
  if (!isPlainObject(postback)) return result([error('payload_invalid', '', 'payload must be an object')]);
  const anchors = ['aon_click_id', 'aon_tracking_id', 'offer_instance_id'].filter((field) => Object.hasOwn(postback, field));
  if (anchors.length !== 1 || anchors.some((field) => typeof postback[field] !== 'string' || postback[field].trim() !== postback[field] || postback[field].length === 0)) {
    errors.push(error('attribution_anchor_invalid', '', 'exactly one non-empty attribution anchor without surrounding whitespace is required'));
  }
  const hasAmount = Object.hasOwn(postback, 'amount');
  const hasCurrency = Object.hasOwn(postback, 'currency');
  if (hasAmount !== hasCurrency) errors.push(error('revenue_pair_invalid', '', 'amount and currency must be supplied together'));
  for (const field of identityFields) {
    if (!Object.hasOwn(postback, field)) continue;
    const value = postback[field];
    const normalized = typeof value === 'string' ? value.trim() : '';
    if (typeof value !== 'string' || normalized.length === 0 || Buffer.byteLength(normalized, 'utf8') > 256) {
      errors.push(error('identity_invalid', `/${field}`, `${field} must be non-empty after trim and at most 256 UTF-8 bytes`));
    }
  }
  if (!isPlainObject(context)) return result([...errors, error('context_required', '/context', 'declared goal context is required')]);
  const keys = Object.keys(context).sort();
  if (!keys.every((key) => ['declared_goal_events', 'dedup_strategy', 'pricing_model'].includes(key))) {
    errors.push(error('context_invalid', '/context', 'context contains an unknown key'));
  }
  const declaredGoals = context.declared_goal_events;
  if (!Array.isArray(declaredGoals) || declaredGoals.length === 0 || declaredGoals.some((name) => typeof name !== 'string' || !goalEventPattern.test(name)) || new Set(declaredGoals).size !== declaredGoals.length) {
    errors.push(error('context_invalid', '/context/declared_goal_events', 'declared_goal_events must be a unique non-empty v1.0 goal list'));
  } else if (!declaredGoals.includes(postback.event_name)) {
    errors.push(error('event_undeclared', '/event_name', 'event_name is not declared by the supplied goals'));
  }
  if (!['first', 'all'].includes(context.dedup_strategy)) errors.push(error('dedup_strategy_invalid', '/context/dedup_strategy', 'dedup_strategy must be first or all'));
  if (context.dedup_strategy === 'all' && !identityFields.some((field) => Object.hasOwn(postback, field))) {
    errors.push(error('identity_required', '', 'dedup_strategy all requires an explicit identity'));
  }
  if (context.pricing_model === 'cps' && !hasAmount) errors.push(error('revenue_required', '', 'cps goals require amount and currency'));
  if (context.pricing_model !== undefined && !['cpa', 'cps'].includes(context.pricing_model)) errors.push(error('pricing_model_invalid', '/context/pricing_model', 'pricing_model must be cpa or cps'));
  return result(errors);
}

export default validatePostbackV10Semantics;
