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

export function validateOfferQueryV03Semantics(request) {
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
  if (Object.hasOwn(request.constraints ?? {}, "features")) errors.push("constraints.features is not defined in v0.3")
  validateBudgetSignal(request.intent?.signals?.budget, "intent.signals.budget", errors)
  return { valid: errors.length === 0, errors }
}

export function validateOfferQueryResponseV03Semantics(response, request = {}) {
  const errors = []
  const thinkingMode = request.response_options?.thinking_mode ?? true
  if (!thinkingMode && (response.offers ?? []).some((offer) => Object.hasOwn(offer, "match_reason"))) {
    errors.push("match_reason must be omitted when thinking_mode is false")
  }
  if (response.offers?.length && Object.hasOwn(response, "empty_reason")) {
    errors.push("empty_reason must be omitted when offers are present")
  }
  if (!response.offers?.length && !EMPTY_REASONS.has(response.empty_reason)) {
    errors.push("empty_reason is required and must be a v0.3 enum value when offers are empty")
  }
  if (Object.hasOwn(response, "decision_factors")) errors.push("decision_factors is not defined in v0.3")
  if (response.engagement && Object.hasOwn(response.engagement, "query_helper")) errors.push("query_helper is item-level only")
  return { valid: errors.length === 0, errors }
}

export function validateQueryHelperPatch(patch) {
  const errors = []
  const visit = (value, path = "") => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return
    for (const [key, child] of Object.entries(value)) {
      const childPath = path ? `${path}.${key}` : key
      if (![...QUERY_HELPER_PATHS].some((allowed) => allowed === childPath || childPath.startsWith(`${allowed}.`) || allowed.startsWith(`${childPath}.`))) {
        errors.push(childPath)
        continue
      }
      if (child && typeof child === "object" && !Array.isArray(child)) visit(child, childPath)
    }
  }
  visit(patch)
  validateBudgetSignal(patch?.intent?.signals?.budget, "request_patch.intent.signals.budget", errors)
  return { valid: errors.length === 0, errors }
}

export function isAbsoluteHttpsListingSourceLogo(value) {
  if (typeof value !== "string" || Array.from(value).length > 2048 || !/^[\x00-\x7F]*$/.test(value) || value.slice(0, 8).toLowerCase() !== "https://" || /%(?![0-9A-Fa-f]{2})/.test(value)) return false
  try {
    const parsed = new URL(value)
    return parsed.protocol === "https:" && parsed.hostname.length > 0
  } catch {
    return false
  }
}

export function validateListingSourceV03(source, entity = {}, now = new Date()) {
  const errors = []
  if (!source || typeof source !== "object") return { valid: false, action: "omit", errors: ["listing_source must be an object"] }
  for (const field of ["kind", "name", "observed_at"]) {
    if (typeof source[field] !== "string" || source[field].length === 0) errors.push(`listing_source.${field} is required`)
  }
  if (Object.hasOwn(source, "url")) errors.push("listing_source.url is not a v0.3 public field")
  if (Object.hasOwn(source, "logo") && !isAbsoluteHttpsListingSourceLogo(source.logo)) errors.push("listing_source.logo must be an absolute HTTPS URL up to 2048 characters")
  if (source.observed_at && (!source.observed_at.endsWith("Z") || Number.isNaN(Date.parse(source.observed_at)))) errors.push("listing_source.observed_at must be UTC")
  if (entity.name && source.name === entity.name) errors.push("listing_source must remain distinct from entity")
  if (source.observed_at && !Number.isNaN(Date.parse(source.observed_at)) && Date.parse(source.observed_at) < now.getTime() - 1000 * 60 * 60 * 24 * 30) errors.push("listing_source is stale")
  return { valid: errors.length === 0, action: errors.length === 0 ? "keep" : "omit", errors }
}

export { EMPTY_REASONS, QUERY_HELPER_PATHS }
