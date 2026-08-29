import type { OfferV10 } from "./offer-v1.0.types"
import type { PartnerOfferV10 } from "./offer-partner-v1.0.types"

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
}

export interface QueryContextV10 {
  platform?: { name?: string; version?: string; channel?: string }
  session?: { previous_request_id?: string; recent_topics?: string[] }
  session_id?: string
  conversation_id?: string | number
}

export interface IntentV10 {
  content: Array<{ type: "input_text"; text: string } | { type: "input_image"; image_url: string }>
  provenance: "user_expressed" | "inferred_context"
  confidence?: number
  origin?: OriginV10[]
  signals?: QuerySignalsV10
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
}

export interface OfferQueryResponseV10 {
  request_id: string
  protocol_version: "1.0"
  language: string
  offers: OfferV10[]
  engagement?: EngagementV10
  hooks?: HookV10[]
  empty_reason?: EmptyReasonV10
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

export interface ProtocolErrorV10 {
  code: "BAD_REQUEST" | "UNAUTHORIZED" | "FORBIDDEN" | "RATE_LIMITED" | "INTERNAL_ERROR"
  message: string
  data: Record<string, never>
  extra: Record<string, unknown>
}

export type OfferProviderRequestV10 = OfferQueryRequestV10 & { request_id: string }
export interface OfferProviderSuccessV10 {
  request_id: string
  protocol_version: "1.0"
  language: string
  offers: PartnerOfferV10[]
}

export type OfferProviderResponseV10 = OfferProviderSuccessV10 | ProtocolErrorV10
