# Changelog

All notable changes to the AgentOffer Schema will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.1.0] - 2026-03-28

### Added

- JSON Schema for Offer object (`offer-schema-v0.1.json`)
- JSON Schema for Query request (`offer-query-schema-v0.1.json`)
- TypeScript type definitions (`offer.types.ts`)
- Per-category attribute type definitions (`category-attributes.types.ts`)
- 6 category types with typed attribute contracts
- RFC 2119 requirement level annotations in schema descriptions

## [0.1.1] - 2026-04-23

### Changed

- Expanded category enums from 6 to 11 across Offer Schema and Query Schema artifacts
- Added typed common attribute contracts for `health_beauty`, `fashion`, `food_grocery`, `home_garden`, and `automotive`

## [0.1.2] - 2026-05-18

### Added

- Optional `targeting[].os` field on Offer Schema (`ios`/`android`/`windows`/`macos`/`linux`) for OS-level offer targeting
- Optional `user_profile.country` field on Query Schema (ISO 3166-1 alpha-2) for geo targeting
- `OsType` type definition in `offer.types.ts`

### Notes

- All new fields optional; non-breaking for existing offers and queries (SVC-CORE-F024)

## [0.1.3] - 2026-05-22

### Changed

- Renamed the `travel_hospitality` sub-type `restaurant` to `dining_experience` across Offer Schema and category attribute types.
- Clarified that Query diagnostics use the hosted API `X-AON-TRACE-ID` response header, not JSON body fields such as `trace_id` or `aon_trace_id`.

### Added

- Optional `user_profile.device_info.user_agent` on Query and Provider request schemas for diagnostics and compatibility; not intended as a stable viewer identifier.

### Status

- Version: `v0.1`
- Status: `Draft`

## [Unreleased]

### Added

- AON Taxonomy v1 source tree (`taxonomy/aon-taxonomy-v1.json`), taxonomy
  source schema, legacy v0.1 migration mapping, and drift guard script.
- `bid.model_subtype` (CPA Type): optional free-form token
  (`^[A-Za-z0-9_-]{1,16}$`) qualifying the CPA bid model.
- AON Location Registry v1 (`locations/aon-location-registry-v1.json`),
  generated from Google Ads Geo Targets `geotargets-2026-05-28.csv` and limited
  to `COUNTRY`, `REGION`, and `CITY` levels.
- Structured offer geo entries via `{ "location_id": "<Google Criteria ID>" }`
  plus `targeting[].eligibility.min_age`.
- Query `context.user_profile.location_ids` and
  `context.user_profile.verified_age_over` for canonical location and non-PII
  age threshold targeting.

### Changed

- Offer Schema category payload now uses `offer_info.category.id`.
- Query and Provider request schemas now use `constraints.category_ids`.
- TypeScript category types now expose `CategoryId` and `OfferCategory`.
- `bid.model` is narrowed to `cpa`, `cps`, and `hybrid`; lead/install use
  `cpa` plus `model_subtype`.
- `targeting[].geo.include` and `targeting[].geo.exclude` now accept either
  legacy country strings or structured `location_id` objects, but mixed arrays
  are invalid.
- AON Location Registry v1 now publishes `parent_location_id` only; consumers
  derive ancestor chains from parent links instead of reading
  `ancestor_location_ids`.
