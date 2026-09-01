import type { GoalEventNameV10 } from "./goal-event-name.types"

export type CategoryId = string

export type OfferType =
  | "physical_product"
  | "digital_goods"
  | "content"
  | "online_service"
  | "offline_service"

export interface OfferV10 {
  offer_id: string
  offer_instance_id: string
  version: "3.0"
  content_language?: string
  offer_info: OfferInfoV10
  entity: EntityV10
  listing_source?: ListingSourceV10
  action: OfferActionV10
  material?: MaterialItemV10[]
  claims?: ClaimV10[]
  match_reason?: string
  goals: ConversionGoalV10[]
}

export interface OfferInfoV10 {
  title: string
  short_description?: string
  offer_type?: OfferType
  category: { id: CategoryId }
  secondary_category_ids?: CategoryId[]
  description: string
  tags?: string[]
  rating?: { value: number; count?: number; source?: string }
  properties?: DisplayPropertyV10[]
  recommendation_reason?: string
  commercial?: CommercialInfoV10
  start_at?: string
  expire_at?: string
}

export interface EntityV10 {
  id: string
  name: string
  type?: "merchant" | "brand" | "provider" | "publisher" | "other"
  description?: string
  website?: string
  logo?: string
}

export interface ListingSourceV10 {
  kind: "platform" | "marketplace" | "merchant_site" | "official_site" | "other"
  name: string
  observed_at: string
  logo?: string
}

export interface OfferActionV10 {
  type: "open_url" | "deep_link" | "open_app" | "custom"
  name?: string
  consumer_action?: "learn_more" | "buy" | "book" | "subscribe" | "download" | "claim" | "sign_up" | "open"
  description?: string
  destination_types?: Array<"web" | "app" | "phone" | "email">
  payload: { url: string }
}

export interface MaterialItemV10 {
  url: string
  tag?: string
  format: "image" | "video" | "html5"
  dimensions?: string
  alt_text?: string
}

export interface ClaimV10 {
  kind: "advertiser_claim" | "user_benefit" | "availability"
  text: string
}

export interface DisplayPropertyV10 {
  type: string
  value: string | number | boolean
  unit?: string
  display_pattern?: string
}

export interface CommercialInfoV10 {
  price?: { amount: string; currency: string; unit?: "one_time" | "night" | "day" | "week" | "month" | "year" }
  fulfillment_note?: string
}

export interface ConversionGoalV10 {
  event: GoalEventNameV10
  pricing:
    | { model: "cpa"; amount: string; currency: string }
    | { model: "cps"; rate: string }
  description?: string
}
