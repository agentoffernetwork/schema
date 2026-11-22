import type { OfferType, GenericOfferV10, OfferV10, OfferInfoV10, FlightItineraryV10, CommercialInfoV10, CommercialPriceV10, CommercialQuoteV10 } from "./offer.types"
import type { PartnerOfferV10 } from "./offer-partner.types"

type AtLeastOne<T, Keys extends keyof T = keyof T> = Keys extends keyof T
  ? Required<Pick<T, Keys>> & Partial<Omit<T, Keys>>
  : never

export interface OfferQueryRequestV10 {
  request_id?: string
  timestamp?: string
  test_mode?: boolean
  placement_id?: string
  context: QueryContextV10
  intent: IntentV10
  constraints?: QueryConstraintsV10
  force_offer?: boolean
  response_options?: { thinking_mode?: boolean }
  /** Opt-in page control; there is no public `offset`. Sending it opts the response into `has_more` / `next_cursor`. */
  pagination?: QueryPaginationV10
}

export interface QueryPaginationV10 {
  /** Requested page size, integer 1–50; omitted selects the deployment default. */
  limit?: number
  /** Opaque token (1–2048 chars) copied unchanged from the previous response's `next_cursor`. Do not parse, construct, or concatenate it. */
  cursor?: string
}

/** Present only when the paired request carried `pagination`. `next_cursor` is required exactly when `has_more` is true. */
export type QueryPageStateV10 =
  | { has_more?: never; next_cursor?: never }
  | { has_more: true; next_cursor: string }
  | { has_more: false; next_cursor?: never }

export interface QueryContextV10 {
  platform?: { name?: string; version?: string; channel?: string }
  session?: { previous_request_id?: string; recent_topics?: string[] }
  session_id?: string
  conversation_id?: string | number
  user_profile?: QueryUserProfileV10
}

/** Optional viewer context for Offer targeting; `location_ids` wins over `country` when resolvable. */
export interface QueryUserProfileV10 {
  /** AON Location Registry ids, most specific first (1–10, numeric strings). */
  location_ids?: string[]
  /** Uppercase ISO 3166-1 alpha-2 country code. */
  country?: string
  /** Verified minimum viewer age (integer 13–120); a `min_age` rule fails only when this is below it. Omitted means age is not evaluated. */
  verified_age_over?: number
}

export interface IntentV10 {
  /** Non-empty array with at most one input_text item and four input_image items.
   * image_url accepts HTTP(S) URLs or data:image/<subtype>;base64,<data> URLs;
   * each base64 data payload supports at most 524288 characters, excluding the prefix.
   */
  content: Array<{ type: "input_text"; text: string } | { type: "input_image"; image_url: string }>
  provenance: "user_expressed" | "inferred_context"
  confidence?: number
  origin?: OriginV10[]
  signals?: QuerySignalsV10
  details?: FlightQueryProfileV10
}

export interface OriginV10 {
  kind: "offer" | "category" | "topic" | "query_helper"
  id: string
}

export interface QuerySignalsV10 {
  budget?: { min?: number; max: number; currency: string }
  purchase_stage?: "exploring" | "comparing" | "ready_to_buy"
  timeframe?: "now" | "this_week" | "this_month" | "later"
}

export interface QueryConstraintsV10 {
  category_ids?: string[]
  excluded_category_ids?: string[]
  /** OR within the array, AND across dimensions. Omitted preserves inference; nonempty overrides it; [] clears and suppresses it. */
  offer_types?: OfferType[]
  /** Final public source names: 1–160 code points, ASCII trim/case folding equality, no aliases. Raw duplicates invalid. Omitted preserves inference; nonempty overrides it; [] clears and suppresses it. */
  listing_source_names?: string[]
}

export type GenericOfferQueryResponseV10 = GenericOfferQueryResponseBodyV10 & QueryPageStateV10

export interface GenericOfferQueryResponseBodyV10 {
  request_id: string
  protocol_version: "1.0"
  language: string
  offers: GenericOfferV10[]
  alternative_offers?: AlternativeOfferV10[]
  engagement?: EngagementV10
  hooks?: HookV10[]
  empty_reason?: EmptyReasonV10
}

export interface AlternativeOfferV10 {
  basis: "regional_popularity"
  selection_reason: string
  offer: Omit<GenericOfferV10, "match_reason"> & { match_reason?: never }
}

export type EmptyReasonV10 =
  | "frequency_capped"
  | "below_relevance_threshold"
  | "scene_suppressed"
  | "no_material"
  | "consent_missing"

export interface EngagementV10 {
  refinements?: RefinementV10[]
  followup_topics?: FollowupTopicV10[]
}

export interface RefinementV10 {
  label: string
  query_helper: QueryHelperV10
  speak?: string
}

export interface FollowupTopicV10 {
  label: string
  basis: "category_complement" | "sequential_journey" | "problem_to_product" | "comparison_alternative" | "user_interest" | "seasonal"
  query_helper: QueryHelperV10
  confidence: number
}

export interface QueryHelperV10 {
  request_patch: QueryHelperRequestPatchV10
  origin?: OriginV10[]
}

export type QueryHelperRequestPatchV10 = AtLeastOne<{
  intent: { signals: AtLeastOne<QuerySignalsV10> }
  constraints: AtLeastOne<QueryConstraintsV10>
}>

export interface HookV10 {
  kind: "price_change" | "availability_change" | "eligibility_change" | "content_change"
  title: string
  description?: string
  subject_offer_id: string
  baseline_request_id: string
  query_helper?: QueryHelperV10
}

export interface FeedbackWatchesEnvelopeV10 {
  protocol_version: "1.0"
  target: { kind: "offer" | "category"; id: string }
  operation: "feedback" | "watch" | "unwatch"
  user_action: "explicit"
  idempotency_key: string
  feedback?: "dismissed" | "not_interested"
}

interface ProtocolErrorBaseV10 {
  message: string
  data: Record<string, never>
}
export type ProtocolErrorV10 = ProtocolErrorBaseV10 & (
  | { code: "BAD_REQUEST"; extra: Record<string, unknown> & { flight_search_error?: { kind: "invalid_query" | "unsupported_capability"; fields?: string[] } } }
  | { code: "INTERNAL_ERROR"; extra: Record<string, unknown> & { flight_search_error?: { kind: "upstream_failure"; fields?: string[] } } }
  | { code: "UNAUTHORIZED" | "FORBIDDEN" | "RATE_LIMITED"; extra: Record<string, unknown> & { flight_search_error?: never } }
)

/** Provider requests never carry Query pagination; AON owns paging across Provider results. */
export type OfferProviderRequestV10 = Omit<OfferQueryRequestV10, "pagination"> & { request_id: string; pagination?: never }
export interface GenericOfferProviderSuccessV10 {
  request_id: string
  protocol_version: "1.0"
  language: string
  offers: PartnerOfferV10[]
  flight_search?: never
}

export type OfferProviderResponseV10 = OfferProviderSuccessV10 | ProtocolErrorV10


export type FlightQueryKindV10 = "reference_search" | "traveler_quote"
export type FlightQuoteTravelerV10 =
  | { type: "adult"; count: number; ages?: number[]; infant_seat_required?: never }
  | { type: "child"; count: number; ages: number[]; infant_seat_required?: never }
  | { type: "infant"; count: number; ages: number[]; infant_seat_required: boolean[] }

export interface FlightQueryLocationV10 {
  kind: "airport" | "city"
  code: string
}
export interface FlightQueryConstraintsV10 {
  legs: Array<{ origin: FlightQueryLocationV10; destination: FlightQueryLocationV10; departure_date: string }>
  /** Two-character uppercase IATA marketing airline code required on every segment across all legs. */
  airLine?: string
  cabin_class?: "economy" | "premium_economy" | "business" | "first"
  max_connections?: number
  /** When true, each leg must contain exactly one segment, regardless of stops. */
  nonstop_only?: boolean
}
export type FlightQueryProfileV10 = {
  profile: "flight"
  data: FlightQueryConstraintsV10 & (
    | { query_kind: "reference_search"; travelers?: never }
    | { query_kind: "traveler_quote"; travelers: FlightQuoteTravelerV10[] }
  )
}
export interface FlightSearchV10 {
  query_kind: FlightQueryKindV10
  status: "complete" | "partial"
  fetched_at: string
}
export type FlightSearchErrorV10 = {
  kind: "invalid_query" | "unsupported_capability" | "upstream_failure"
  fields?: string[]
}

type FlightQueryPriceV10 = Omit<CommercialPriceV10, "unit" | "tax_status"> & {
  unit?: "one_time"
  tax_status: NonNullable<CommercialPriceV10["tax_status"]>
}
type FlightQueryCommercialV10 = Omit<CommercialInfoV10, "price" | "quote"> & { price: FlightQueryPriceV10 }
type FlightQueryOfferInfoV10 = Omit<OfferInfoV10, "details" | "commercial"> & (
  | {
    details: { profile: "flight"; data: FlightItineraryV10 & { price_basis: "reference"; travelers?: never } }
    commercial: FlightQueryCommercialV10 & { quote?: CommercialQuoteV10 }
  }
  | {
    details: { profile: "flight"; data: FlightItineraryV10 & { price_basis: "itinerary_total"; travelers: FlightQuoteTravelerV10[] } }
    commercial: FlightQueryCommercialV10 & { quote: CommercialQuoteV10 }
  }
)
export type FlightQueryOfferV10 = Omit<OfferV10, "offer_info"> & { offer_info: FlightQueryOfferInfoV10 }
export type FlightQueryPartnerOfferV10 = Omit<PartnerOfferV10, "offer_info"> & {
  offer_id?: never
  offer_instance_id?: never
  match_reason?: never
  offer_info: FlightQueryOfferInfoV10 & { commercial: { display_price?: never } }
}
export type FlightOfferQueryResponseV10 = Omit<GenericOfferQueryResponseBodyV10, "offers" | "alternative_offers" | "empty_reason"> & QueryPageStateV10 & {
  offers: FlightQueryOfferV10[]
  alternative_offers?: never
  empty_reason?: never
}
export type OfferQueryResponseV10 = GenericOfferQueryResponseV10 | FlightOfferQueryResponseV10
export type FlightOfferProviderSuccessV10 = Omit<GenericOfferProviderSuccessV10, "offers" | "flight_search"> & {
  offers: FlightQueryPartnerOfferV10[]
  flight_search: FlightSearchV10
}
export type OfferProviderSuccessV10 = GenericOfferProviderSuccessV10 | FlightOfferProviderSuccessV10
/** Portable protocol errors only; deployment-specific hosted errors use the deployment contract. */
export type OfferQueryErrorV10 = ProtocolErrorV10
