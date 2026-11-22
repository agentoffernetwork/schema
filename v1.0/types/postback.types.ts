import type { GoalEventNameV10 } from './goal-event-name.types'

export type { GoalEventNameV10 } from './goal-event-name.types'

/**
 * @deprecated Retired JSON body lane (2026-10-08). The current Provider binding
 * is `GET /v1/postback/{partner_id}` with query parameters (postback-v1.0.md §2.3).
 */
export type ProviderPostbackAttributionV10 =
  | { aon_click_id: string; aon_tracking_id?: never; offer_instance_id?: never }
  | { aon_click_id?: never; aon_tracking_id: string; offer_instance_id?: never }
  | { aon_click_id?: never; aon_tracking_id?: never; offer_instance_id: string }

/** Runtime/schema-validated decimal string with exactly six fractional digits. */
export type AgentWebhookAmountV10 = string

export type RevenueFactsV10 =
  | { amount: string; currency: string }
  | { amount?: never; currency?: never }

/** Current GET query: actual publisher commission is independent of sales revenue. */
export type ActualCommissionFactsV10 =
  | { commission_amount: string; commission_currency: string }
  | { commission_amount?: never; commission_currency?: never }

export type ProviderPostbackQueryV10 = ProviderPostbackAttributionV10 & RevenueFactsV10 & ActualCommissionFactsV10 & {
  event_name: GoalEventNameV10
  event_time?: string
  event_id?: string
  order_id?: string
  partner_txn_id?: string
  action?: "conversion" | "confirm" | "reversal"
  reason?: string
}

/** @deprecated Retired JSON body lane; see ProviderPostbackAttributionV10. */
export type ProviderPostbackPayloadV10 = ProviderPostbackAttributionV10 & RevenueFactsV10 & {
  event_name: GoalEventNameV10
  event_id?: string
  order_id?: string
  partner_txn_id?: string
}

export type AgentConversionWebhookPayloadV10 = {
  event_id: string
  event_type: "conversion"
  /** Opaque AON click id beginning with `aci_`; omitted when the conversion has no attributed click. Treat as opaque. */
  aon_click_id?: string
  /** AON-issued Offer delivery id (the Query/MCP `offer_instance_id`, same value as the `aon_tracking_id` macro). Not unique: never an idempotency key. Opaque string; omitted when absent, never null. */
  offer_instance_id?: string
  offer_id: string
  application_id: string
  /** Omitted when the conversion has no placement. */
  placement_id?: string
  event_name: GoalEventNameV10
  /** Developer expected net earning in USD as a signed decimal string with exactly six fractional digits; 0 when non-billable. */
  amount: AgentWebhookAmountV10
  currency: "USD"
  sub_id?: string
  sub_id_2?: string
  sub_id_3?: string
  sub_id_4?: string
  sub_id_5?: string
  timestamp: string
}

export type ProviderPostbackResultV10 = "accepted" | "already_recorded" | "unmapped" | "reversed" | "already_reversed" | "acknowledged" | "already_acknowledged" | "disputed" | "already_disputed" | "rejected" | "retry"

export interface ProviderPostbackResponseV10 {
  result: ProviderPostbackResultV10
  event_logged: boolean
  reason: string | null
  correlation_id: string
  retryable: boolean
  /** Present for `acknowledged` / `already_acknowledged` (RFC 3339). */
  acknowledged_at?: string
  /** Present for `acknowledged` / `already_acknowledged`: `postback`, `portal` or `statement`. */
  acknowledged_source?: string
  /** Present for `disputed` / `already_disputed`. */
  dispute_id?: string
}

/** Provider postback `action` values; absent means `conversion`. */
export type ProviderPostbackActionV10 = "conversion" | "reversal" | "confirm"

export interface ProviderPostbackErrorExtraV10 {
  result: "rejected" | "retry"
  reason: string
  correlation_id: string
  retryable: boolean
  event_logged: boolean
}

/** Rejection codes never contain operator free text. */
export type EarningRejectionReasonV10 = "merchant_cancelled" | "duplicate" | "invalid_order" | "fraud" | "returned" | "reversed" | "refund"

export type AgentEarningWebhookPayloadV10 = {
  /** earning: followed by the immutable outbox UUID. */
  event_id: string
  /** Settlement UUID, identical to the Earnings API id. */
  earning_id: string
  /** Positive integer; compare only within one earning_id, never by timestamp. */
  sequence: number
  conversion_event_id: string
  /** The originating conversion's `offer_instance_id` (delivery id). Not unique: never an idempotency key. Omitted when absent, never null. */
  offer_instance_id?: string
  offer_id: string
  application_id: string
  placement_id?: string
  amount: AgentWebhookAmountV10
  currency: "USD"
  /** Attribution slots of the originating conversion, rendered by the conversion-event rule (trimmed; omitted when empty, never null). */
  sub_id?: string
  sub_id_2?: string
  sub_id_3?: string
  sub_id_4?: string
  sub_id_5?: string
  timestamp: string
} & (
  | { event_type: "earning_confirmed"; reason?: never }
  | { event_type: "earning_available"; reason?: never }
  | { event_type: "earning_paid_out"; reason?: never }
  | { event_type: "earning_rejected"; reason: EarningRejectionReasonV10 }
)

export type AgentWebhookPayloadV10 = AgentConversionWebhookPayloadV10 | AgentEarningWebhookPayloadV10

/**
 * Exact AON-to-Agent webhook request body: one delivery envelope per HTTP request.
 * `AgentWebhookPayloadV10` above is one element of `events`, not the request body.
 */
export type AgentWebhookEnvelopeV10 = {
  /**
   * Opaque identifier of this HTTP request (1-64 characters of `[A-Za-z0-9_-]`). AON generates a
   * new value for every request, including every retry. For troubleshooting only: never an
   * idempotency key. Deduplicate each event by `(application_id, event_id)`.
   */
  delivery_id: string
  /**
   * 1 to 100 event objects for one Developer Application. Handle each element by its own
   * `event_type`; elements may differ in `event_type` and carry no ordering guarantee.
   */
  events: AgentWebhookPayloadV10[]
}
