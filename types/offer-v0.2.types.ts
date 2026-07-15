/**
 * AgentOffer Offer Schema v0.2
 * TypeScript type definitions
 *
 * Generated from the authoritative JSON Schema files:
 *   - offer-schema-v0.2.json
 *   - offer-query-schema-v0.2.json
 *
 * Fields are annotated with requirement levels per RFC 2119:
 *   REQUIRED — Field MUST be present with a valid, non-empty value.
 *   RECOMMENDED — Field SHOULD be present and follow the standard structure; value MAY be empty or null.
 *   OPTIONAL — Field MAY be omitted entirely.
 *
 * @see https://agentoffernetwork.org/schema/offer/v0.2
 */

import type { CategoryId, OfferCategory } from './category-attributes.types';

export type { CategoryId, OfferCategory };

// ─── Offer ─────────────────────────────────────────────────────────────────────

/** Top-level offer object. */
export interface Offer {
  /**
   * [REQUIRED] Stable inventory-level offer identifier. UUIDv7 is recommended.
   * Same `offer_id` across multiple query responses for the same offer
   * (one entry per inventory record). Industry alignment: affiliate platforms
   * such as PartnerStack and Rakuten Advertising use `offer_id` for the
   * inventory-stable identifier.
   * @example "019414a0-7e3b-7f1a-b5e2-0a1b2c3d4e5f"
   */
  offer_id: string;

  /**
   * [REQUIRED] Per-dispatch unique identifier for this offer instance. UUIDv7
   * is recommended. Generated fresh for each query response (i.e. each time the
   * offer is "served"). Used as the primary key for the click → conversion →
   * settlement attribution pipeline as the dispatch-level fallback key. The
   * same value is carried in:
   *   - landing-page URL query param: `?aon_tracking_id={offer_instance_id}`
   *   - S2S postback body: `aon_tracking_id={offer_instance_id}`
   *   - events.md `click_event` / `conversion_event`: the `aon_tracking_id`
   *     field (see PROTO-F014b for the events/postback rename).
   *
   * Actual click-level attribution uses a distinct per-click ID generated at
   * redirect time and exposed through the canonical `{CLICK_ID}` macro or the
   * `aon_click_id` fallback query parameter.
   *
   * Industry alignment: Google Ads `gclid`, Meta `fbclid`, TikTok `ttclid`,
   * Microsoft `msclkid` all follow the `{platform_prefix}clid` pattern at the
   * integration layer. AON keeps the protocol-side field name neutral
   * (`offer_instance_id`) for protocol openness and uses `aon_tracking_id` only
   * at the integration layer (URL query param + S2S body), avoiding vendor
   * lock-in inside the schema while preserving brand identity in the
   * partner-facing contract.
   * @example "019dd208-27d2-7673-b16f-6897fa120303"
   */
  offer_instance_id: string;

  /** [REQUIRED] Offer document version. @example "1.0" */
  version: '2.0';

  /**
   * [OPTIONAL] BCP 47 language tag for the user-facing content in this Offer
   * payload, such as title, description, and action copy. Content metadata only;
   * it does not affect targeting or eligibility.
   * @example "en-US"
   */
  content_language?: string;

  /** [REQUIRED] Descriptive, categorical, and commercial information for the offer. */
  offer_info: OfferInfo;

  /** [REQUIRED] Business entity associated with the offer. */
  entity: Entity;

  /** [REQUIRED] Primary executable action exposed by the offer. */
  action: OfferAction;

  /** [OPTIONAL] Creative assets associated with the offer. @example [{ "url": "https://cdn.example.com/banner.png", "tag": "banner", "format": "image" }] */
  material?: MaterialItem[];

  /** [OPTIONAL] Targeting constraints for surfacing. */
  targeting?: TargetingRule[];


  /** [RECOMMENDED] Rules for valid conversion events, attribution windows, and dedup logic. SHOULD be present to establish clear attribution expectations. */
  conversion_rule?: ConversionRule;

  /** [OPTIONAL] Offer-level open extension metadata. Distinct from API response envelope extra. */
  extra?: Record<string, unknown>;

  goals: ConversionGoal[];

}

// ─── OfferInfo ──────────────────────────────────────────────────────────────────

/** [REQUIRED] Core offer information. */
export interface OfferInfo {
  /** [REQUIRED] Display-ready title. maxLength: 200. @example "Claude Pro — AI Assistant for Teams" */
  title: string;

  /**
   * [OPTIONAL] Offer fulfillment form — how the offer is delivered to the end user.
   * A fulfillment hint only; category.id and secondary_category_ids remain the
   * primary industry/category matching fields.
   * @example "online_service"
   */
  offer_type?: OfferType;

  /** [REQUIRED] AON Taxonomy v1 category reference. */
  category: Category;

  /**
   * [OPTIONAL] Auxiliary AON Taxonomy v1 category ids.
   * Use these only for additional taxonomy meanings beyond the primary
   * offer_info.category.id. They participate in AON-owned category matching
   * and safety filtering, but do not replace the primary category.
   * Each secondary id must be from a different taxonomy branch than the primary
   * category and the other secondary ids; do not repeat parent/child category
   * relationships here.
   * maxItems: 5.
   * @example ["finance.investing.crypto_and_digital_assets"]
   */
  secondary_category_ids?: CategoryId[];

  /** [REQUIRED] Core semantic description for end-user display. maxLength: 5000. @example "Claude Pro provides advanced AI assistance with extended context windows, priority access, and team collaboration features." */
  description: string;

  /**
   * [OPTIONAL] Partner-supplied content matching tags.
   * Lightweight semantic hints that do not replace offer_info.category.id,
   * targeting, query filters, compliance policy, or guaranteed end-user display.
   * maxItems: 50; item maxLength: 80.
   * @example ["cashback", "travel rewards"]
   */
  tags?: string[];

  /**
   * [OPTIONAL] Partner-provided user-readable recommendation reason.
   * Consumers may choose to display this text; it must not contain internal
   * conversion metrics or operational-only notes.
   * maxLength: 1000.
   * @example "A convenient team workspace for projects that need docs, wikis, and planning in one place."
   */
  recommendation_reason?: string;

  /**
   * [OPTIONAL] User-facing aggregate rating. Display rating only; use a separate
   * score field for internal ranking or confidence semantics.
   */
  rating?: Rating;

  /**
   * [OPTIONAL] Ordered structured display properties for card highlights.
   * Distinct from tags, which remain matching hints.
   * maxItems: 6.
   */
  properties?: OfferProperty[];

  /** [RECOMMENDED] Pricing and commercial information. @example { "price": { "amount": "20.00", "currency": "USD", "unit": "month" }, "fulfillment_note": "Cancel anytime" } */
  commercial?: CommercialInfo;

  // [REMOVED in v0.2 (non-breaking, no GA consumers)] `source_offer_id` was
  // previously OPTIONAL upstream-source identifier. Removed in PROTO-F014a
  // (Offer Protocol ID Naming Convergence) because:
  //   - manual-source offers (source='manual') have no upstream and could
  //     never populate this field meaningfully;
  //   - adapter-source offers store the upstream id in the platform's
  //     `offers.adapter_offer_id` DB column (not part of the open protocol)
  //     and may also expose it via a future `source.*` sub-object if needed
  //     (out of scope for this Feature).

  /** [OPTIONAL] RFC 3339 timestamp for when the offer becomes active. @example "2026-04-01T00:00:00Z" */
  start_at?: string;

  /** [OPTIONAL] RFC 3339 timestamp for when the offer expires. @example "2026-12-31T23:59:59Z" */
  expire_at?: string;

  /** [OPTIONAL] Lifecycle status. Default: "pending". @example "active" */
  status?: OfferStatus;

  /** [OPTIONAL] Compliance audit status. Default: "waiting". @example "pass" */
  audit_status?: AuditStatus;

  /** [OPTIONAL] Exposure priority (0-100). Higher values take precedence. Default: 10. @example 50 */
  priority?: number;
}

/** @example "online_service" */
export type OfferType = 'physical_product' | 'digital_goods' | 'content' | 'online_service' | 'offline_service';

/** @example "active" */
export type OfferStatus = 'active' | 'paused' | 'pending' | 'rejected' | 'expired';

/** @example "pass" */
export type AuditStatus = 'waiting' | 'pass' | 'reject';

// ─── Category ───────────────────────────────────────────────────────────────────

/**
 * [REQUIRED] AON Taxonomy v1 category reference.
 * Registry membership is validated by scripts/validate-taxonomy-v1.mjs.
 * @see category-attributes.types.ts
 */
export type Category = OfferCategory;

export interface Rating {
  /** Rating value on a 0 to 5 display scale. multipleOf: 0.1. @example 4.6 */
  value: number;
  /** Optional number of ratings represented by the aggregate value. @example 128 */
  count?: number;
  /** Optional open-text rating source. Empty string is allowed. @example "partner_declared" */
  source?: string;
}

export interface OfferProperty {
  /**
   * Open semantic property key. The schema validates format only; recommended
   * property types may be documented separately but are not a closed enum.
   * pattern: ^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$.
   * @example "cashback"
   */
  type: string;
  /** Structured property value. String values maxLength: 100. @example 2 */
  value: string | number | boolean;
  /** Optional open unit string used with value. maxLength: 32. @example "%" */
  unit?: string;
  /**
   * Optional plain-text display template. Not an enum; only exact same-item
   * placeholders ${type}, ${value}, and ${unit} are valid after semantic validation.
   * maxLength: 120.
   * @example "Cashback ${value}${unit}"
   */
  display_pattern?: string;
}

/**
 * @example { "price": { "amount": "20.00", "currency": "USD", "unit": "month" }, "fulfillment_note": "Cancel anytime" }
 */
export interface CommercialInfo {
  /** @example { "amount": "20.00", "currency": "USD", "unit": "month" } */
  price?: Price;
  /** Display-ready transaction or fulfillment note. maxLength: 80. @example "Cancel anytime" */
  fulfillment_note?: string;
}

export interface Price {
  /** Decimal string representing the consumer-facing price amount. @example "20.00" */
  amount: string;
  /** ISO 4217 currency code. @example "USD" */
  currency: string;
  /** Optional pricing unit. Missing unit is interpreted as one_time without being materialized. @example "month" */
  unit?: PriceUnit;
}

/** @example "month" */
export type PriceUnit = 'one_time' | 'night' | 'day' | 'week' | 'month' | 'year';

// ─── Entity ─────────────────────────────────────────────────────────────────────

export interface Entity {
  /** [REQUIRED] Stable entity identifier. @example "ent_anthropic_001" */
  id: string;
  /** [REQUIRED] Display name. @example "Anthropic" */
  name: string;
  /** [OPTIONAL] Entity classification. @example "business" */
  type?: EntityType;
  /** [OPTIONAL] Short description. @example "AI safety company building reliable AI systems." */
  description?: string;
  /** [OPTIONAL] Official website. @example "https://www.anthropic.com" */
  website?: string;
  /** [OPTIONAL] Canonical merchant/entity logo for identity display. */
  logo?: EntityLogo;
}

/** @example "business" */
export type EntityType = 'business' | 'individual' | 'institution';

export interface EntityLogo {
  /** [REQUIRED] Stable public HTTP(S) URL of the entity logo image. */
  url: string;
  /** [OPTIONAL] Accessible text. Consumers may fall back to entity.name. */
  alt_text?: string;
}

// ─── Action ─────────────────────────────────────────────────────────────────────

/**
 * [REQUIRED] Primary executable action exposed by the offer.
 * Discriminated union: payload structure is constrained by type.
 */
export type OfferAction = WebRedirectAction | AppDeepLinkAction;

/** @example "web_redirect" */
export type ActionType = 'web_redirect' | 'app_deep_link';

/** @example "app_store" */
export type DestinationType = 'website' | 'app_store' | 'google_play' | 'apk' | 'agent' | 'others';

/** @example "purchase" */
export type ConsumerAction =
  | 'learn_more'
  | 'watch'
  | 'play'
  | 'listen'
  | 'install'
  | 'download'
  | 'registration'
  | 'sign_up'
  | 'subscribe'
  | 'purchase'
  | 'pay'
  | 'order'
  | 'apply'
  | 'submission'
  | 'start_trial'
  | 'read'
  | 'book'
  | 'claim'
  | 'redeem'
  | 'contact';

interface ActionCommon {
  /** [RECOMMENDED] Short user-facing action name (CTA text). maxLength: 80. @example "Start Free Trial" */
  name?: string;
  /** [RECOMMENDED] Main end-user action semantic for CTA fallback and consumer-owned analytics. @example "purchase" */
  consumer_action?: ConsumerAction;
  /** [OPTIONAL] Explanation of the action intent. maxLength: 300. @example "Redirects to Claude Pro sign-up page with a 14-day free trial." */
  description?: string;
  /** [OPTIONAL] Target-shape hints for UI/display. Non-empty and unique when present; order does not express priority. */
  destination_types?: DestinationType[];
}

/** @example { "type": "web_redirect", "payload": { "target": "https://claude.ai/upgrade?ref=aon" } } */
export interface WebRedirectAction extends ActionCommon {
  type: 'web_redirect';
  payload: {
    /** [REQUIRED] Destination URL. @example "https://claude.ai/upgrade?ref=aon" */
    target: string;
  };
}

/** @example { "type": "app_deep_link", "payload": { "target": "myapp://promo/123", "platform": "ios", "fallback_url": "https://apps.apple.com/app/myapp" } } */
export interface AppDeepLinkAction extends ActionCommon {
  type: 'app_deep_link';
  payload: {
    /** [REQUIRED] Deep link URI. @example "myapp://promo/123" */
    target: string;
    /** [OPTIONAL] Target platform. @example "ios" */
    platform?: 'ios' | 'android';
    /** [OPTIONAL] Fallback URL when app is not installed. @example "https://apps.apple.com/app/myapp" */
    fallback_url?: string;
  };
}


// ─── Material ───────────────────────────────────────────────────────────────────

/**
 * [RECOMMENDED] Creative asset item.
 * @example { "url": "https://cdn.example.com/offers/claude-pro-banner.png", "tag": "banner", "format": "image", "dimensions": "728x90" }
 */
export interface MaterialItem {
  /** [RECOMMENDED] URL to the creative asset. @example "https://cdn.example.com/offers/claude-pro-banner.png" */
  url?: string;
  /** [RECOMMENDED] Asset purpose tag (e.g. logo, banner, hero, thumbnail). @example "banner" */
  tag?: string;
  /** [RECOMMENDED] Asset format. @example "image" */
  format?: MaterialFormat;
  /** [OPTIONAL] Width x height dimension (e.g. 300x250, 728x90, 1920x1080). @example "728x90" */
  dimensions?: string;
  /** [OPTIONAL] Accessible replacement text for this creative asset. maxLength: 200. */
  alt_text?: string;
}

/** @example "image" */
export type MaterialFormat = 'image' | 'video' | 'html5';

// ─── Targeting ──────────────────────────────────────────────────────────────────

/**
 * @example { "geo": { "include": [{ "location_id": "2840" }, { "location_id": "21137" }] }, "eligibility": { "min_age": 18 }, "language": "en", "device_type": ["mobile", "desktop"], "os": ["ios", "android"] }
 */
export interface TargetingRule {
  /** @example { "include": [{ "location_id": "2840" }], "exclude": [{ "location_id": "21180" }] } */
  geo?: GeoTargeting;
  /** Viewer eligibility restrictions for this rule. @example { "min_age": 18 } */
  eligibility?: TargetingEligibility;
  /** BCP 47 language tag targeted by this offer rule. @example "en" */
  language?: string;
  /** @example ["mobile", "desktop"] */
  device_type?: DeviceType[];
  /** Target operating systems. @example ["ios", "android"] */
  os?: OsType[];
}

export interface GeoTargeting {
  /** Use either legacy country strings or structured location_id entries, not both in the same array. @example [{ "location_id": "2840" }, { "location_id": "21137" }] */
  include?: LegacyGeoCountryCode[] | GeoLocationEntry[];
  /** Exclude wins over include. @example [{ "location_id": "21180" }] */
  exclude?: LegacyGeoCountryCode[] | GeoLocationEntry[];
}

/** Legacy uppercase ISO 3166-1 alpha-2 country code, or ALL. @example "US" */
export type LegacyGeoCountryCode = string;

/** AON Location Registry v1 entry. `location_id` is Google Geo Target Criteria ID as a string. */
export interface GeoLocationEntry {
  /** @example "21137" */
  location_id: string;
}

export interface TargetingEligibility {
  /** Minimum verified viewer age required for this targeting rule. @example 18 */
  min_age?: number;
}

/** @example "mobile" */
export type DeviceType = 'mobile' | 'desktop' | 'tablet' | 'smart_tv';

/** Operating system for targeting. @example "ios" */
export type OsType = 'ios' | 'android' | 'windows' | 'macos' | 'linux';

// ─── Conversion Rule ────────────────────────────────────────────────────────────

/**
 * Rules for valid conversion events, attribution logic, and tracking windows.
 * @example { "click_window_hours": 720, "attribution_model": "last_click", "accepted_types": ["sale"], "dedup_strategy": "first" }
 */
export interface ConversionRule {
  /** Click attribution window in hours. Conversions within this window after a click are eligible for attribution. Default: 720. @example 720 */
  click_window_hours?: number;
  /** View-through attribution window in hours. Default: 0 (view-through attribution not supported). @example 0 */
  view_window_hours?: number;
  /** Attribution method. Default: "last_click". @example "last_click" */
  attribution_model?: 'last_click' | 'first_click';
  /** Accepted conversion types for this offer. @example ["sale"] */
  accepted_types?: ('sale' | 'lead' | 'install' | 'subscription' | 'trial' | 'custom')[];
  /** Deduplication strategy for multiple conversions from the same user. Default: "first". @example "first" */
  dedup_strategy?: 'first' | 'all' | 'highest';
  /** Minimum conversion amount, decimal string. Conversions below this threshold do not qualify. @example "10.00" */
  minimum_amount?: string;
}

// ─── Query Request ──────────────────────────────────────────────────────────────

/**
 * Structured query request for discovering offers via POST /v1/offers/query.
 * @example
 * {
 *   "request_id": "019414a0-8b2c-7d3e-a1b2-c3d4e5f60718",
 *   "timestamp": "2026-03-31T10:30:00Z",
 *   "placement_id": "plc_A1b2C3d4E5f6G7h8",
 *   "context": {
 *     "platform": { "name": "TravelBot", "version": "2.1.0", "channel": "telegram" },
 *     "session_id": "sess_abc123",
 *     "user_profile": { "user_pseudo_id": "viewer_xyz", "language": "en", "interests": ["travel", "hotels"] }
 *   },
 *   "intent": { "content": [{ "type": "input_text", "text": "Find me a hotel in Tokyo under $200/night" }] },
 *   "constraints": { "category_ids": ["travel_tourism"] },
 *   "pagination": { "limit": 10, "offset": 0 }
 * }
 */
export interface OfferQueryRequest {
  /** [OPTIONAL] Unique request identifier. UUIDv7 recommended. When omitted, the server generates one. @example "019414a0-8b2c-7d3e-a1b2-c3d4e5f60718" */
  request_id?: string;

  /** [OPTIONAL] RFC 3339 timestamp of the request. When omitted, the server uses the current time. @example "2026-03-31T10:30:00Z" */
  timestamp?: string;

  /** [OPTIONAL] When true, request is treated as test. Default: false. @example false */
  test_mode?: boolean;

  /** [OPTIONAL] Provider-neutral placement identifier for hosted placement routing. @example "plc_A1b2C3d4E5f6G7h8" */
  placement_id?: string;

  /** [REQUIRED] Contextual information about the requesting platform, session, and user. */
  context: QueryContext;

  /** [REQUIRED] The user's intent expressed as multimodal content. */
  intent: QueryIntent;

  /** [OPTIONAL] Deterministic eligibility constraints that narrow the result set before semantic ranking. */
  constraints?: QueryConstraints;

  /** [OPTIONAL] Pagination control. */
  pagination?: QueryPagination;
}

/**
 * @example { "platform": { "name": "TravelBot", "version": "2.1.0", "channel": "telegram" }, "session_id": "sess_abc123", "user_profile": { "user_pseudo_id": "viewer_xyz", "language": "en" } }
 */
export interface QueryContext {
  /**
   * [OPTIONAL] Information about the requesting platform or agent.
   * @example { "name": "TravelBot", "version": "2.1.0", "channel": "telegram" }
   */
  platform?: {
    /** @example "TravelBot" */
    name?: string;
    /** @example "2.1.0" */
    version?: string;
    /** @example "telegram" */
    channel?: string;
  };

  /** [OPTIONAL] Session identifier for grouping related queries. @example "sess_abc123" */
  session_id?: string;

  /** [OPTIONAL] Conversation or thread identifier within the session. @example "conv_42" */
  conversation_id?: string | number;

  /** [REQUIRED] User profile information for intent matching and targeting. */
  user_profile: UserProfile;
}

/**
 * @example { "user_pseudo_id": "viewer_xyz", "language": "en", "country": "US", "location_ids": ["1014221", "21137", "2840"], "verified_age_over": [18], "interests": ["travel", "hotels"], "device_info": { "device_type": "mobile", "os": "ios", "os_version": "18.2" } }
 */
export interface UserProfile {
  /** Pseudonymous viewer identifier. @example "viewer_xyz" */
  user_pseudo_id?: string;
  /** BCP 47 language tag for the end user. @example "en" */
  language?: string;
  /** Legacy user country for geo targeting. Uppercase ISO 3166-1 alpha-2 code. @example "US" */
  country?: string;
  /** Viewer location ids from AON Location Registry v1, most specific first when available. @example ["1014221", "21137", "2840"] */
  location_ids?: string[];
  /** Verified age thresholds the viewer satisfies. @example [18] */
  verified_age_over?: number[];
  /** User interest tags. May be empty array. @example ["travel", "hotels"] */
  interests?: string[];
  /**
   * [REQUIRED] Device information for targeting.
   * Use `other` values when the caller cannot determine the viewer environment.
   * @example { "device_type": "mobile", "os": "ios", "os_version": "18.2" }
   */
  device_info: {
    /** [REQUIRED] @example "mobile" */
    device_type: QueryDeviceType;
    /** [REQUIRED] @example "ios" */
    os: QueryOsType;
    /** @example "18.2" */
    os_version?: string;
    /** Optional raw or normalized user-agent string. Do not use as a stable identifier. @example "Mozilla/5.0" */
    user_agent?: string;
  };
}

/** Canonical viewer device type for Query context. @example "mobile" */
export type QueryDeviceType = 'desktop' | 'mobile' | 'tablet' | 'smart_tv' | 'other';

/** Canonical viewer operating system for Query context. @example "ios" */
export type QueryOsType =
  | 'ios'
  | 'android'
  | 'windows'
  | 'macos'
  | 'other';

/**
 * @example { "content": [{ "type": "input_text", "text": "Find me a hotel in Tokyo under $200/night" }] }
 */
export interface QueryIntent {
  /** [REQUIRED] Array of content items. At least one item required. */
  content: IntentContentItem[];
}

/**
 * @example { "type": "input_text", "text": "Find me a hotel in Tokyo under $200/night" }
 * @example { "type": "input_image", "image_url": "https://example.com/screenshot.png" }
 */
export interface IntentContentItem {
  /** [REQUIRED] Content type. @example "input_text" */
  type: 'input_text' | 'input_image';
  /** Text content (when type=input_text). @example "Find me a hotel in Tokyo under $200/night" */
  text?: string;
  /** Image URL (when type=input_image). @example "https://example.com/screenshot.png" */
  image_url?: string;
}

/**
 * @example { "category_ids": ["travel_tourism"] }
 *
 * Category constraints use AON Taxonomy v1 ids. Each id matches the selected
 * taxonomy node and all descendants.
 */
export interface QueryConstraints {
  /** Constrain by category id. OR logic with subtree matching. @example ["travel_tourism"] */
  category_ids?: CategoryId[];
}

/**
 * @example { "limit": 10, "offset": 0 }
 */
export interface QueryPagination {
  /** Number of offers to return. Min: 1, Max: 100, Default: 20. @example 10 */
  limit?: number;
  /** Number of offers to skip. Default: 0. @example 0 */
  offset?: number;
}

// ─── Query Response ─────────────────────────────────────────────────────────────

/**
 * Query response envelope.
 * @example { "request_id": "019414a0-9f4c-7e2d-b3a1-d5e6f7081234", "offers": [] }
 */
export interface OfferResponse {
  /** Echoes the request's `request_id` (UUIDv7) so the agent → AON → Partner chain shares one correlation id. Used to attribute downstream events (impression / click / conversion). @example "019414a0-9f4c-7e2d-b3a1-d5e6f7081234" */
  request_id: string;
  /** Ranked offer results, up to the requested limit. @example [] */
  offers: Offer[];
}

// ─── Legacy Aliases (deprecated) ────────────────────────────────────────────────

/**
 * @deprecated Use OfferQueryRequest instead. This flat query structure does not match
 * the protocol's structured query format (offer-query-schema-v0.2.json).
 */
export type OfferQuery = OfferQueryRequest;

export interface ConversionGoal { event: string; pricing: CpaPricing | CpsPricing; description?: string; }
export interface CpaPricing { model: 'cpa'; amount: string; currency: string; }
export interface CpsPricing { model: 'cps'; rate: string; }
