import type { GoalEventNameV10 } from './goal-event-name.types'

export type { GoalEventNameV10 } from './goal-event-name.types'

export type ProviderPostbackAttributionV10 =
  | { aon_click_id: string; aon_tracking_id?: never; offer_instance_id?: never }
  | { aon_click_id?: never; aon_tracking_id: string; offer_instance_id?: never }
  | { aon_click_id?: never; aon_tracking_id?: never; offer_instance_id: string }

export type RevenueFactsV10 =
  | { amount: string; currency: string }
  | { amount?: never; currency?: never }

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
  offer_id: string
  application_id: string
  /** Omitted when the conversion has no placement. */
  placement_id?: string
  event_name: GoalEventNameV10
  /** Developer expected net earning in USD (commission minus platform fee, frozen FX, 2 decimals); 0 when non-billable. */
  amount: number
  currency: "USD"
  sub_id?: string
  sub_id_2?: string
  sub_id_3?: string
  sub_id_4?: string
  sub_id_5?: string
  timestamp: string
}

export type ProviderPostbackResultV10 = "accepted" | "already_recorded" | "unmapped" | "rejected" | "retry"

export interface ProviderPostbackResponseV10 {
  result: ProviderPostbackResultV10
  event_logged: boolean
  reason: string | null
  correlation_id: string
  retryable: boolean
}

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
  offer_id: string
  application_id: string
  placement_id?: string
  amount: number
  currency: "USD"
  timestamp: string
} & (
  | { event_type: "earning_confirmed"; reason?: never }
  | { event_type: "earning_available"; reason?: never }
  | { event_type: "earning_paid_out"; reason?: never }
  | { event_type: "earning_rejected"; reason: EarningRejectionReasonV10 }
)

export type AgentWebhookPayloadV10 = AgentConversionWebhookPayloadV10 | AgentEarningWebhookPayloadV10
