import { aonTaxonomyV1Resolver } from '../taxonomy/aon-taxonomy-v1-resolver.mjs';

function result(errors) {
  return { valid: errors.length === 0, errors };
}

export function validateTaxonomyConstraintsV02(request) {
  const errors = [];
  const categoryIds = request?.constraints?.category_ids;
  if (!Array.isArray(categoryIds)) return result(errors);

  categoryIds.forEach((categoryId, index) => {
    if (!aonTaxonomyV1Resolver.has(categoryId)) {
      errors.push({
        code: 'taxonomy_registry_membership',
        instancePath: `/constraints/category_ids/${index}`,
        message: 'category id must exist in AON Taxonomy v1',
      });
    }
  });
  return result(errors);
}

export default validateTaxonomyConstraintsV02;
