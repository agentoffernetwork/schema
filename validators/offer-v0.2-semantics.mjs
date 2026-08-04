/** Post-schema semantic checks for Offer v0.2. */
import { aonTaxonomyV1Resolver } from '../taxonomy/aon-taxonomy-v1-resolver.mjs';

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
  if (Array.isArray(goals)) {
    const seen = new Set();
    goals.forEach((goal, i) => {
      const path = `/goals/${i}`;
      if (seen.has(goal.event)) errors.push({ code: 'event_unique', instancePath: `${path}/event`, message: 'goal event must be unique' });
      seen.add(goal.event);
      const pricing = goal.pricing;
      if (pricing?.model === 'cpa' && Number(pricing.amount) <= 0)
        errors.push({ code: 'amount_positive', instancePath: `${path}/pricing/amount`, message: 'cpa amount must be greater than zero' });
    });
  }

  const primaryCategoryId = offer?.offer_info?.category?.id;
  const secondaryCategoryIds = offer?.offer_info?.secondary_category_ids;
  const categoryEntries = [];
  if (typeof primaryCategoryId === 'string') {
    categoryEntries.push({ id: primaryCategoryId, instancePath: '/offer_info/category/id' });
  }
  if (Array.isArray(secondaryCategoryIds)) {
    secondaryCategoryIds.forEach((id, index) => {
      categoryEntries.push({ id, instancePath: `/offer_info/secondary_category_ids/${index}` });
    });
  }

  for (const entry of categoryEntries) {
    if (!aonTaxonomyV1Resolver.has(entry.id)) {
      errors.push({ code: 'taxonomy_registry_membership', instancePath: entry.instancePath, message: 'category id must exist in AON Taxonomy v1' });
    }
  }
  for (let index = 1; index < categoryEntries.length; index += 1) {
    const current = categoryEntries[index];
    if (!aonTaxonomyV1Resolver.has(current.id)) continue;
    for (let previousIndex = 0; previousIndex < index; previousIndex += 1) {
      const previous = categoryEntries[previousIndex];
      if (!aonTaxonomyV1Resolver.has(previous.id)) continue;
      const categoryRelation = aonTaxonomyV1Resolver.relation(previous.id, current.id);
      if (categoryRelation !== 'disjoint') {
        errors.push({
          code: 'taxonomy_branch_conflict',
          instancePath: current.instancePath,
          message: 'secondary category must not equal, contain, or be contained by another category',
        });
        break;
      }
    }
  }
  return { valid: errors.length === 0, errors };
}

export default validateOfferV02Semantics;
