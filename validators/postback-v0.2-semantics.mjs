import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const goalEventSchema = JSON.parse(
  readFileSync(resolve(here, '../json-schema/goal-event-name-v0.2.json'), 'utf8'),
);
const goalEventPattern = new RegExp(goalEventSchema.pattern);

function error(code, instancePath, message) {
  return { code, instancePath, message };
}

function result(errors) {
  return { valid: errors.length === 0, errors };
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isGoalEventName(value) {
  return typeof value === 'string' && goalEventPattern.test(value);
}

export function validatePostbackDeclaredGoalContext(postback, context) {
  if (context === undefined) {
    return result([error('context_required', '/context', 'declared goal context is required')]);
  }
  if (!isPlainObject(context)) {
    return result([error('context_invalid', '/context', 'context must be an object')]);
  }

  const keys = Object.keys(context).sort();
  if (keys.length !== 1 || keys[0] !== 'declared_goal_events') {
    return result([error('context_invalid', '/context', 'context must contain only declared_goal_events')]);
  }

  const declaredGoalEvents = context.declared_goal_events;
  if (!Array.isArray(declaredGoalEvents) || declaredGoalEvents.length === 0) {
    return result([error('context_invalid', '/context/declared_goal_events', 'declared_goal_events must be a non-empty array')]);
  }
  if (declaredGoalEvents.some((event) => !isGoalEventName(event))) {
    return result([error('context_invalid', '/context/declared_goal_events', 'declared_goal_events must use the v0.2 goal-event grammar')]);
  }
  if (new Set(declaredGoalEvents).size !== declaredGoalEvents.length) {
    return result([error('context_invalid', '/context/declared_goal_events', 'declared_goal_events must not contain duplicates')]);
  }
  if (!declaredGoalEvents.includes(postback?.event_name)) {
    return result([error('event_undeclared', '/event_name', 'event_name is not declared by the supplied goals')]);
  }
  return result([]);
}

export default validatePostbackDeclaredGoalContext;
