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
])

const BCP_47_LANGUAGE_TAG = /^[A-Za-z]{2,3}(?:-[A-Za-z]{3}){0,3}(?:-[A-Za-z]{4})?(?:-(?:[A-Za-z]{2}|[0-9]{3}))?(?:-(?:[A-Za-z0-9]{5,8}|[0-9][A-Za-z0-9]{3}))*(?:-[0-9A-WY-Za-wy-z](?:-[A-Za-z0-9]{2,8})+)*(?:-[Xx](?:-[A-Za-z0-9]{1,8})+)?$/
const DECIMAL_AMOUNT = /^(?:0|[1-9][0-9]{0,11})(?:\.[0-9]{1,6})?$/
const ZERO_DECIMAL_AMOUNT = /^0(?:\.0{1,6})?$/
const CURRENCY_CODE = /^[A-Z]{3}$/
const DISPLAY_PATTERN_TOKENS = new Set(["${type}", "${value}", "${unit}"])
const FORBIDDEN_ACTION_SCHEMES = new Set(["javascript:", "data:", "vbscript:", "file:"])
const SHORT_DESCRIPTION_SEGMENTER = new Intl.Segmenter("und", { granularity: "word" })

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
  if (!isPlainObject(quote) || !Object.hasOwn(quote, "observed_at")) {
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
    segments.forEach((segment, segmentIndex) => {
      const path = `/offer_info/details/data/legs/${legIndex}/segments/${segmentIndex}`
      if (isSameOrAfter(segment?.departure?.at, segment?.arrival?.at)) {
        errors.push(semanticError("flight_segment_time_order", `${path}/arrival/at`, "flight segment arrival.at must be later than departure.at"))
      }
      if (segmentIndex === 0) return
      const previous = segments[segmentIndex - 1]
      if (previous?.arrival?.airport_code !== segment?.departure?.airport_code) {
        errors.push(semanticError("flight_segment_airport_continuity", `${path}/departure/airport_code`, "each flight segment departure airport must equal the preceding segment arrival airport"))
      }
      if (isAfter(previous?.arrival?.at, segment?.departure?.at)) {
        errors.push(semanticError("flight_segment_time_continuity", `${path}/departure/at`, "each flight segment departure.at must not be earlier than the preceding segment arrival.at"))
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
  validateBudgetSignal(request.intent?.signals?.budget, "intent.signals.budget", errors)
  return { valid: errors.length === 0, errors }
}

export function validateOfferQueryResponseV10Semantics(response, request = {}) {
  if (!isPlainObject(response)) return { valid: false, errors: ["Query response root must be a plain object"] }
  const errors = []
  const thinkingMode = request.response_options?.thinking_mode ?? true
  if (!thinkingMode && (response.offers ?? []).some((offer) => Object.hasOwn(offer, "match_reason"))) {
    errors.push("match_reason must be omitted when thinking_mode is false")
  }
  if (response.offers?.length && Object.hasOwn(response, "empty_reason")) {
    errors.push("empty_reason must be omitted when offers are present")
  }
  if (!response.offers?.length && !EMPTY_REASONS.has(response.empty_reason)) {
    errors.push("empty_reason is required and must be a v1.0 enum value when offers are empty")
  }
  if (Object.hasOwn(response, "decision_factors")) errors.push("decision_factors is not defined in v1.0")
  if (response.engagement && Object.hasOwn(response.engagement, "query_helper")) errors.push("query_helper is item-level only")
  if (response.language !== undefined && (typeof response.language !== "string" || !BCP_47_LANGUAGE_TAG.test(response.language) || !hasUniqueLanguageExtensionSingletons(response.language))) errors.push("language must use the stable-v1.0 language-tag profile")
  for (const [index, offer] of (response.offers ?? []).entries()) {
    const projection = validateQueryGenericOfferV10Semantics(offer)
    for (const error of projection.errors) errors.push(`offers.${index}${error.instancePath}: ${error.message}`)
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
  const rootError = validateOfferRoot(offer)
  if (rootError) return { valid: false, errors: [rootError] }
  const errors = []
  validateDisplayPriceSemantics(offer, errors)
  const offerInfo = offer.offer_info
  if (isPlainObject(offerInfo) && Object.hasOwn(offerInfo, "details")) {
    errors.push(semanticError("query_projection_supply_extension", "/offer_info/details", "current Query Generic projection must not include offer_info.details"))
  }
  const commercial = offerInfo?.commercial
  if (isPlainObject(commercial) && Object.hasOwn(commercial, "quote")) {
    errors.push(semanticError("query_projection_supply_extension", "/offer_info/commercial/quote", "current Query Generic projection must not include commercial.quote"))
  }
  if (isPlainObject(commercial?.price) && Object.hasOwn(commercial.price, "tax_status")) {
    errors.push(semanticError("query_projection_supply_extension", "/offer_info/commercial/price/tax_status", "current Query Generic projection must not include commercial.price.tax_status"))
  }
  return { valid: errors.length === 0, errors }
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
