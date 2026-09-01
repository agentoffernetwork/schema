/**
 * AON Location Registry and Location Search API types.
 *
 * The default LEGACY catalog is constrained to the public COUNTRY, REGION,
 * and CITY levels. Protocol V1.0 adds an explicit FULL catalog mode without
 * changing the default legacy request or response shapes.
 */

export type LocationLevel = "COUNTRY" | "REGION" | "CITY";

export interface LocationPathItem {
  location_id: string;
  name: string;
  level: LocationLevel;
}

export interface LocationExternalCodes {
  /** ISO 3166-2 subdivision code such as `US-CA`, when AON can map it. */
  iso_3166_2?: string;
  /** Unicode CLDR subdivision id such as `USCA`, when AON can map it. */
  cldr_subdivision?: string;
  /** Provider short subdivision code such as `CA`, scoped by country. */
  provider_short?: string;
}

export interface LocationSearchQuery {
  /** Omit for the default legacy behavior, or select it explicitly. */
  catalog?: "LEGACY";
  /**
   * Case-insensitive search text. Required unless `parent_location_id` is set
   * or `levels` is exactly `COUNTRY` for top-level browsing.
   */
  q?: string;
  /** Numeric parent id used for direct child browsing. */
  parent_location_id?: string;
  country?: string;
  levels?: LocationLevel[];
  subdivision_code?: string;
  subdivision_code_type?: "AUTO" | "ISO_3166_2" | "CLDR" | "PROVIDER_SHORT";
  limit?: number;
  locale?: string;
}

/**
 * Explicit Protocol V1.0 full-catalog request. The provider's raw
 * `target_type` is the only type filter; legacy `levels` are not accepted.
 */
export interface FullLocationSearchQuery {
  catalog: "FULL";
  /** Case-insensitive search text, required unless browsing by parent. */
  q?: string;
  /** Canonical resolved parent id used for direct child browsing. */
  parent_location_id?: string;
  /** Uppercase ISO 3166-1 alpha-2 country code. */
  country?: string;
  /** Exact Google Geo Target raw types, such as `Postal Code` or `Ward`. */
  target_types?: string[];
  /** Maximum results to return. The service caps this at 50. */
  limit?: number;
  /** Opaque continuation cursor returned by a prior FULL response. */
  cursor?: string;
  /** Reserved for localized display names. */
  locale?: string;
}

/**
 * Request accepted by `GET /v1/locations/search`. Existing callers may keep
 * using `LocationSearchQuery`; callers that need all ACTIVE target types use
 * the discriminated `FullLocationSearchQuery` branch.
 */
export type LocationSearchRequest = LocationSearchQuery | FullLocationSearchQuery;

export interface LocationSearchResult {
  location_id: string;
  name: string;
  canonical_name: string;
  country_code: string;
  level: LocationLevel;
  target_type: string;
  parent_location_id: string | null;
  path: LocationPathItem[];
  /** Optional lookup aliases. Matching still uses `location_id` only. */
  external_codes?: LocationExternalCodes;
}

export interface LocationSearchResponse {
  code: "SUCCESS";
  message: string;
  data: {
    registry_version: "v1";
    source_file_date: string;
    locations: LocationSearchResult[];
  };
  extra: Record<string, unknown>;
}

/** Chain was reconstructed entirely from verified ACTIVE source-parent edges. */
export type FullLocationChainStatus = "COMPLETE" | "UNRESOLVED_SOURCE_PARENT";

/** A node in a FULL result's canonical root-to-self path. */
export interface FullLocationPathItem {
  location_id: string;
  name: string;
  canonical_name: string;
  country_code: string;
  /** Raw Google Geo Target type; never normalized to the legacy level enum. */
  target_type: string;
  hierarchy_precision: number;
  /** Present only when this node is honestly representable by the legacy registry. */
  legacy_level?: LocationLevel;
}

interface FullLocationSearchResultBase {
  location_id: string;
  name: string;
  canonical_name: string;
  country_code: string;
  /** Raw Google Geo Target type, for example `Postal Code`, `Ward`, or `City`. */
  target_type: string;
  /** Parent id copied directly from the source row, before canonical resolution. */
  source_parent_location_id: string | null;
  /** Nearest verified ACTIVE ancestor used by the canonical hierarchy, if any. */
  parent_location_id: string | null;
  /** Root-to-self path containing only verified canonical parent relations. */
  path: FullLocationPathItem[];
  /** One-based depth in the verified canonical hierarchy. */
  hierarchy_precision: number;
  /** Optional only for values that the legacy registry can represent without relabeling. */
  legacy_level?: LocationLevel;
}

/** FULL result with a complete, verified source-parent chain. */
export interface CompleteFullLocationSearchResult extends FullLocationSearchResultBase {
  chain_status: "COMPLETE";
  unresolved_source_parent_location_id?: never;
}

/**
 * FULL result retained from the ACTIVE source even though its raw source
 * parent is unavailable. Relationship-based matching must fail closed.
 */
export interface UnresolvedParentFullLocationSearchResult extends FullLocationSearchResultBase {
  chain_status: "UNRESOLVED_SOURCE_PARENT";
  source_parent_location_id: string;
  unresolved_source_parent_location_id: string;
}

/**
 * A FULL result intentionally has no `level` field: deep Google target types
 * must not be mislabeled as `CITY` merely to fit the legacy three-level enum.
 */
export type FullLocationSearchResult =
  | CompleteFullLocationSearchResult
  | UnresolvedParentFullLocationSearchResult;

/** Response returned only for an explicit `catalog=FULL` request. */
export interface FullLocationSearchResponse {
  code: "SUCCESS";
  message: string;
  data: {
    catalog: "FULL";
    catalog_version: "v1";
    source_file_date: string;
    locations: FullLocationSearchResult[];
    /** Opaque continuation cursor; omitted at the end of the result set. */
    next_cursor?: string;
  };
  extra: Record<string, unknown>;
}

/** Response selected by the request `catalog` discriminant. */
export type LocationSearchApiResponse = LocationSearchResponse | FullLocationSearchResponse;

export interface LocationLookupResponse {
  code: "SUCCESS";
  message: string;
  data: {
    registry_version: "v1";
    source_file_date: string;
    location: LocationSearchResult;
    location_ids: string[];
  };
  extra: Record<string, unknown>;
}

export interface LocationResolveResponse {
  code: "SUCCESS";
  message: string;
  data: {
    registry_version: "v1";
    source_file_date: string;
    location: LocationSearchResult | null;
    location_ids: string[];
    candidates: LocationSearchResult[];
    input: {
      country?: string;
      subdivision_code?: string;
      subdivision_code_type?: "AUTO" | "ISO_3166_2" | "CLDR" | "PROVIDER_SHORT";
      city?: string;
    };
  };
  extra: Record<string, unknown>;
}

export interface StructuredLocationGeoEntry {
  location_id: string;
}

export declare function countryCodeToLocationId(countryCode: string): string | null;

export declare function subdivisionCodeToLocationId(
  code: string,
  options?: {
    country?: string;
    codeType?: "AUTO" | "ISO_3166_2" | "CLDR" | "PROVIDER_SHORT";
  },
): string | null;

export declare function legacyCountryGeoToLocationGeo(
  countries: string[],
): StructuredLocationGeoEntry[];

export declare function buildLocationChain(locationId: string): string[] | null;

export declare function toSearchResult(
  locationId: string,
): LocationSearchResult | null;

export declare function resolveLocationInput(input: {
  country?: string;
  subdivision_code?: string;
  subdivision_code_type?: "AUTO" | "ISO_3166_2" | "CLDR" | "PROVIDER_SHORT";
  city?: string;
  limit?: number;
}): LocationResolveResponse["data"];

export declare function cloudflareHeadersToLocationContext(
  headers: Record<string, string | string[] | undefined>,
): LocationResolveResponse["data"];

export declare function googleCloudHeadersToLocationContext(
  headers: Record<string, string | string[] | undefined>,
): LocationResolveResponse["data"];
