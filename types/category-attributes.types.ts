/**
 * AgentOffer Category Types
 *
 * AON Taxonomy v1 replaces the v0.1 `category.type` +
 * `category.attributes.sub_type` model with a single stable `category.id`.
 *
 * The source taxonomy tree is stored at:
 *   - taxonomy/aon-taxonomy-v1.json
 *
 * Registry membership is validated by:
 *   - scripts/validate-taxonomy-v1.mjs
 *
 * @see https://agentoffernetwork.org/schema/offer/v0.1
 */

/** Stable generated dot-path id from AON Taxonomy v1. */
export type CategoryId = string;

/** Source registry node. Source files use `name + children`; ids are generated. */
export interface TaxonomyNode {
  name: string;
  children?: TaxonomyNode[];
}

/** Generated registry node view used by validators and UI consumers. */
export interface GeneratedTaxonomyNode {
  id: CategoryId;
  name: string;
  children: GeneratedTaxonomyNode[];
}

/** Canonical public Offer category payload. */
export interface OfferCategory {
  id: CategoryId;
}

/** Legacy v0.1 category values kept only for migration mapping. */
export type LegacyCategoryType =
  | 'software_saas'
  | 'travel_hospitality'
  | 'education'
  | 'financial_service'
  | 'electronics'
  | 'entertainment'
  | 'health_beauty'
  | 'fashion'
  | 'food_grocery'
  | 'home_garden'
  | 'automotive';

/**
 * @deprecated Use CategoryId / OfferCategory. This alias is retained only to
 * help migration tooling identify legacy v0.1 inputs.
 */
export type CategoryType = LegacyCategoryType;

/**
 * @deprecated v0.1 vertical attributes are replaced by taxonomy registry ids.
 * Keep this shape only for migration readers that parse old payloads.
 */
export interface LegacyCategoryAttributes {
  type: LegacyCategoryType;
  attributes: {
    sub_type: string;
    [key: string]: unknown;
  };
}

/**
 * @deprecated Use OfferCategory. Retained as a compatibility alias for code
 * that imported CategoryAttributes before the Taxonomy v1 upgrade.
 */
export type CategoryAttributes = OfferCategory;
