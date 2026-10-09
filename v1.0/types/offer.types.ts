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

export type SupplyOfferDetailsV10 = FlightOfferDetailsV10 | HotelRateOfferDetailsV10 | GameOfferDetailsV10

export interface FlightOfferDetailsV10 {
  profile: "flight"
  data: FlightOfferDataV10
}

export type FlightOfferDataV10 = FlightItineraryV10 & (
  | { price_basis: "reference"; travelers?: never; fare_details?: never }
  | { price_basis?: "itinerary_total"; travelers: FlightTravelerV10[] }
)

export type FlightTravelerV10 =
  | { type: "adult" | "child"; count: number; ages?: number[]; infant_seat_required?: never }
  | { type: "infant"; count: number; ages?: number[]; infant_seat_required?: boolean[] }

export interface FlightSourceTextV10 {
  text: string
  /** BCP 47 language tag; und means the source language is unverified. */
  language: string
}

export interface FlightPlannedAircraftV10 {
  name: FlightSourceTextV10
  source: "supplier_reported"
}

export interface FlightConnectionV10 {
  after_segment_index: number
  airport_change: boolean
  duration_minutes?: number
}

export interface FlightMoneyV10 {
  amount: string
  currency: string
}

export interface FlightBaggageAllowanceV10 {
  pieces?: number
  total_weight_kg?: number
  max_weight_kg_per_piece?: number
}

export interface FlightFarePolicyV10 {
  summary: FlightSourceTextV10
  permitted?: boolean
  fee?: FlightMoneyV10
}

export interface FlightFareComponentV10 {
  leg_index: number
  segment_index: number
  traveler_type: "adult" | "child" | "infant"
  brand_name?: FlightSourceTextV10
  booking_class?: string
  carry_on_baggage?: FlightBaggageAllowanceV10
  checked_baggage?: FlightBaggageAllowanceV10
  change_policy?: FlightFarePolicyV10
  refund_policy?: FlightFarePolicyV10
  seat_selection?: { included?: boolean; starting_fee?: FlightMoneyV10 }
}

export interface FlightFareDetailsV10 {
  components?: FlightFareComponentV10[]
  self_transfer?: boolean
  separate_tickets?: boolean
  baggage_recheck_required?: boolean
}

export interface FlightEmissionsV10 {
  estimated_kg_co2e: number
  relative_to_typical_percent?: number
  methodology: string
  calculated_at: string
}

export type FlightStopV10 = { duration_minutes?: number } & (
  | { name: string; airport_code?: string; name_language?: string }
  | { name?: never; airport_code: string; name_language?: never }
)

export interface FlightItineraryV10 {
  trip_type: "one_way" | "round_trip" | "multi_city"
  fare_details?: FlightFareDetailsV10
  emissions?: FlightEmissionsV10
  legs: Array<{
    duration_minutes?: number
    connections?: FlightConnectionV10[]
    segments: Array<{
      departure: FlightEndpointV10
      arrival: FlightEndpointV10
      duration_minutes: number
      marketing_carrier: { code: string; name?: string; logo_url?: string }
      operating_carrier?: { code: string; name?: FlightSourceTextV10; logo_url?: string }
      operating_flight_number?: string
      flight_number: string
      stops?: FlightStopV10[]
      planned_aircraft?: FlightPlannedAircraftV10
      standard_aircraft_type?: { iata_code?: string; icao_code?: string }
      cabin_amenities?: {
        wifi?: boolean
        power_outlet?: boolean
        inflight_entertainment?: boolean
        meal_included?: boolean
        seat_pitch_inches?: number
      }
      cabin_class: "economy" | "premium_economy" | "business" | "first"
    }>
  }>
}

export interface FlightEndpointV10 {
  /** City identity and localized display name; independent of airport identity. */
  city_code?: string
  city_name?: string
  airport_code: string
  local_at: string
  airport_full_name?: FlightSourceTextV10
  terminal?: string
  timezone?: string
}

export interface GameOfferDetailsV10 {
  profile: "game"
  data: GameOfferDataV10
}

export interface GameOfferDataV10 {
  /** Source-reported cumulative downloads/installs; a published range such as 1M+ uses its lower bound. Positive integer. */
  downloads: number
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

/** Query details and commercial facts follow the same registered profiles as public Offers. */
export type GenericOfferInfoV10 = OfferInfoV10
export type GenericCommercialInfoV10 = CommercialInfoV10
export type GenericCommercialPriceV10 = CommercialPriceV10

export interface ConversionGoalV10 {
  event: GoalEventNameV10
  pricing:
    | { model: "cpa"; amount: string; currency: string }
    | { model: "cps"; rate: string }
  description?: string
}
