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
  const hasCommission = Object.hasOwn(postback, 'commission_amount');
  const hasCommissionCurrency = Object.hasOwn(postback, 'commission_currency');
  if (hasCommission !== hasCommissionCurrency) errors.push(error('invalid_commission_pair', '', 'actual commission amount and currency must be supplied together'));
  if (hasCommission && (typeof postback.commission_amount !== 'string' || !/^[0-9]{1,12}(?:\.[0-9]{1,6})?$/.test(postback.commission_amount) || typeof postback.commission_currency !== 'string' || !/^[A-Z]{3}$/.test(postback.commission_currency))) errors.push(error('invalid_commission_pair', '', 'invalid actual commission pair'));
  const action = (postback.action ?? 'conversion').toLowerCase();
  if ((hasCommission || hasCommissionCurrency) && action !== 'conversion') errors.push(error('commission_not_allowed_for_action', '', 'confirm and reversal do not carry money'));
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
  if (action === 'conversion' && context.pricing_model === 'cps' && !hasAmount && !hasCommission) errors.push(error('revenue_required', '', 'cps goals require amount and currency'));
  if (hasCommission && context.pricing_model !== 'cps') errors.push(error('invalid_goal_pricing', '', 'actual commissions require a CPS Goal'));
  if (context.pricing_model !== undefined && !['cpa', 'cps'].includes(context.pricing_model)) errors.push(error('pricing_model_invalid', '/context/pricing_model', 'pricing_model must be cpa or cps'));
  return result(errors);
}

export default validatePostbackV10Semantics;

/** Validate the semantics of one Agent event object after the closed `$defs.event` JSON Schema branch succeeds. */
export function validateAgentWebhookV10Semantics(payload) {
  if (!isPlainObject(payload)) return result([error('payload_invalid', '', 'payload must be an object')]);
  if (payload.event_type === 'conversion') return result([]);
  if (!['earning_confirmed', 'earning_available', 'earning_paid_out', 'earning_rejected'].includes(payload.event_type)) {
    return result([error('event_type_invalid', '/event_type', 'unknown Agent event type')]);
  }
  const errors = [];
  if (!Number.isInteger(payload.sequence) || payload.sequence < 1) {
    errors.push(error('sequence_invalid', '/sequence', 'sequence must be a positive integer'));
  }
  return result(errors);
}

/**
 * Validate an Agent webhook delivery envelope (the request body) after the root JSON Schema
 * succeeds: checks the envelope shape and applies `validateAgentWebhookV10Semantics` to every
 * element of `events`. Unknown top-level envelope members are ignored (specification section 5.3).
 */
export function validateAgentWebhookEnvelopeV10Semantics(envelope) {
  if (!isPlainObject(envelope)) return result([error('envelope_invalid', '', 'request body must be a delivery envelope object')]);
  const errors = [];
  if (typeof envelope.delivery_id !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(envelope.delivery_id)) {
    errors.push(error('delivery_id_invalid', '/delivery_id', 'delivery_id must be 1 to 64 characters of [A-Za-z0-9_-]'));
  }
  if (!Array.isArray(envelope.events) || envelope.events.length < 1 || envelope.events.length > 100) {
    errors.push(error('events_invalid', '/events', 'events must be an array of 1 to 100 event objects'));
    return result(errors);
  }
  envelope.events.forEach((event, index) => {
    for (const item of validateAgentWebhookV10Semantics(event).errors) {
      errors.push(error(item.code, `/events/${index}${item.instancePath}`, item.message));
    }
  });
  return result(errors);
}
