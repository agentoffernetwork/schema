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
  details?: SupplyOfferDetailsV10
  start_at?: string
  expire_at?: string
}

export type SupplyOfferDetailsV10 = FlightOfferDetailsV10 | HotelRateOfferDetailsV10

export interface FlightOfferDetailsV10 {
  profile: "flight"
  data: FlightOfferDataV10
}

export interface FlightOfferDataV10 {
  trip_type: "one_way" | "round_trip" | "multi_city"
  travelers: Array<{ type: "adult" | "child" | "infant"; count: number }>
  legs: Array<{
    segments: Array<{
      departure: FlightEndpointV10
      arrival: FlightEndpointV10
      duration_minutes: number
      marketing_carrier: { code: string }
      flight_number: string
      cabin_class: "economy" | "premium_economy" | "business" | "first"
    }>
  }>
}

export interface FlightEndpointV10 {
  airport_code: string
  local_at: string
}

export interface HotelRateOfferDetailsV10 {
  profile: "hotel_rate"
  data: HotelRateOfferDataV10
}

export interface HotelRateOfferDataV10 {
  rate: { kind: "reference_starting_nightly" }
  property: HotelPropertyV10
  stay?: HotelStayV10
  room?: HotelRoomV10
}

export interface HotelPropertyV10 {
  name: string
  location: {
    location_id: string
    country_code: string
    city?: string
    address?: string
    latitude?: string | number
    longitude?: string | number
    timezone?: string
  }
  property_type?: string
  star_rating?: string | number
}

export interface HotelStayV10 {
  check_in: string
  check_out: string
  occupancy?: { rooms: number; adults: number; children_ages?: number[] }
}

export interface HotelRoomV10 {
  name: string
  room_id?: string
  bedding?: string[]
  max_occupancy?: number
  room_type_guaranteed?: boolean
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
  price?: CommercialPriceV10
  display_price?: DisplayPriceV10
  quote?: CommercialQuoteV10
  fulfillment_note?: string
}

export interface DisplayPriceV10 {
  amount: string
  currency: string
}

export interface CommercialPriceV10 {
  amount: string
  currency: string
  unit?: "one_time" | "night" | "day" | "week" | "month" | "year"
  tax_status?: "included" | "excluded" | "unknown"
}

export interface CommercialQuoteV10 {
  observed_at: string
  valid_until?: string
}

export interface GenericOfferV10 extends Omit<OfferV10, "offer_info"> {
  offer_info: GenericOfferInfoV10
}

export interface GenericOfferInfoV10 extends Omit<OfferInfoV10, "commercial" | "details"> {
  commercial?: GenericCommercialInfoV10
  details?: never
}

export interface GenericCommercialInfoV10 extends Omit<CommercialInfoV10, "price" | "quote"> {
  price?: GenericCommercialPriceV10
  quote?: never
}

export type GenericCommercialPriceV10 = Omit<CommercialPriceV10, "tax_status"> & { tax_status?: never }

export interface ConversionGoalV10 {
  event: GoalEventNameV10
  pricing:
    | { model: "cpa"; amount: string; currency: string }
    | { model: "cps"; rate: string }
  description?: string
}
