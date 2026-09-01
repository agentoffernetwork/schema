import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const here = dirname(fileURLToPath(import.meta.url))
const catalogPath = resolve(here, "../locations/aon-location-catalog-v1.json")
const catalog = JSON.parse(readFileSync(catalogPath, "utf8"))

if (catalog.version !== "v1" || !Array.isArray(catalog.locations)) {
  throw new Error("AON Full Location Catalog v1 is invalid")
}

const fullCatalogLocationIds = new Set(catalog.locations.map((location) => location.location_id))

export function isFullLocationCatalogV1Member(locationId) {
  return typeof locationId === "string" && /^[0-9]+$/.test(locationId) && fullCatalogLocationIds.has(locationId)
}
