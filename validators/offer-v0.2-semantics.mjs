/** Post-schema semantic checks for Offer v0.2. */
const DISPLAY_PATTERN_TOKENS = new Set(['${type}', '${value}', '${unit}']);

function validateDisplayPattern(pattern, instancePath, errors) {
  let cursor = 0;
  while (cursor < pattern.length) {
    const start = pattern.indexOf('${', cursor);
    if (start === -1) return;
    const end = pattern.indexOf('}', start + 2);
    if (end === -1) {
      errors.push({
        code: 'display_pattern_token',
        instancePath,
        message: 'display_pattern contains an unclosed ${ token',
      });
      return;
    }
    const token = pattern.slice(start, end + 1);
    if (!DISPLAY_PATTERN_TOKENS.has(token)) {
      errors.push({
        code: 'display_pattern_token',
        instancePath,
        message: 'display_pattern token must be one of ${type}, ${value}, or ${unit}',
      });
    }
    cursor = end + 1;
  }
}

export function validateOfferV02Semantics(offer) {
  const errors = [];
  const properties = offer?.offer_info?.properties;
  if (Array.isArray(properties)) {
    properties.forEach((property, i) => {
      if (typeof property?.display_pattern === 'string') {
        validateDisplayPattern(property.display_pattern, `/offer_info/properties/${i}/display_pattern`, errors);
      }
    });
  }
  const goals = offer?.goals;
  if (!Array.isArray(goals)) return { valid: true, errors };
  const seen = new Set();
  goals.forEach((goal, i) => {
    const path = `/goals/${i}`;
    if (seen.has(goal.event)) errors.push({ code: 'event_unique', instancePath: `${path}/event`, message: 'goal event must be unique' });
    seen.add(goal.event);
    const pricing = goal.pricing;
    if (pricing?.model === 'cpa' && Number(pricing.amount) <= 0)
      errors.push({ code: 'amount_positive', instancePath: `${path}/pricing/amount`, message: 'cpa amount must be greater than zero' });
    if (pricing?.model === 'cps' && Number(pricing.rate) <= 0)
      errors.push({ code: 'rate_positive', instancePath: `${path}/pricing/rate`, message: 'cps rate must be greater than zero' });
  });
  return { valid: errors.length === 0, errors };
}

export default validateOfferV02Semantics;
