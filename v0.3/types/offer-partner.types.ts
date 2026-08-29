import type { OfferV03 } from "./offer-v0.3.types"

type AtLeastOne<T, Keys extends keyof T = keyof T> = Keys extends keyof T
  ? Required<Pick<T, Keys>> & Partial<Omit<T, Keys>>
  : never

type NonEmptyArray<T> = [T, ...T[]]

export interface PartnerOfferV03 extends Omit<OfferV03, "offer_id" | "offer_instance_id" | "match_reason"> {
  source_offer_id: string
  targeting?: NonEmptyArray<TargetingRuleV03>
  conversion_rule?: ConversionRuleV03
}

export type TargetingRuleV03 = AtLeastOne<{
  geo: AtLeastOne<{ include: NonEmptyArray<LocationTargetV03>; exclude: NonEmptyArray<LocationTargetV03> }>
  eligibility: { min_age: number }
  language: string
  device_type: NonEmptyArray<"mobile" | "desktop" | "tablet" | "smart_tv">
  os: NonEmptyArray<"ios" | "android" | "windows" | "macos">
}>

export interface LocationTargetV03 {
  location_id: string
}

export type ConversionRuleV03 = AtLeastOne<{
  click_window_hours: number
  view_window_hours: number
  attribution_model: "last_click" | "first_click"
  dedup_strategy: "first" | "all"
  minimum_amount: string
}>
