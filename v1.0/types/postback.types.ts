import type { GoalEventNameV10 } from './goal-event-name-v1.0.types'

export type { GoalEventNameV10 } from './goal-event-name-v1.0.types'

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
  event_name: GoalEventNameV10
  aon_tracking_id: string
  offer_id: string
  agent_id: string
  timestamp: string
  sub_id?: string
  sub_id_2?: string
  sub_id_3?: string
  sub_id_4?: string
  sub_id_5?: string
} & ({ amount: number; currency: string } | { amount?: never; currency?: never })

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
