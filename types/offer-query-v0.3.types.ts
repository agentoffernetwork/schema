import type { OfferV03 } from "./offer-v0.3.types"

export interface OfferQueryRequestV03 {
  request_id?: string
  timestamp?: string
  test_mode?: boolean
  placement_id?: string
  context: QueryContextV03
  intent: IntentV03
  constraints?: QueryConstraintsV03
  force_offer?: boolean
  response_options?: { thinking_mode?: boolean }
}

export interface QueryContextV03 {
  platform?: { name?: string; version?: string; channel?: string }
  session?: { previous_request_id?: string; recent_topics?: string[] }
  session_id?: string
  conversation_id?: string | number
}

export interface IntentV03 {
  content: Array<{ type: "input_text"; text: string } | { type: "input_image"; image_url: string }>
  provenance: "user_expressed" | "inferred_context"
  confidence?: number
  origin?: OriginV03[]
  signals?: QuerySignalsV03
}

export interface OriginV03 {
  kind: "offer" | "category" | "topic" | "query_helper"
  id: string
}

export interface QuerySignalsV03 {
  budget?: { min?: number; max: number; currency: string }
  purchase_stage?: "exploring" | "comparing" | "ready_to_buy"
  timeframe?: "now" | "this_week" | "this_month" | "later"
}

export interface QueryConstraintsV03 {
  category_ids?: string[]
  excluded_category_ids?: string[]
  features?: string[]
}

export interface OfferQueryResponseV03 {
  request_id: string
  protocol_version: "0.3"
  language: string
  offers: OfferV03[]
  engagement?: EngagementV03
  hooks?: HookV03[]
  empty_reason?: EmptyReasonV03
}

export type EmptyReasonV03 =
  | "frequency_capped"
  | "below_relevance_threshold"
  | "scene_suppressed"
  | "no_material"
  | "consent_missing"

export interface EngagementV03 {
  refinements?: RefinementV03[]
  followup_topics?: FollowupTopicV03[]
}

export interface RefinementV03 {
  label: string
  query_helper: QueryHelperV03
  speak?: string
}

export interface FollowupTopicV03 {
  label: string
  basis: "category_complement" | "sequential_journey" | "problem_to_product" | "comparison_alternative" | "user_interest" | "seasonal"
  query_helper: QueryHelperV03
  confidence: number
}

export interface QueryHelperV03 {
  request_patch: {
    intent?: { signals?: QuerySignalsV03 | null }
    constraints?: QueryConstraintsV03 | null
  }
  origin?: OriginV03[]
}

export interface HookV03 {
  kind: "price_change" | "availability_change" | "eligibility_change" | "content_change"
  title: string
  description?: string
  query_helper?: QueryHelperV03
}

export interface FeedbackWatchesEnvelopeV03 {
  protocol_version: "0.3"
  target: { kind: "offer" | "category"; id: string }
  operation: "feedback" | "watch" | "unwatch"
  user_action: "explicit"
  idempotency_key: string
  feedback?: "dismissed" | "not_interested"
}

export interface ProtocolErrorV03 {
  code: "BAD_REQUEST" | "UNAUTHORIZED" | "FORBIDDEN" | "RATE_LIMITED" | "INTERNAL_ERROR"
  message: string
  data: Record<string, never>
  extra: Record<string, unknown>
}

export type OfferProviderRequestV03 = OfferQueryRequestV03 & { request_id: string }
export type OfferProviderResponseV03 = OfferQueryResponseV03 | ProtocolErrorV03
