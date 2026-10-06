import { aonTaxonomyV1Resolver } from "../taxonomy/aon-taxonomy-v1-resolver.mjs"
import { isFullLocationCatalogV1Member } from "../helpers/full-location-catalog-v1.mjs"

const EMPTY_REASONS = new Set([
  "frequency_capped",
  "below_relevance_threshold",
  "scene_suppressed",
  "no_material",
  "consent_missing",
])

const QUERY_HELPER_PATHS = new Set([
  "intent.signals",
  "constraints.category_ids",
  "constraints.excluded_category_ids",
  "constraints.offer_types",
  "constraints.listing_source_names",
])

const BCP_47_LANGUAGE_TAG = /^[A-Za-z]{2,3}(?:-[A-Za-z]{3}){0,3}(?:-[A-Za-z]{4})?(?:-(?:[A-Za-z]{2}|[0-9]{3}))?(?:-(?:[A-Za-z0-9]{5,8}|[0-9][A-Za-z0-9]{3}))*(?:-[0-9A-WY-Za-wy-z](?:-[A-Za-z0-9]{2,8})+)*(?:-[Xx](?:-[A-Za-z0-9]{1,8})+)?$/
const DECIMAL_AMOUNT = /^(?:0|[1-9][0-9]{0,11})(?:\.[0-9]{1,6})?$/
const ZERO_DECIMAL_AMOUNT = /^0(?:\.0{1,6})?$/
const CURRENCY_CODE = /^[A-Z]{3}$/
const DISPLAY_PATTERN_TOKENS = new Set(["${type}", "${value}", "${unit}"])
const FORBIDDEN_ACTION_SCHEMES = new Set(["javascript:", "data:", "vbscript:", "file:"])
const SHORT_DESCRIPTION_SEGMENTER = new Intl.Segmenter("und", { granularity: "word" })
const LOCAL_DATE_TIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/

function semanticError(code, instancePath, message) {
  return { code, instancePath, message }
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

function validateOfferRoot(offer) {
  if (isPlainObject(offer)) return null
  return semanticError("offer_root_type", "", "Offer root must be a plain object")
}

function isNonEmptyObject(value) {
  return isPlainObject(value) && Object.keys(value).length > 0
}

function hasUniqueLanguageExtensionSingletons(value) {
  const seen = new Set()
  for (const subtag of value.toLowerCase().split("-").slice(1)) {
    if (!/^[0-9a-wy-z]$/.test(subtag)) continue
    if (seen.has(subtag)) return false
    seen.add(subtag)
  }
  return true
}

function validateShortDescription(value, errors) {
  if (typeof value !== "string") return
  const normalized = value.normalize("NFC").trim()
  if (normalized.length === 0) {
    errors.push(semanticError("short_description_blank", "/offer_info/short_description", "short_description must not be blank after NFC normalization and trimming"))
    return
  }
  let wordLikeCount = 0
  for (const segment of SHORT_DESCRIPTION_SEGMENTER.segment(normalized)) {
    if (segment.isWordLike) wordLikeCount += 1
  }
  if (wordLikeCount > 50) errors.push(semanticError("short_description_word_limit", "/offer_info/short_description", "short_description must contain at most 50 word-like segments after NFC normalization and trimming"))
}

function parseAbsoluteUri(value) {
  if (typeof value !== "string" || Array.from(value).length > 2048 || !/^[\x00-\x7F]*$/.test(value) || /%(?![0-9A-Fa-f]{2})/.test(value)) return null
  try {
    return new URL(value)
  } catch {
    return null
  }
}

function isAbsoluteHttpsUrl(value) {
  const parsed = parseAbsoluteUri(value)
  return parsed !== null && parsed.protocol === "https:" && parsed.hostname.length > 0 && parsed.username.length === 0 && parsed.password.length === 0
}

function isSafeActionUri(value, actionType) {
  const parsed = parseAbsoluteUri(value)
  if (!parsed || FORBIDDEN_ACTION_SCHEMES.has(parsed.protocol.toLowerCase())) return false
  if (actionType === "open_url") return isAbsoluteHttpsUrl(value)
  if (["http:", "https:"].includes(parsed.protocol) && (parsed.hostname.length === 0 || parsed.username.length > 0 || parsed.password.length > 0)) return false
  return true
}

function validateDisplayPattern(pattern, instancePath, errors) {
  let cursor = 0
  while (cursor < pattern.length) {
    const start = pattern.indexOf("${", cursor)
    if (start === -1) return
    const end = pattern.indexOf("}", start + 2)
    if (end === -1) {
      errors.push(semanticError("display_pattern_token", instancePath, "display_pattern contains an unclosed ${ token"))
      return
    }
    const token = pattern.slice(start, end + 1)
    if (!DISPLAY_PATTERN_TOKENS.has(token)) errors.push(semanticError("display_pattern_token", instancePath, "display_pattern token must be one of ${type}, ${value}, or ${unit}"))
    cursor = end + 1
  }
}

function validateOfferTaxonomy(offer, errors) {
  const categoryEntries = []
  const primaryCategoryId = offer?.offer_info?.category?.id
  if (typeof primaryCategoryId === "string") categoryEntries.push({ id: primaryCategoryId, instancePath: "/offer_info/category/id" })
  const secondaryCategoryIds = offer?.offer_info?.secondary_category_ids
  if (Array.isArray(secondaryCategoryIds)) {
    secondaryCategoryIds.forEach((id, index) => categoryEntries.push({ id, instancePath: `/offer_info/secondary_category_ids/${index}` }))
  }

  for (const entry of categoryEntries) {
    if (!aonTaxonomyV1Resolver.has(entry.id)) {
      errors.push(semanticError("taxonomy_registry_membership", entry.instancePath, "category id must exist in AON Taxonomy v1"))
    }
  }
  for (let index = 1; index < categoryEntries.length; index += 1) {
    const current = categoryEntries[index]
    if (!aonTaxonomyV1Resolver.has(current.id)) continue
    for (let previousIndex = 0; previousIndex < index; previousIndex += 1) {
      const previous = categoryEntries[previousIndex]
      if (!aonTaxonomyV1Resolver.has(previous.id)) continue
      if (aonTaxonomyV1Resolver.relation(previous.id, current.id) !== "disjoint") {
        errors.push(semanticError("taxonomy_branch_conflict", current.instancePath, "secondary category must not equal, contain, or be contained by another category"))
        break
      }
    }
  }
}

function isNonBlankString(value) {
  return typeof value === "string" && value.trim().length > 0
}

function isAfter(left, right) {
  const leftTime = typeof left === "string" ? Date.parse(left) : Number.NaN
  const rightTime = typeof right === "string" ? Date.parse(right) : Number.NaN
  return !Number.isNaN(leftTime) && !Number.isNaN(rightTime) && leftTime > rightTime
}

function isSameOrAfter(left, right) {
  const leftTime = typeof left === "string" ? Date.parse(left) : Number.NaN
  const rightTime = typeof right === "string" ? Date.parse(right) : Number.NaN
  return !Number.isNaN(leftTime) && !Number.isNaN(rightTime) && leftTime >= rightTime
}

function isValidLocalDateTime(value) {
  if (typeof value !== "string") return false
  const match = LOCAL_DATE_TIME.exec(value)
  if (!match) return false
  const [, yearText, monthText, dayText, hourText, minuteText, secondText] = match
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)
  const hour = Number(hourText)
  const minute = Number(minuteText)
  const second = Number(secondText)
  if (year < 1 || month < 1 || month > 12 || hour > 23 || minute > 59 || second > 59) return false
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
  const daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  return day >= 1 && day <= daysInMonth[month - 1]
}

function isLocalAfter(left, right) {
  return isValidLocalDateTime(left) && isValidLocalDateTime(right) && left > right
}

function validateDisplayPriceSemantics(offer, errors) {
  const commercial = offer?.offer_info?.commercial
  if (!isPlainObject(commercial) || !Object.hasOwn(commercial, "display_price")) return

  const path = "/offer_info/commercial/display_price"
  const displayPrice = commercial.display_price
  if (!isPlainObject(displayPrice)) {
    errors.push(semanticError("display_price_type", path, "display_price must be a closed object containing amount and currency"))
    return
  }

  for (const property of Object.keys(displayPrice)) {
    if (!["amount", "currency"].includes(property)) {
      errors.push(semanticError("display_price_unknown_property", `${path}/${property}`, "display_price permits only amount and currency"))
    }
  }

  const hasAmount = Object.hasOwn(displayPrice, "amount")
  const hasCurrency = Object.hasOwn(displayPrice, "currency")
  if (!hasAmount) errors.push(semanticError("display_price_required", `${path}/amount`, "display_price.amount is required when display_price is present"))
  if (!hasCurrency) errors.push(semanticError("display_price_required", `${path}/currency`, "display_price.currency is required when display_price is present"))

  const amount = displayPrice.amount
  const currency = displayPrice.currency
  const amountHasValidType = typeof amount === "string"
  const currencyHasValidType = typeof currency === "string"
  const amountHasValidFormat = amountHasValidType && DECIMAL_AMOUNT.test(amount)
  const currencyHasValidFormat = currencyHasValidType && CURRENCY_CODE.test(currency)
  if (hasAmount && !amountHasValidType) {
    errors.push(semanticError("display_price_amount_type", `${path}/amount`, "display_price.amount must be a string"))
  } else if (hasAmount && !amountHasValidFormat) {
    errors.push(semanticError("display_price_amount_format", `${path}/amount`, "display_price.amount must be a non-negative canonical decimal with at most twelve integer digits and six fractional digits"))
  }
  if (hasCurrency && !currencyHasValidType) {
    errors.push(semanticError("display_price_currency_type", `${path}/currency`, "display_price.currency must be a string"))
  } else if (hasCurrency && !currencyHasValidFormat) {
    errors.push(semanticError("display_price_currency_format", `${path}/currency`, "display_price.currency must be three uppercase ASCII letters"))
  }

  const price = commercial.price
  if (!isPlainObject(price)) {
    errors.push(semanticError("display_price_requires_price", "/offer_info/commercial/price", "display_price requires commercial.price"))
    return
  }

  if (currencyHasValidFormat && typeof price.currency === "string" && CURRENCY_CODE.test(price.currency) && currency === price.currency) {
    errors.push(semanticError("display_price_currency_same_as_price", `${path}/currency`, "display_price.currency must differ from commercial.price.currency"))
  }

  if (!amountHasValidFormat || typeof price.amount !== "string" || !DECIMAL_AMOUNT.test(price.amount)) return
  const sourceIsZero = ZERO_DECIMAL_AMOUNT.test(price.amount)
  const displayIsZero = ZERO_DECIMAL_AMOUNT.test(amount)
  if (sourceIsZero && !displayIsZero) {
    errors.push(semanticError("display_price_zero_mismatch", `${path}/amount`, "a zero original price requires a zero display_price amount"))
  } else if (!sourceIsZero && displayIsZero) {
    errors.push(semanticError("display_price_paid_zero", `${path}/amount`, "a positive original price requires a positive display_price amount"))
  }
}

function validateQuoteSemantics(commercial, errors) {
  if (!isPlainObject(commercial) || !Object.hasOwn(commercial, "quote")) return
  if (!isPlainObject(commercial.price)) {
    errors.push(semanticError("quote_requires_price", "/offer_info/commercial/quote", "quote requires commercial.price"))
    return
  }
  const quote = commercial.quote
  if (isPlainObject(quote) && isSameOrAfter(quote.observed_at, quote.valid_until)) {
    errors.push(semanticError("quote_window_order", "/offer_info/commercial/quote/valid_until", "quote.valid_until must be later than quote.observed_at"))
  }
}

function validateProfileCommercial(offer, profile, errors) {
  const commercial = offer?.offer_info?.commercial
  const price = commercial?.price
  const quote = commercial?.quote
  if (!isPlainObject(commercial) || !isPlainObject(price) || !Object.hasOwn(price, "amount") || !Object.hasOwn(price, "currency")) {
    errors.push(semanticError("profile_price_required", "/offer_info/commercial/price", `${profile} requires commercial.price.amount and commercial.price.currency`))
  }
  if (!isPlainObject(price) || !Object.hasOwn(price, "tax_status")) {
    errors.push(semanticError("profile_tax_status_required", "/offer_info/commercial/price/tax_status", `${profile} requires commercial.price.tax_status`))
  }
  if (!(profile === "flight" && offer?.offer_info?.details?.data?.price_basis === "reference" && quote === undefined) && (!isPlainObject(quote) || !Object.hasOwn(quote, "observed_at"))) {
    errors.push(semanticError("profile_quote_required", "/offer_info/commercial/quote/observed_at", `${profile} requires commercial.quote.observed_at`))
  }
}

function validateProfileBaseOffer(offer, profile, categoryId, errors) {
  if (offer?.offer_info?.offer_type !== "offline_service") {
    errors.push(semanticError("profile_offer_type", "/offer_info/offer_type", `${profile} requires offer_type offline_service`))
  }
  if (offer?.offer_info?.category?.id !== categoryId) {
    errors.push(semanticError("profile_category", "/offer_info/category/id", `${profile} requires exact category ${categoryId}`))
  }
  if (offer?.action?.consumer_action !== "book") {
    errors.push(semanticError("profile_book_action", "/action/consumer_action", `${profile} requires action.consumer_action book`))
  }
  validateProfileCommercial(offer, profile, errors)
}

function validateFlightProfile(offer, data, errors) {
  validateProfileBaseOffer(offer, "flight", "travel_tourism.air_travel.airline_tickets_fares_flights", errors)
  if (!isPlainObject(data)) return

  validateFlightTravelers(data.travelers, false, "/offer_info/details/data/travelers", errors)
  if (data.price_basis === "reference" && Object.hasOwn(data, "travelers")) errors.push(semanticError("flight_reference_travelers", "/offer_info/details/data/travelers", "reference prices must not declare travelers"))
  const legs = data.legs
  const expectedLegCount = data.trip_type === "one_way" ? 1 : data.trip_type === "round_trip" ? 2 : undefined
  if (expectedLegCount !== undefined && Array.isArray(legs) && legs.length !== expectedLegCount) {
    errors.push(semanticError("flight_trip_type_legs", "/offer_info/details/data/legs", `${data.trip_type} requires exactly ${expectedLegCount} legs`))
  }
  if (data.trip_type === "multi_city" && Array.isArray(legs) && legs.length < 2) {
    errors.push(semanticError("flight_trip_type_legs", "/offer_info/details/data/legs", "multi_city requires at least two legs"))
  }

  if (Array.isArray(data.travelers)) {
    const travelerTypes = new Set()
    data.travelers.forEach((traveler, index) => {
      const path = `/offer_info/details/data/travelers/${index}/type`
      if (travelerTypes.has(traveler?.type)) errors.push(semanticError("flight_traveler_type_unique", path, "each flight traveler type may occur at most once"))
      travelerTypes.add(traveler?.type)
    })
  }

  if (!Array.isArray(legs)) return
  legs.forEach((leg, legIndex) => {
    const segments = leg?.segments
    if (!Array.isArray(segments)) return
    if (leg.duration_minutes !== undefined && leg.duration_minutes < segments.reduce((total, segment) => total + segment.duration_minutes, 0)) errors.push(semanticError("flight_leg_duration", `/offer_info/details/data/legs/${legIndex}/duration_minutes`, "leg duration must be at least the sum of segment durations"))
    segments.forEach((segment, segmentIndex) => {
      const path = `/offer_info/details/data/legs/${legIndex}/segments/${segmentIndex}`
      for (const endpointName of ["departure", "arrival"]) {
        if (!isValidLocalDateTime(segment?.[endpointName]?.local_at)) {
          errors.push(semanticError("flight_local_time_invalid", `${path}/${endpointName}/local_at`, `flight segment ${endpointName}.local_at must be a real airport-local calendar date-time in YYYY-MM-DDTHH:mm:ss form`))
        }
      }
      for (const [owner, field, fieldPath] of [
        [segment?.departure, "city_name", `${path}/departure/city_name`],
        [segment?.arrival, "city_name", `${path}/arrival/city_name`],
        [segment?.marketing_carrier, "name", `${path}/marketing_carrier/name`],
      ]) {
        if (isPlainObject(owner) && Object.hasOwn(owner, field)
          && (typeof owner[field] !== "string" || !/[^\u0009-\u000D\u0020\u0085\u00A0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000\uFEFF]/u.test(owner[field]))) {
          errors.push(semanticError("flight_display_name_invalid", fieldPath, "flight display names must contain a character outside Unicode White_Space plus U+FEFF"))
        }
      }
      if (segmentIndex === 0) return
      const previous = segments[segmentIndex - 1]
      const sameConnectingAirport = previous?.arrival?.airport_code === segment?.departure?.airport_code
      if (!sameConnectingAirport) {
        errors.push(semanticError("flight_segment_airport_continuity", `${path}/departure/airport_code`, "each flight segment departure airport must equal the preceding segment arrival airport"))
      } else if (isLocalAfter(previous?.arrival?.local_at, segment?.departure?.local_at)) {
        errors.push(semanticError("flight_segment_time_continuity", `${path}/departure/local_at`, "at a connecting airport, each flight segment departure.local_at must not be earlier than the preceding segment arrival.local_at"))
      }
    })
  })
}

function validateHotelRateProfile(offer, data, errors) {
  validateProfileBaseOffer(offer, "hotel_rate", "travel_tourism.accommodations.hotels_motels_resorts.hotels", errors)
  const price = offer?.offer_info?.commercial?.price
  if (price?.unit !== "night") {
    errors.push(semanticError("hotel_rate_price_unit", "/offer_info/commercial/price/unit", "hotel_rate requires commercial.price.unit night"))
  }
  if (!isPlainObject(data)) return
  if (data?.rate?.kind !== "reference_starting_nightly") {
    errors.push(semanticError("hotel_rate_kind", "/offer_info/details/data/rate/kind", "hotel_rate must declare rate.kind reference_starting_nightly"))
  }

  const property = data.property
  if (!isNonBlankString(property?.name)) {
    errors.push(semanticError("hotel_property_name", "/offer_info/details/data/property/name", "hotel_rate property.name must be non-blank"))
  }
  const locationId = property?.location?.location_id
  if (!isFullLocationCatalogV1Member(locationId)) {
    errors.push(semanticError("hotel_location_registry_membership", "/offer_info/details/data/property/location/location_id", "hotel_rate property.location.location_id must be an active AON Full Location Catalog v1 member"))
  }

  const stay = data.stay
  if (isPlainObject(stay) && isSameOrAfter(stay.check_in, stay.check_out)) {
    errors.push(semanticError("hotel_stay_date_order", "/offer_info/details/data/stay/check_out", "hotel_rate stay.check_out must be later than stay.check_in"))
  }
  if (isPlainObject(data.room) && !isNonBlankString(data.room.name)) {
    errors.push(semanticError("hotel_room_name", "/offer_info/details/data/room/name", "hotel_rate room.name must be non-blank when room is supplied"))
  }
}

function validateSupplyOfferProfile(offer, errors) {
  const details = offer?.offer_info?.details
  if (details === undefined) return
  if (!isPlainObject(details)) {
    errors.push(semanticError("profile_envelope", "/offer_info/details", "details must be a registered closed profile envelope"))
    return
  }
  if (details.profile === "flight") {
    validateFlightProfile(offer, details.data, errors)
    return
  }
  if (details.profile === "hotel_rate") {
    validateHotelRateProfile(offer, details.data, errors)
    return
  }
  errors.push(semanticError("profile_registry", "/offer_info/details/profile", "details.profile must be registered in the v1.0 supply profile registry"))
}

function validateOfferCommonV10Semantics(offer, errors) {
  if (offer?.content_language !== undefined && (typeof offer.content_language !== "string" || !BCP_47_LANGUAGE_TAG.test(offer.content_language) || !hasUniqueLanguageExtensionSingletons(offer.content_language))) {
    errors.push(semanticError("language_bcp47", "/content_language", "content_language must be a BCP-47 language tag"))
  }

  validateShortDescription(offer?.offer_info?.short_description, errors)

  const goals = offer?.goals
  if (Array.isArray(goals)) {
    const seenEvents = new Set()
    goals.forEach((goal, index) => {
      const goalPath = `/goals/${index}`
      if (seenEvents.has(goal?.event)) errors.push(semanticError("event_unique", `${goalPath}/event`, "goal event must be unique"))
      seenEvents.add(goal?.event)
      if (goal?.pricing?.model === "cpa" && Number(goal.pricing.amount) <= 0) {
        errors.push(semanticError("amount_positive", `${goalPath}/pricing/amount`, "cpa amount must be greater than zero"))
      }
      if (goal?.pricing?.model === "cps" && Number(goal.pricing.rate) <= 0) {
        errors.push(semanticError("rate_positive", `${goalPath}/pricing/rate`, "cps rate must be greater than zero"))
      }
    })
  }

  const displayProperties = offer?.offer_info?.properties
  if (Array.isArray(displayProperties)) {
    displayProperties.forEach((property, index) => {
      if (typeof property?.display_pattern === "string") validateDisplayPattern(property.display_pattern, `/offer_info/properties/${index}/display_pattern`, errors)
    })
  }

  const startAt = offer?.offer_info?.start_at
  const expireAt = offer?.offer_info?.expire_at
  if (typeof startAt === "string" && typeof expireAt === "string" && !Number.isNaN(Date.parse(startAt)) && !Number.isNaN(Date.parse(expireAt)) && Date.parse(startAt) > Date.parse(expireAt)) {
    errors.push(semanticError("offer_window_order", "/offer_info/expire_at", "expire_at must not be earlier than start_at"))
  }

  const price = offer?.offer_info?.commercial?.price
  if (price?.amount !== undefined && (typeof price.amount !== "string" || !DECIMAL_AMOUNT.test(price.amount))) {
    errors.push(semanticError("price_decimal", "/offer_info/commercial/price/amount", "price amount must be a canonical decimal string"))
  }
  validateDisplayPriceSemantics(offer, errors)
  validateQuoteSemantics(offer?.offer_info?.commercial, errors)
  if (offer?.entity?.website !== undefined && !isAbsoluteHttpsUrl(offer.entity.website)) {
    errors.push(semanticError("resource_https", "/entity/website", "entity.website must be an absolute HTTPS URL without userinfo"))
  }
  if (offer?.entity?.logo !== undefined && !isAbsoluteHttpsUrl(offer.entity.logo)) {
    errors.push(semanticError("logo_https", "/entity/logo", "entity.logo must be an absolute HTTPS URL without userinfo"))
  }
  if (offer?.listing_source?.logo !== undefined && !isAbsoluteHttpsUrl(offer.listing_source.logo)) {
    errors.push(semanticError("logo_https", "/listing_source/logo", "listing_source.logo must be an absolute HTTPS URL without userinfo"))
  }
  if (Array.isArray(offer?.material)) {
    offer.material.forEach((material, index) => {
      if (material?.url !== undefined && !isAbsoluteHttpsUrl(material.url)) errors.push(semanticError("resource_https", `/material/${index}/url`, "material.url must be an absolute HTTPS URL without userinfo"))
    })
  }
  if (offer?.action?.payload?.url !== undefined && !isSafeActionUri(offer.action.payload.url, offer.action.type)) {
    errors.push(semanticError("action_uri_safe", "/action/payload/url", "action payload must use a safe absolute URI and open_url must use HTTPS without userinfo"))
  }

  validateOfferTaxonomy(offer, errors)
  validateSupplyOfferProfile(offer, errors)
}

export function validatePublicOfferV10Semantics(offer) {
  const rootError = validateOfferRoot(offer)
  if (rootError) return { valid: false, errors: [rootError] }
  const errors = []
  validateOfferCommonV10Semantics(offer, errors)
  if (Object.hasOwn(offer ?? {}, "targeting")) {
    errors.push(semanticError("partner_only_field", "/targeting", "targeting belongs to the Partner Offer artifact"))
  }
  if (Object.hasOwn(offer ?? {}, "conversion_rule")) {
    errors.push(semanticError("partner_only_field", "/conversion_rule", "conversion_rule belongs to the Partner Offer artifact"))
  }
  return { valid: errors.length === 0, errors }
}

export function validatePartnerOfferV10Semantics(offer) {
  const rootError = validateOfferRoot(offer)
  if (rootError) return { valid: false, errors: [rootError] }
  const errors = []
  validateOfferCommonV10Semantics(offer, errors)
  if (Object.hasOwn(offer, "offer_id")) errors.push(semanticError("aon_projection_field", "/offer_id", "offer_id is assigned by AON after resolving source_offer_id"))
  if (Object.hasOwn(offer, "offer_instance_id")) errors.push(semanticError("aon_projection_field", "/offer_instance_id", "offer_instance_id is assigned only when AON creates a public response dispatch"))
  if (Object.hasOwn(offer, "match_reason")) errors.push(semanticError("aon_projection_field", "/match_reason", "match_reason is authored only by AON for a public Query response"))
  if (isPlainObject(offer?.offer_info?.commercial) && Object.hasOwn(offer.offer_info.commercial, "display_price")) {
    errors.push(semanticError("aon_projection_field", "/offer_info/commercial/display_price", "display_price is authored only by AON for a public Query response"))
  }
  if (Object.hasOwn(offer ?? {}, "targeting")) {
    if (!Array.isArray(offer.targeting) || offer.targeting.length === 0) {
      errors.push(semanticError("targeting_nonempty", "/targeting", "targeting must contain at least one non-empty rule when supplied"))
    } else {
      offer.targeting.forEach((rule, index) => {
        const rulePath = `/targeting/${index}`
        if (!isNonEmptyObject(rule)) errors.push(semanticError("targeting_nonempty", rulePath, "targeting rule must not be empty"))
        if (Object.hasOwn(rule ?? {}, "geo") && !isNonEmptyObject(rule.geo)) errors.push(semanticError("targeting_nonempty", `${rulePath}/geo`, "targeting.geo must not be empty"))
        if (Object.hasOwn(rule ?? {}, "eligibility") && !isNonEmptyObject(rule.eligibility)) errors.push(semanticError("targeting_nonempty", `${rulePath}/eligibility`, "targeting.eligibility must not be empty"))
        for (const key of ["include", "exclude"]) {
          if (Object.hasOwn(rule?.geo ?? {}, key) && (!Array.isArray(rule.geo[key]) || rule.geo[key].length === 0)) errors.push(semanticError("targeting_nonempty", `${rulePath}/geo/${key}`, `targeting.geo.${key} must not be empty`))
          if (Array.isArray(rule?.geo?.[key])) {
            rule.geo[key].forEach((location, locationIndex) => {
              if (!isFullLocationCatalogV1Member(location?.location_id)) {
                errors.push(semanticError("location_registry_membership", `${rulePath}/geo/${key}/${locationIndex}/location_id`, "location_id must be a numeric ACTIVE entry in AON Full Location Catalog v1"))
              }
            })
          }
        }
        for (const key of ["device_type", "os"]) {
          if (Object.hasOwn(rule ?? {}, key) && (!Array.isArray(rule[key]) || rule[key].length === 0)) errors.push(semanticError("targeting_nonempty", `${rulePath}/${key}`, `targeting.${key} must not be empty`))
        }
      })
    }
  }
  if (Object.hasOwn(offer ?? {}, "conversion_rule")) {
    if (!isNonEmptyObject(offer.conversion_rule)) {
      errors.push(semanticError("conversion_rule_nonempty", "/conversion_rule", "conversion_rule must not be empty when supplied"))
    } else if (offer.conversion_rule.minimum_amount !== undefined && (typeof offer.conversion_rule.minimum_amount !== "string" || !DECIMAL_AMOUNT.test(offer.conversion_rule.minimum_amount) || Number(offer.conversion_rule.minimum_amount) <= 0)) {
      errors.push(semanticError("amount_positive", "/conversion_rule/minimum_amount", "minimum_amount must be a positive canonical decimal string"))
    }
  }
  return { valid: errors.length === 0, errors }
}

function validateBudgetSignal(budget, path, errors) {
  if (budget === undefined) return
  if (!budget || typeof budget !== "object" || Array.isArray(budget)) {
    errors.push(`${path} must be an object with max and currency`)
    return
  }
  if (!Object.hasOwn(budget, "max") || !Object.hasOwn(budget, "currency")) {
    errors.push(`${path} requires max and currency together`)
    return
  }
  if (typeof budget.currency !== "string" || !/^[A-Z]{3}$/.test(budget.currency)) {
    errors.push(`${path}.currency must be an uppercase ISO 4217 code`)
  }
}

const QUERY_OFFER_TYPES = new Set(["physical_product", "digital_goods", "content", "online_service", "offline_service"])

function validateQueryConstraintFilters(constraints, path, errors) {
  if (!isPlainObject(constraints)) return
  if (Object.hasOwn(constraints, "listing_source_kinds")) errors.push(`${path}.listing_source_kinds is not defined in v1.0`)
  for (const field of ["offer_types", "listing_source_names"]) {
    if (!Object.hasOwn(constraints, field)) continue
    const values = constraints[field]
    const fieldPath = `${path}.${field}`
    if (!Array.isArray(values)) {
      errors.push(`${fieldPath} must be an array`)
      continue
    }
    // Uniqueness is checked before any matching normalization.
    if (new Set(values).size !== values.length) errors.push(`${fieldPath} entries must be unique`)
    for (const [index, value] of values.entries()) {
      if (field === "offer_types") {
        if (!QUERY_OFFER_TYPES.has(value)) errors.push(`${fieldPath}.${index} must be a public OfferType`)
      } else if (typeof value !== "string" || [...value].length < 1 || [...value].length > 160 || !/[^\u0009-\u000D\u0020]/u.test(value)) {
        errors.push(`${fieldPath}.${index} must be a string of 1–160 Unicode code points containing a non-ASCII-whitespace character`)
      }
    }
  }
}

export function validateOfferQueryV10Semantics(request) {
  if (!isPlainObject(request)) return { valid: false, errors: ["Query request root must be a plain object"] }
  const errors = []
  const thinkingMode = request.response_options?.thinking_mode
  if (thinkingMode !== undefined && typeof thinkingMode !== "boolean") {
    errors.push("response_options.thinking_mode must be boolean")
  }
  if (request.force_offer !== undefined && typeof request.force_offer !== "boolean") {
    errors.push("force_offer must be boolean")
  }
  if (request.intent?.provenance === "user_expressed" && request.intent?.confidence !== undefined) {
    errors.push("confidence is only valid for inferred_context")
  }
  if (request.intent?.provenance === "inferred_context" && request.intent?.confidence === undefined) {
    errors.push("confidence is required for inferred_context")
  }
  const origins = request.intent?.origin ?? []
  const originKeys = origins.map((origin) => `${origin.kind}:${origin.id}`)
  if (new Set(originKeys).size !== originKeys.length) errors.push("intent.origin entries must be unique by kind and id")
  if (origins.length > 3) errors.push("intent.origin must contain at most three entries")
  if (origins.length > 0 && request.intent?.provenance !== "user_expressed") errors.push("intent.origin requires user_expressed provenance")
  if (Object.hasOwn(request.constraints ?? {}, "features")) errors.push("constraints.features is not defined in v1.0")
  validateQueryConstraintFilters(request.constraints, "constraints", errors)
  validateBudgetSignal(request.intent?.signals?.budget, "intent.signals.budget", errors)
  if (Object.hasOwn(request.intent ?? {}, "details")) validateFlightQueryDetails(request.intent.details, errors)
  return { valid: errors.length === 0, errors }
}

export function validateOfferQueryResponseV10Semantics(response, request = {}, evidence = {}) {
  if (!isPlainObject(response)) return { valid: false, errors: ["Query response root must be a plain object"] }
  const errors = []
  const typed = Object.hasOwn(request?.intent ?? {}, "details")
  if (typed) {
    validateFlightResponse(response, request, evidence, false, errors)
    if (!Array.isArray(response.offers) || !isPlainObject(request)) return { valid: false, errors }
  }
  if (request.request_id !== undefined && response.request_id !== request.request_id) errors.push("request_id must match the paired request")
  if (Object.hasOwn(response, "flight_search")) errors.push("flight_search is not defined in public Query responses")
  const thinkingMode = request.response_options?.thinking_mode ?? true
  if (!thinkingMode && (response.offers ?? []).some((offer) => Object.hasOwn(offer, "match_reason"))) {
    errors.push("match_reason must be omitted when thinking_mode is false")
  }
  if (response.offers?.length && Object.hasOwn(response, "empty_reason")) {
    errors.push("empty_reason must be omitted when offers are present")
  }
  if (!typed && !response.offers?.length && !EMPTY_REASONS.has(response.empty_reason)) {
    errors.push("empty_reason is required and must be a v1.0 enum value when offers are empty")
  }
  if (Object.hasOwn(response, "decision_factors")) errors.push("decision_factors is not defined in v1.0")
  if (response.engagement && Object.hasOwn(response.engagement, "query_helper")) errors.push("query_helper is item-level only")
  if (response.language !== undefined && (typeof response.language !== "string" || !BCP_47_LANGUAGE_TAG.test(response.language) || !hasUniqueLanguageExtensionSingletons(response.language))) errors.push("language must use the stable-v1.0 language-tag profile")
  for (const [index, offer] of (response.offers ?? []).entries()) {
    const projection = typed ? validatePublicOfferV10Semantics(offer) : validateQueryGenericOfferV10Semantics(offer)
    for (const error of projection.errors) errors.push(`offers.${index}${error.instancePath}: ${error.message}`)
  }
  if (Object.hasOwn(response, "alternative_offers")) {
    if (!Array.isArray(response.offers) || response.offers.length !== 0) {
      errors.push("alternative_offers requires an empty offers array")
    }
    if (!["below_relevance_threshold", "no_material"].includes(response.empty_reason)) {
      errors.push("alternative_offers requires empty_reason below_relevance_threshold or no_material")
    }
    if (Object.hasOwn(request, "placement_id")) errors.push("alternative_offers must be omitted for placement_id requests")
    if (request.test_mode === true) errors.push("alternative_offers must be omitted when test_mode is true")
    const alternatives = response.alternative_offers
    if (!Array.isArray(alternatives)) {
      errors.push("alternative_offers must be an array containing 1–3 entries")
    } else {
      if (alternatives.length < 1 || alternatives.length > 3) errors.push("alternative_offers must contain 1–3 entries")
      const alternativeOfferIds = new Set()
      for (const [index, alternative] of alternatives.entries()) {
        const path = `alternative_offers.${index}`
        if (!isPlainObject(alternative)) {
          errors.push(`${path} must be a plain object`)
          continue
        }
        for (const key of ["basis", "selection_reason", "offer"]) {
          if (!Object.hasOwn(alternative, key)) errors.push(`${path}.${key} is required`)
        }
        for (const key of Object.keys(alternative)) {
          if (!["basis", "selection_reason", "offer"].includes(key)) errors.push(`${path}.${key} is not defined in v1.0`)
        }
        if (alternative.basis !== "regional_popularity") errors.push(`${path}.basis must be regional_popularity`)
        const reason = alternative.selection_reason
        if (typeof reason !== "string" || !/\S/u.test(reason) || [...reason].length > 500) {
          errors.push(`${path}.selection_reason must contain 1–500 Unicode code points and at least one non-whitespace character under ECMAScript whitespace rules`)
        }
        const offer = alternative.offer
        const projection = validateQueryGenericOfferV10Semantics(offer)
        for (const error of projection.errors) errors.push(`${path}.offer${error.instancePath}: ${error.message}`)
        if (!isPlainObject(offer)) continue
        if (Object.hasOwn(offer, "match_reason")) errors.push(`${path}.offer.match_reason must be omitted for alternatives`)
        if (typeof offer.offer_id === "string") {
          const stableOfferId = offer.offer_id.toLowerCase()
          if (alternativeOfferIds.has(stableOfferId)) errors.push(`${path}.offer.offer_id must be unique across alternative_offers regardless of UUID casing or dispatch identity`)
          alternativeOfferIds.add(stableOfferId)
        }
      }
    }
  }
  const followupTopics = response.engagement?.followup_topics ?? []
  for (let index = 1; index < followupTopics.length; index += 1) {
    if (followupTopics[index - 1]?.confidence < followupTopics[index]?.confidence) errors.push("followup_topics must be ordered by descending confidence")
  }
  const offerIds = new Set((response.offers ?? []).map((offer) => offer.offer_id))
  for (const [index, hook] of (response.hooks ?? []).entries()) {
    if (!offerIds.has(hook?.subject_offer_id)) errors.push(`hooks.${index}.subject_offer_id must reference a returned Offer`)
    const previousRequestId = request.context?.session?.previous_request_id
    if (!previousRequestId || hook?.baseline_request_id !== previousRequestId) errors.push(`hooks.${index}.baseline_request_id must match context.session.previous_request_id`)
  }
  return { valid: errors.length === 0, errors }
}

export function validateQueryGenericOfferV10Semantics(offer) {
  return validatePublicOfferV10Semantics(offer)
}

export function validateQueryHelperPatch(patch) {
  const errors = []
  if (!isPlainObject(patch) || Object.keys(patch).length === 0) return { valid: false, errors: ["request_patch must be a non-empty plain object"] }
  if (Object.hasOwn(patch, "intent") && !isNonEmptyObject(patch.intent)) errors.push("request_patch.intent must contain non-empty signals")
  if (Object.hasOwn(patch?.intent ?? {}, "signals") && !isNonEmptyObject(patch.intent.signals)) errors.push("request_patch.intent.signals must contain at least one update")
  if (Object.hasOwn(patch, "constraints") && !isNonEmptyObject(patch.constraints)) errors.push("request_patch.constraints must contain at least one replacement array")
  const visit = (value, path = "") => {
    if (value === null) {
      errors.push(`${path || "request_patch"} must not be null`)
      return
    }
    if (!isPlainObject(value)) return
    for (const [key, child] of Object.entries(value)) {
      const childPath = path ? `${path}.${key}` : key
      if (![...QUERY_HELPER_PATHS].some((allowed) => allowed === childPath || childPath.startsWith(`${allowed}.`) || allowed.startsWith(`${childPath}.`))) {
        errors.push(childPath)
        continue
      }
      if (child === null || isPlainObject(child)) visit(child, childPath)
    }
  }
  visit(patch)
  validateQueryConstraintFilters(patch.constraints, "request_patch.constraints", errors)
  validateBudgetSignal(patch?.intent?.signals?.budget, "request_patch.intent.signals.budget", errors)
  return { valid: errors.length === 0, errors }
}

export function isAbsoluteHttpsListingSourceLogo(value) {
  return isAbsoluteHttpsUrl(value)
}

export function validateListingSourceV10(source, entity = {}, now = new Date()) {
  const errors = []
  if (!source || typeof source !== "object") return { valid: false, action: "omit", errors: ["listing_source must be an object"] }
  for (const field of ["kind", "name", "observed_at"]) {
    if (typeof source[field] !== "string" || source[field].length === 0) errors.push(`listing_source.${field} is required`)
  }
  if (Object.hasOwn(source, "url")) errors.push("listing_source.url is not a v1.0 public field")
  if (Object.hasOwn(source, "logo") && !isAbsoluteHttpsListingSourceLogo(source.logo)) errors.push("listing_source.logo must be an absolute HTTPS URL up to 2048 characters")
  if (source.observed_at && (!source.observed_at.endsWith("Z") || Number.isNaN(Date.parse(source.observed_at)))) errors.push("listing_source.observed_at must be UTC")
  if (entity.name && source.name === entity.name) errors.push("listing_source must remain distinct from entity")
  if (source.observed_at && !Number.isNaN(Date.parse(source.observed_at)) && Date.parse(source.observed_at) < now.getTime() - 1000 * 60 * 60 * 24 * 30) errors.push("listing_source is stale")
  return { valid: errors.length === 0, action: errors.length === 0 ? "keep" : "omit", errors }
}

export { EMPTY_REASONS, QUERY_HELPER_PATHS }

// JSON Schema validation precedes these pure semantic helpers. Evidence is supplied
// by the validator caller from a trusted directory, never derived from the response.
function validateFlightTravelers(travelers, typed, path, errors) {
  if (!Array.isArray(travelers)) {
    if (typed) errors.push(semanticError("flight_travelers_required", path, "typed quotes require traveler groups"))
    return
  }
  const types = new Set()
  for (const [index, traveler] of travelers.entries()) {
    const fail = (message) => errors.push(semanticError("flight_traveler_facts", `${path}/${index}`, message))
    if (!isPlainObject(traveler)) { fail("traveler must be an object"); continue }
    if (types.has(traveler.type)) fail("each traveler type may occur at most once")
    types.add(traveler.type)
    if (!["adult", "child", "infant"].includes(traveler.type) || !Number.isInteger(traveler.count) || traveler.count < 1) fail("traveler type and positive integer count are required")
    const agesRequired = typed && traveler.type !== "adult"
    if (agesRequired || traveler.ages !== undefined) {
      if (!Array.isArray(traveler.ages) || traveler.ages.length !== traveler.count || traveler.ages.some((age) => !Number.isInteger(age) || age < 0)) fail("ages must contain one nonnegative integer per traveler")
    }
    if (traveler.type !== "infant" && traveler.infant_seat_required !== undefined) fail("only infants may declare infant_seat_required")
    if ((typed && traveler.type === "infant") || traveler.infant_seat_required !== undefined) {
      if (!Array.isArray(traveler.infant_seat_required) || traveler.infant_seat_required.length !== traveler.count || traveler.infant_seat_required.some((seat) => typeof seat !== "boolean")) fail("infant_seat_required must contain one boolean per infant")
    }
  }
}

function validateFlightQueryDetails(details, errors) {
  const fail = (message) => errors.push(`intent.details: ${message}`)
  if (!isPlainObject(details) || details.profile !== "flight" || !isPlainObject(details.data)) { fail("requires the Flight profile and data"); return }
  const data = details.data
  if (!["reference_search", "traveler_quote"].includes(data.query_kind)) fail("query_kind must be explicit")
  if (data.query_kind === "reference_search" && Object.hasOwn(data, "travelers")) fail("reference_search forbids travelers")
  if (data.query_kind === "traveler_quote") validateFlightTravelers(data.travelers, true, "/intent/details/data/travelers", errors)
  if (!Array.isArray(data.legs) || data.legs.length === 0) { fail("requires nonempty legs"); return }
  for (const [index, leg] of data.legs.entries()) {
    if (!isPlainObject(leg)) { fail(`legs.${index} must be an object`); continue }
    for (const endpoint of ["origin", "destination"]) {
      if (!["airport", "city"].includes(leg[endpoint]?.kind) || !/^[A-Z]{3}$/.test(leg[endpoint]?.code ?? "")) fail(`legs.${index}.${endpoint} requires an explicit airport or city code`)
    }
    if (leg.origin?.kind === leg.destination?.kind && leg.origin?.code === leg.destination?.code) fail(`legs.${index} origin and destination must differ`)
    if (typeof leg.departure_date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(leg.departure_date) || !isValidLocalDateTime(`${leg.departure_date}T00:00:00`)) fail(`legs.${index}.departure_date must be an actual local calendar date`)
  }
}

function flightTravelerComposition(travelers) {
  return JSON.stringify(travelers.map((traveler) => ({
    type: traveler.type,
    count: traveler.count,
    facts: traveler.ages?.map((age, index) => [age, traveler.type === "infant" ? traveler.infant_seat_required?.[index] : null]).sort((a, b) => a[0] - b[0] || Number(a[1]) - Number(b[1])),
  })).sort((a, b) => a.type.localeCompare(b.type)))
}

function validateFlightResponse(response, request, evidence, partner, errors) {
  const details = request?.intent?.details
  if (!isPlainObject(request) || !isPlainObject(request.context) || !isPlainObject(request.intent) || !Array.isArray(request.intent.content) || request.intent.content.length === 0 || !["user_expressed", "inferred_context"].includes(request.intent.provenance)) errors.push("typed Flight validation requires a complete paired request validated against JSON Schema")
  if (!isPlainObject(details) || (partner && !Object.hasOwn(response, "flight_search"))) { errors.push("typed Flight validation requires request details and Provider execution metadata when validating a Provider response"); return }
  const requestResult = validateOfferQueryV10Semantics(request)
  errors.push(...requestResult.errors)
  if (!requestResult.valid) return
  const query = details.data
  const execution = response.flight_search
  if (!isPlainObject(query) || !Array.isArray(query.legs)) return
  if (partner && (!isPlainObject(execution) || execution.query_kind !== query.query_kind || !["complete", "partial"].includes(execution.status) || typeof execution.fetched_at !== "string" || !Number.isFinite(Date.parse(execution.fetched_at)))) errors.push("flight_search must contain matching query_kind, complete/partial status, and fetched_at")
  if (Object.hasOwn(response, "empty_reason") || Object.hasOwn(response, "alternative_offers")) errors.push("typed Flight responses forbid empty_reason and alternative_offers")
  if (!Array.isArray(response.offers)) { errors.push("typed Flight responses require an offers array"); return }
  for (const [index, offer] of response.offers.entries()) {
    const fail = (message) => errors.push(`offers.${index}: ${message}`)
    const data = offer?.offer_info?.details?.data
    if (!isPlainObject(offer) || offer.offer_info?.details?.profile !== "flight" || !isPlainObject(data)) { fail("requires a complete Flight Offer"); continue }
    if (partner) for (const error of validatePartnerOfferV10Semantics(offer).errors) fail(error.message)
    const price = offer.offer_info?.commercial?.price
    if (price?.unit !== undefined && price.unit !== "one_time") fail("typed Flight price.unit must be omitted or one_time")
    if (query.query_kind === "reference_search") {
      if (data.price_basis !== "reference" || Object.hasOwn(data, "travelers")) fail("reference_search requires reference price_basis without travelers")
    } else if (query.query_kind === "traveler_quote") {
      if (data.price_basis !== "itinerary_total") fail("traveler_quote requires itinerary_total price_basis")
      const travelerErrors = []
      validateFlightTravelers(data.travelers, true, "/offer_info/details/data/travelers", travelerErrors)
      errors.push(...travelerErrors)
      if (travelerErrors.length === 0 && Array.isArray(query.travelers) && query.travelers.every(isPlainObject) && flightTravelerComposition(data.travelers) !== flightTravelerComposition(query.travelers)) fail("traveler composition, ages, and infant seat requirements must match the request")
    }
    if (!Array.isArray(data.legs) || data.legs.length !== query.legs.length) { fail("leg count must match the request"); continue }
    for (const [legIndex, leg] of data.legs.entries()) {
      const wanted = query.legs[legIndex]
      const segments = leg?.segments
      if (!isPlainObject(wanted) || !Array.isArray(segments) || segments.length === 0) { fail(`leg ${legIndex} requires ordered segments`); continue }
      const matches = (location, airport) => location?.kind === "airport"
        ? location.code === airport
        : location?.kind === "city" && isPlainObject(evidence?.airportCityCodes) && Object.hasOwn(evidence.airportCityCodes, airport) && Array.isArray(evidence.airportCityCodes[airport]) && evidence.airportCityCodes[airport].includes(location.code)
      if (!matches(wanted.origin, segments[0]?.departure?.airport_code) || !matches(wanted.destination, segments.at(-1)?.arrival?.airport_code)) fail(`leg ${legIndex} endpoints must match with trusted airportCityCodes evidence for cities`)
      if (typeof segments[0]?.departure?.local_at !== "string" || segments[0].departure.local_at.slice(0, 10) !== wanted.departure_date) fail(`leg ${legIndex} local departure date must match`)
      if (query.cabin_class !== undefined && segments.some((segment) => segment?.cabin_class !== query.cabin_class)) fail(`leg ${legIndex} cabin class must match on every segment`)
      if (query.max_connections !== undefined && segments.length - 1 > query.max_connections) fail(`leg ${legIndex} exceeds max_connections`)
      if (query.nonstop_only === true && (segments.length !== 1 || !Array.isArray(segments[0]?.stops) || segments[0].stops.length !== 0)) fail(`leg ${legIndex} nonstop_only requires one segment and explicitly empty stops`)
    }
  }
}

export function validateOfferQueryErrorV10Semantics(error, request = {}) {
  const errors = []
  if (!isPlainObject(error)) return { valid: false, errors: ["error envelope must be an object"] }
  const flight = error.extra?.flight_search_error
  const typed = Object.hasOwn(request?.intent ?? {}, "details")
  if (typed && ["BAD_REQUEST", "INTERNAL_ERROR"].includes(error.code) && flight === undefined) errors.push("typed Flight BAD_REQUEST and INTERNAL_ERROR require extra.flight_search_error")
  if (flight !== undefined) {
    if (!isPlainObject(flight) || !["invalid_query", "unsupported_capability", "upstream_failure"].includes(flight.kind)) errors.push("flight_search_error requires a registered kind")
    else if (error.code !== (flight.kind === "upstream_failure" ? "INTERNAL_ERROR" : "BAD_REQUEST")) errors.push("Flight error code and kind must match")
  }
  return { valid: errors.length === 0, errors }
}

export function validateOfferProviderResponseV10Semantics(response, request = {}, evidence = {}) {
  if (!isPlainObject(response)) return { valid: false, errors: ["Provider response must be an object"] }
  if (Object.hasOwn(response, "code")) return validateOfferQueryErrorV10Semantics(response, request)
  const errors = []
  if (typeof request?.request_id !== "string" || response.request_id !== request.request_id) errors.push("Provider request_id is required and must match the paired request")
  const typed = Object.hasOwn(response, "flight_search") || Object.hasOwn(request?.intent ?? {}, "details")
  if (typed) validateFlightResponse(response, request, evidence, true, errors)
  else if (Array.isArray(response.offers)) {
    for (const [index, offer] of response.offers.entries()) for (const error of validatePartnerOfferV10Semantics(offer).errors) errors.push(`offers.${index}: ${error.message}`)
  }
  return { valid: errors.length === 0, errors }
}
