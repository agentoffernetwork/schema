export type CategoryId = string

export type OfferType =
  | "physical_product"
  | "digital_goods"
  | "content"
  | "online_service"
  | "offline_service"

export interface OfferV03 {
  offer_id: string
  offer_instance_id: string
  version: "3.0"
  content_language?: string
  offer_info: OfferInfoV03
  entity: EntityV03
  listing_source?: ListingSourceV03
  action: OfferActionV03
  material?: MaterialItemV03[]
  targeting?: TargetingRuleV03[]
  conversion_rule?: ConversionRuleV03
  claims?: ClaimV03[]
  match_reason?: string
  goals: ConversionGoalV03[]
}

export interface OfferInfoV03 {
  title: string
  offer_type?: OfferType
  category: { id: CategoryId }
  secondary_category_ids?: CategoryId[]
  description: string
  tags?: string[]
  rating?: { value?: number; count?: number; source?: string }
  properties?: DisplayPropertyV03[]
  recommendation_reason?: string
  commercial?: CommercialInfoV03
  start_at?: string
  expire_at?: string
  status?: "active" | "paused" | "pending" | "rejected" | "expired"
  audit_status?: "waiting" | "pass" | "reject"
  priority?: number
}

export interface EntityV03 {
  id: string
  name: string
  type?: "merchant" | "brand" | "provider" | "publisher" | "other"
  description?: string
  website?: string
  logo?: string
}

export interface ListingSourceV03 {
  kind: "platform" | "marketplace" | "merchant_site" | "official_site" | "other"
  name: string
  observed_at: string
}

export interface OfferActionV03 {
  type: "open_url" | "deep_link" | "open_app" | "custom"
  name?: string
  consumer_action?: "learn_more" | "buy" | "book" | "subscribe" | "download" | "claim" | "sign_up" | "open"
  description?: string
  destination_types?: Array<"web" | "app" | "phone" | "email">
  payload: { url: string }
}

export interface MaterialItemV03 {
  url: string
  tag?: string
  format: "image" | "video" | "html5"
  dimensions?: string
  alt_text?: string
}

export interface TargetingRuleV03 {
  geo?: { include?: LocationTargetV03[]; exclude?: LocationTargetV03[] }
  eligibility?: { min_age?: number }
  language?: string
  device_type?: Array<"mobile" | "desktop" | "tablet" | "smart_tv">
  os?: Array<"ios" | "android" | "windows" | "macos">
}

export interface LocationTargetV03 {
  location_id: string
}

export interface ConversionRuleV03 {
  click_window_hours?: number
  view_window_hours?: number
  attribution_model?: "last_click" | "first_click"
  dedup_strategy?: "first" | "all" | "highest"
  minimum_amount?: string
}

export interface ClaimV03 {
  kind: "advertiser_claim" | "user_benefit" | "availability"
  text: string
}

export interface DisplayPropertyV03 {
  type: string
  value: string | number | boolean
  unit?: string
  display_pattern?: string
}

export interface CommercialInfoV03 {
  price?: { amount: string; currency: string; unit?: "one_time" | "night" | "day" | "week" | "month" | "year" }
  fulfillment_note?: string
}

export interface ConversionGoalV03 {
  event: string
  pricing:
    | { model: "cpa"; amount: string; currency: string }
    | { model: "cps"; rate: string }
  description?: string
}
