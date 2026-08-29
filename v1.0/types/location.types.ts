/**
 * AON Location Registry and Location Search API v0.1 types.
 *
 * Location ids are numeric strings sourced from Google Ads Geo Target Criteria
 * IDs, constrained by AON to the public COUNTRY, REGION, and CITY levels.
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
