/**
 * AgentOffer Offer Schema v0.1
 * TypeScript type definitions
 *
 * Protocol-aligned, client-facing offer object and query response envelope.
 * Fields are annotated with requirement levels per RFC 2119:
 *   REQUIRED — Field MUST be present with a valid, non-empty value.
 *   RECOMMENDED — Field SHOULD be present and follow the standard structure; value MAY be empty or null.
 *   OPTIONAL — Field MAY be omitted entirely.
 *
 * @see https://agentoffernetwork.org/schema/offer/v0.1
 */

import type { CategoryType, CategoryAttributes, EntertainmentSubType, EntertainmentAttributes } from './category-attributes.types';

export type { CategoryType, CategoryAttributes, EntertainmentSubType, EntertainmentAttributes };

/** Top-level offer object. */
export interface Offer {
  /** [REQUIRED] Stable protocol-side offer identifier. UUIDv7 is recommended. */
  uuid: string;

  /** [REQUIRED] Offer document version. Current value: "1.0". */
  version: string;

  /** [REQUIRED] Descriptive, categorical, and commercial information for the offer. */
  offer_info: OfferInfo;

  /** [REQUIRED] Business entity associated with the offer. */
  entity: Entity;

  /** [REQUIRED] Primary executable action exposed by the offer. */
  action: OfferAction;

  /** [RECOMMENDED] Creative assets associated with the offer. Field must be present; value may be an empty array. */
  material: MaterialItem[];

  /** [OPTIONAL] Targeting constraints for surfacing. */
  targeting?: TargetingRule[];

  /** [OPTIONAL] Commission information. */
  commission?: Commission;

  /** [OPTIONAL] Conversion event rules and attribution logic. */
  conversion_rule?: ConversionRule;

  /** [OPTIONAL] Exposure frequency limits. */
  frequency_capping?: FrequencyCapping;

  /** [OPTIONAL] Custom tags for filtering and semantic matching. */
  tags?: string[];
}

/** [REQUIRED] Core offer information. */
export interface OfferInfo {
  /** [REQUIRED] Display-ready title. */
  title: string;

  /** [REQUIRED] Offer delivery form classification. */
  offer_type: 'physical_product' | 'content' | 'online_service' | 'offline_service' | string;

  /** [REQUIRED] Industry category, vertical-specific attributes, and commercial context. */
  category: Category;

  /** [REQUIRED] Core semantic description. */
  description: string;

  /** [OPTIONAL] Upstream source-side offer or inventory identifier. */
  source_offer_id?: string;

  /** [OPTIONAL] RFC 3339 timestamp for when the offer becomes active. */
  start_at?: string;

  /** [OPTIONAL] RFC 3339 timestamp for when the offer expires. */
  expire_at?: string;

  /** [OPTIONAL] Lifecycle status. */
  status?: 'active' | 'paused' | 'pending' | 'rejected' | 'expired';

  /** [OPTIONAL] Compliance audit status. */
  audit_status?: 'waiting' | 'pass' | 'reject';

  /** [OPTIONAL] Exposure priority. Higher values take precedence. */
  priority?: number;
}

/** [REQUIRED] Industry category with vertical-specific attributes and commercial context. */
export interface Category {
  /** [REQUIRED] Industry vertical identifier. Must be a registered CategoryType value. */
  type: CategoryType;

  /**
   * [RECOMMENDED] Vertical-specific attributes. Structure is determined by category.type.
   * Field must be present; may be empty object.
   * @see category-attributes.types.ts for per-type definitions.
   */
  attributes: Record<string, unknown>;

  /** [RECOMMENDED] Pricing, availability, and inventory information. Field must be present; values may be empty. */
  commercial: CommercialInfo;
}

export interface CommercialInfo {
  price?: Price;
  availability?: 'available' | 'limited' | 'sold_out' | 'pre_order';
  /** [OPTIONAL] Available inventory count. */
  stock?: number;
}

export interface Price {
  amount: string;
  currency: string;
}

export interface Entity {
  /** [REQUIRED] Stable entity identifier. */
  id: string;
  /** [REQUIRED] Display name. */
  name: string;
  /** [OPTIONAL] Entity classification. */
  type?: 'merchant' | 'brand' | 'creator' | 'seller' | 'service_provider' | 'financial_institution' | string;
  /** [OPTIONAL] Short description. */
  description?: string;
  /** [OPTIONAL] Official website. */
  website?: string;
}

export interface OfferAction {
  /** [REQUIRED] Executable action type. */
  type: ActionType;
  /** [RECOMMENDED] Short user-facing action name (CTA text). */
  name?: string;
  /** [OPTIONAL] Explanation of the action intent. */
  description?: string;
  /** [REQUIRED] Action-specific payload. */
  payload: ActionPayload;
}

export type ActionType = 'web_redirect' | 'app_deep_link' | 'api_trigger';

export interface ActionPayload {
  /** [REQUIRED] Destination URL, deep link, or API endpoint. */
  target: string;
  /** [OPTIONAL] Whether the user must authenticate. */
  requires_auth?: boolean;
  /** [OPTIONAL] Target platform. */
  platform?: 'web' | 'ios' | 'android' | 'desktop';
}

/** [RECOMMENDED] Creative asset item. */
export interface MaterialItem {
  /** [RECOMMENDED] URL to the creative asset. */
  image_url?: string;
  /** [RECOMMENDED] Asset purpose tag. */
  tag?: string;
  /** [RECOMMENDED] Asset format. */
  format?: 'image' | 'video' | 'html5';
  /** [OPTIONAL] Dimension specification. */
  size?: string;
}

export interface TargetingRule {
  geo?: GeoTargeting;
  language?: string;
  device_type?: ('mobile' | 'desktop' | 'tablet' | 'smart_tv')[];
}

export interface GeoTargeting {
  include?: string[];
  exclude?: string[];
}

export interface Commission {
  amount?: string;
  currency?: string;
  model?: 'fixed' | 'percentage' | 'cpa' | 'cps';
}

/** [OPTIONAL] Conversion event rules. */
export interface ConversionRule {
  trigger?: string;
  window_hours?: number;
  attribution_type?: 'last_click' | 'first_click' | 'multi_touch';
}

/** [OPTIONAL] Frequency capping configuration. */
export interface FrequencyCapping {
  per_user_day?: number;
  per_user_total?: number;
}

/** Query request for searching offers. */
export interface OfferQuery {
  q?: string;
  offer_type?: string;
  category_type?: string;
  entity_id?: string;
  source_offer_id?: string;
  limit?: number;
  cursor?: string | null;
}

/** Query response envelope. */
export interface OfferResponse {
  trace_id: string;
  offers: Offer[];
  has_more?: boolean;
  next_cursor?: string | null;
}
