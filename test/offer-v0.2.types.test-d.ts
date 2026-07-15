import type { Offer, ConversionGoal, PriceUnit } from '../types/offer-v0.2.types';

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
