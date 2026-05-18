/**
 * AgentOffer Offer Schema v0.1
 * TypeScript type definitions
 *
 * Generated from the authoritative JSON Schema files:
 *   - offer-schema-v0.1.json
 *   - offer-query-schema-v0.1.json
 *
 * Fields are annotated with requirement levels per RFC 2119:
 *   REQUIRED — Field MUST be present with a valid, non-empty value.
 *   RECOMMENDED — Field SHOULD be present and follow the standard structure; value MAY be empty or null.
 *   OPTIONAL — Field MAY be omitted entirely.
 *
 * @see https://agentoffernetwork.org/schema/offer/v0.1
 */

import type { CategoryType, CategoryAttributes } from './category-attributes.types';

export type { CategoryType, CategoryAttributes };

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
   * settlement attribution pipeline. The same value is carried in:
   *   - landing-page URL query param: `?aon_tracking_id={offer_instance_id}`
   *   - S2S postback body: `aon_tracking_id={offer_instance_id}`
   *   - events.md `click_event` / `conversion_event`: the `aon_tracking_id`
   *     field (see PROTO-F014b for the events/postback rename).
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
  version: string;

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

  /** [REQUIRED] Affiliate bid and payout information. */
  bid: Bid;

  /** [RECOMMENDED] Rules for valid conversion events, attribution windows, and dedup logic. SHOULD be present to establish clear attribution expectations. */
  conversion_rule?: ConversionRule;

}

// ─── OfferInfo ──────────────────────────────────────────────────────────────────

/** [REQUIRED] Core offer information. */
export interface OfferInfo {
  /** [REQUIRED] Display-ready title. maxLength: 200. @example "Claude Pro — AI Assistant for Teams" */
  title: string;

  /**
   * [REQUIRED] Offer fulfillment form — how the offer is delivered to the end user.
   * Determines Agent-side UX behavior: physical_product → shipping/returns flow,
   * content → instant access, online_service → signup/subscription flow,
   * offline_service → location/booking flow.
   * Orthogonal to category.type (industry classification).
   * @example "online_service"
   */
  offer_type: OfferType;

  /** [REQUIRED] Industry category and vertical-specific attributes. */
  category: Category;

  /** [REQUIRED] Core semantic description for end-user display. maxLength: 5000. @example "Claude Pro provides advanced AI assistance with extended context windows, priority access, and team collaboration features." */
  description: string;

  /**
   * [OPTIONAL] Partner-provided recommendation reason for AON ranking engine.
   * Contains conversion advantages, target audience hints, and promotional context
   * that help core make better ranking decisions. Not shown to end users.
   * maxLength: 1000.
   * @example "New user first month 90% off, 15% conversion rate among developers, strong retention after trial"
   */
  recommendation_reason?: string;

  /** [RECOMMENDED] Pricing, availability, and inventory information. @example { "price": { "amount": "20.00", "currency": "USD" }, "availability": "available" } */
  commercial?: CommercialInfo;

  // [REMOVED in v0.1 (non-breaking, no GA consumers)] `source_offer_id` was
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
 * [REQUIRED] Industry category with vertical-specific attributes.
 * Type-safe: `attributes` structure is constrained by `type` via the CategoryAttributes discriminated union.
 * @see category-attributes.types.ts for per-type attribute definitions.
 */
export type Category = CategoryAttributes;

/**
 * @example { "price": { "amount": "20.00", "currency": "USD" } }
 */
export interface CommercialInfo {
  /** @example { "amount": "20.00", "currency": "USD" } */
  price?: Price;
}

export interface Price {
  /** Decimal string representing the consumer-facing price amount. @example "20.00" */
  amount: string;
  /** ISO 4217 currency code. @example "USD" */
  currency: string;
}

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
}

/** @example "business" */
export type EntityType = 'business' | 'individual' | 'institution';

// ─── Action ─────────────────────────────────────────────────────────────────────

/**
 * [REQUIRED] Primary executable action exposed by the offer.
 * Discriminated union: payload structure is constrained by type.
 */
export type OfferAction = WebRedirectAction | AppDeepLinkAction;

/** @example "web_redirect" */
export type ActionType = 'web_redirect' | 'app_deep_link';

interface ActionCommon {
  /** [RECOMMENDED] Short user-facing action name (CTA text). maxLength: 80. @example "Start Free Trial" */
  name?: string;
  /** [OPTIONAL] Explanation of the action intent. maxLength: 300. @example "Redirects to Claude Pro sign-up page with a 14-day free trial." */
  description?: string;
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
}

/** @example "image" */
export type MaterialFormat = 'image' | 'video' | 'html5';

// ─── Targeting ──────────────────────────────────────────────────────────────────

/**
 * @example { "geo": { "include": ["US", "GB", "CA"] }, "language": "en", "device_type": ["mobile", "desktop"], "os": ["ios", "android"] }
 */
export interface TargetingRule {
  /** @example { "include": ["US", "GB", "CA"], "exclude": ["CN"] } */
  geo?: GeoTargeting;
  /** ISO 639-1 language code. @example "en" */
  language?: string;
  /** @example ["mobile", "desktop"] */
  device_type?: DeviceType[];
  /** Target operating systems. @example ["ios", "android"] */
  os?: OsType[];
}

export interface GeoTargeting {
  /** @example ["US", "GB", "CA"] */
  include?: string[];
  /** @example ["CN"] */
  exclude?: string[];
}

/** @example "mobile" */
export type DeviceType = 'mobile' | 'desktop' | 'tablet' | 'smart_tv';

/** Operating system for targeting. @example "ios" */
export type OsType = 'ios' | 'android' | 'windows' | 'macos' | 'linux';

// ─── Bid ────────────────────────────────────────────────────────────────────────

/**
 * Affiliate bid and payout information.
 * Partner provides the determined bid amount at offer time.
 *
 * @example { "model": "cpa", "amount": "15.00", "currency": "USD" }
 * @example { "model": "cps", "amount": "8.00", "currency": "USD" }
 */
export interface Bid {
  /** [REQUIRED] Bid model (for display purposes). @example "cpa" */
  model: BidModel;

  /** [REQUIRED] Determined bid amount, decimal string. @example "15.00" */
  amount: string;

  /** [REQUIRED] ISO 4217 currency code. @example "USD" */
  currency: string;
}

/** @example "cpa" */
export type BidModel = 'cpa' | 'cps' | 'cpl' | 'cpi' | 'hybrid';

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
  /** Minimum conversion amount, decimal string. Conversions below this threshold do not qualify for bid. @example "10.00" */
  minimum_amount?: string;
}

// ─── Query Request ──────────────────────────────────────────────────────────────

/**
 * Structured query request for discovering offers via POST /v1/offers/query.
 * @example
 * {
 *   "request_id": "019414a0-8b2c-7d3e-a1b2-c3d4e5f60718",
 *   "timestamp": "2026-03-31T10:30:00Z",
 *   "context": {
 *     "platform": { "name": "TravelBot", "version": "2.1.0", "channel": "telegram" },
 *     "session_id": "sess_abc123",
 *     "user_profile": { "user_pseudo_id": "viewer_xyz", "language": "en", "interests": ["travel", "hotels"] }
 *   },
 *   "intent": { "content": [{ "type": "input_text", "text": "Find me a hotel in Tokyo under $200/night" }] },
 *   "constraints": { "category_types": ["travel_hospitality"] },
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
 * @example { "user_pseudo_id": "viewer_xyz", "language": "en", "country": "SG", "interests": ["travel", "hotels"], "device_info": { "device_type": "mobile", "os": "ios", "os_version": "18.2" } }
 */
export interface UserProfile {
  /** Pseudonymous viewer identifier. @example "viewer_xyz" */
  user_pseudo_id?: string;
  /** User language preference. ISO 639-1 code. @example "en" */
  language?: string;
  /** User country for geo targeting. ISO 3166-1 alpha-2 code. @example "SG" */
  country?: string;
  /** User interest tags. May be empty array. @example ["travel", "hotels"] */
  interests?: string[];
  /**
   * Device information for targeting.
   * @example { "device_type": "mobile", "os": "ios", "os_version": "18.2" }
   */
  device_info?: {
    /** @example "mobile" */
    device_type?: string;
    /** @example "ios" */
    os?: string;
    /** @example "18.2" */
    os_version?: string;
  };
}

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
 * @example { "category_types": ["travel_hospitality"] }
 *
 * The first public constraints surface only exposes category_types.
 */
export interface QueryConstraints {
  /** Constrain by category type. OR logic: matches any specified type. @example ["travel_hospitality"] */
  category_types?: CategoryType[];
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
 * the protocol's structured query format (offer-query-schema-v0.1.json).
 */
export type OfferQuery = OfferQueryRequest;
