import type {
  AgentPostbackPayloadV02,
  ConversionGoal,
  Offer,
  OfferProviderRequest,
  OfferQueryRequest,
  OsType,
  PartnerPostbackPayloadV02,
  PriceUnit,
} from '../types/offer-v0.2.types';

declare const offer: Offer;
const goals: ConversionGoal[] = [
  { event: 'sale', pricing: { model: 'cpa', amount: '1', currency: 'USD' } },
];
void offer;
void goals;

// @ts-expect-error removed public field must not be assignable
offer.bid;
// @ts-expect-error v0.2 requires goals
const missingGoals: Offer = { ...offer, goals: undefined };
void missingGoals;

const unit: PriceUnit = 'month';
void unit;

// @ts-expect-error unknown price unit
const badUnit: PriceUnit = 'hour';
void badUnit;

const cardOffer: Offer = {
  ...offer,
  offer_info: {
    ...offer.offer_info,
    rating: { value: 4.6, count: 128, source: 'partner_declared' },
    properties: [
      { type: 'cashback', value: 2, unit: '%', display_pattern: 'Cashback ${value}${unit}' },
      { type: 'free_trial', value: 14, unit: 'days' },
    ],
    commercial: {
      price: { amount: '10.00', currency: 'USD', unit: 'month' },
      fulfillment_note: 'Cancel anytime',
    },
  },
  material: [
    { url: 'https://cdn.example.com/hero.jpg', tag: 'hero', format: 'image', dimensions: '1600x600', alt_text: 'Product dashboard on a laptop' },
  ],
};
void cardOffer;

const minimalQuery: OfferQueryRequest = {
  context: { user_profile: {} },
  intent: { content: [{ type: 'input_text', text: 'Find a secure team workspace' }] },
};
void minimalQuery;

const imageQuery: OfferQueryRequest = {
  context: {
    user_profile: {
      device_info: {},
    },
  },
  intent: {
    content: [{ type: 'input_image', image_url: 'https://example.com/screenshot.png' }],
  },
};
void imageQuery;

const queryWithLegacyCountry: OfferQueryRequest = {
  context: {
    user_profile: {
      // @ts-expect-error country was removed from Query v0.2; use structured locations
      country: 'US',
    },
  },
  intent: { content: [{ type: 'input_text', text: 'Find a secure team workspace' }] },
};
void queryWithLegacyCountry;

const providerQuery: OfferProviderRequest = {
  ...minimalQuery,
  request_id: '0195af51-8b2c-7d3e-a1b2-c3d4e5f60718',
};
void providerQuery;

// @ts-expect-error Provider requests require request_id
const providerWithoutRequestId: OfferProviderRequest = minimalQuery;
void providerWithoutRequestId;

const malformedTextItem: OfferQueryRequest = {
  context: { user_profile: {} },
  intent: {
    // @ts-expect-error input_text requires text and cannot substitute image_url
    content: [{ type: 'input_text', image_url: 'https://example.com/not-text.png' }],
  },
};
void malformedTextItem;

// @ts-expect-error Offer targeting no longer accepts linux
const linuxTarget: OsType = 'linux';
void linuxTarget;

// @ts-expect-error accepted_types is not part of v0.2 conversion_rule
offer.conversion_rule?.accepted_types;

const partnerPostback: PartnerPostbackPayloadV02 = {
  event_name: 'subscription',
  aon_tracking_id: 'trk_01_click_abc',
};
void partnerPostback;

// @ts-expect-error Partner postbacks require event_name
const partnerPostbackWithoutGoal: PartnerPostbackPayloadV02 = {
  aon_tracking_id: 'trk_01_click_abc',
};
void partnerPostbackWithoutGoal;

// @ts-expect-error Partner postbacks require an attribution anchor
const partnerPostbackWithoutAnchor: PartnerPostbackPayloadV02 = {
  event_name: 'subscription',
};
void partnerPostbackWithoutAnchor;

const partnerPostbackWithLegacyType: PartnerPostbackPayloadV02 = {
  ...partnerPostback,
  // @ts-expect-error conversion_type is replaced by event_name
  conversion_type: 'sale',
};
void partnerPostbackWithLegacyType;

const partnerPostbackWithBid: PartnerPostbackPayloadV02 = {
  ...partnerPostback,
  // @ts-expect-error bid_amount is not part of the Partner postback
  bid_amount: 24,
};
void partnerPostbackWithBid;

const agentPostback: AgentPostbackPayloadV02 = {
  event_id: 'evt_01J0AONCONVERSION000001',
  event_type: 'conversion',
  event_name: 'subscription',
  aon_tracking_id: 'trk_01_click_abc',
  offer_id: 'ao_01HX2B3C4D5E6F7G8H9J0KABCD',
  agent_id: 'agt_assistant_123',
  amount: 120,
  currency: 'USD',
  timestamp: '2026-03-21T03:10:00Z',
};
void agentPostback;

const agentPostbackWithLegacyFields: AgentPostbackPayloadV02 = {
  ...agentPostback,
  // @ts-expect-error conversion_type is replaced by event_name
  conversion_type: 'sale',
};
void agentPostbackWithLegacyFields;

const agentPostbackWithBid: AgentPostbackPayloadV02 = {
  ...agentPostback,
  // @ts-expect-error bid_amount is not part of the Agent postback
  bid_amount: 24,
};
void agentPostbackWithBid;
