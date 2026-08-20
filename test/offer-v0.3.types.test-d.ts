import type { OfferQueryRequestV03, OfferQueryResponseV03 } from "../types/offer-query-v0.3.types"
import type { OfferV03 } from "../types/offer-v0.3.types"

const request: OfferQueryRequestV03 = {
  context: {},
  intent: {
    content: [{ type: "input_text", text: "find a quiet hotel" }],
    provenance: "user_expressed",
    signals: { budget: { max: 250, currency: "USD" } },
  },
  response_options: { thinking_mode: false },
}

const offer: OfferV03 = {
  offer_id: "019dd208-27d2-7673-b16f-6897fa120303",
  offer_instance_id: "019dd208-27d2-7673-b16f-6897fa120304",
  version: "3.0",
  offer_info: { title: "Quiet hotel", category: { id: "travel.hotel" }, description: "A quiet hotel" },
  entity: { id: "merchant-1", name: "Example Hotels" },
  listing_source: { kind: "marketplace", name: "Example Travel", observed_at: "2026-08-13T00:00:00Z" },
  action: { type: "open_url", payload: { url: "https://example.com/hotel" } },
  goals: [{ event: "booking", pricing: { model: "cpa", amount: "10", currency: "USD" } }],
}

const response: OfferQueryResponseV03 = { request_id: request.request_id ?? "019dd208-27d2-7673-b16f-6897fa120305", protocol_version: "0.3", language: "en-US", offers: [offer] }
void response
