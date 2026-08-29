import type { OfferV10 } from "./offer-v1.0.types"

type AtLeastOne<T, Keys extends keyof T = keyof T> = Keys extends keyof T
  ? Required<Pick<T, Keys>> & Partial<Omit<T, Keys>>
  : never

type NonEmptyArray<T> = [T, ...T[]]

export interface PartnerOfferV10 extends Omit<OfferV10, "offer_id" | "offer_instance_id" | "match_reason"> {
  source_offer_id: string
  targeting?: NonEmptyArray<TargetingRuleV10>
  conversion_rule?: ConversionRuleV10
}

export type TargetingRuleV10 = AtLeastOne<{
  geo: AtLeastOne<{ include: NonEmptyArray<LocationTargetV10>; exclude: NonEmptyArray<LocationTargetV10> }>
  eligibility: { min_age: number }
  language: string
  device_type: NonEmptyArray<"mobile" | "desktop" | "tablet" | "smart_tv">
  os: NonEmptyArray<"ios" | "android" | "windows" | "macos">
}>

export interface LocationTargetV10 {
  location_id: string
}

export type ConversionRuleV10 = AtLeastOne<{
  click_window_hours: number
  view_window_hours: number
  attribution_model: "last_click" | "first_click"
  dedup_strategy: "first" | "all"
  minimum_amount: string
}>
