/**
 * AgentOffer Offer Conversion Goals v0.2 Draft
 *
 * Non-GA draft overlay expressing conversion goals on an AgentOffer offer.
 * A goal is the recognized occurrence of an event priced by a cpa or cps
 * pricing object. The active v0.1 offer schema remains the GA contract and
 * is not modified by this draft.
 */

export interface OfferGoals {
  /**
   * Conversion goals. At least one item. `event` values must be unique
   * within one offer (exact string comparison). Array order carries no
   * semantics.
   */
  goals: ConversionGoal[];
}

export interface ConversionGoal {
  /**
   * Semantic identity and reference key of the goal, unique within the
   * offer. Lowercase slug matching `^[a-z0-9][a-z0-9_.-]{0,63}$`.
   * Changing `event` replaces the goal (delete + create); it is not a
   * rename. Cross-message references use `(offer_id, event)`.
   */
  event: string;

  /** Price paid for one recognized occurrence of `event`. */
  pricing: CpaPricing | CpsPricing;

  /**
   * Advisory human-readable note (max 500 characters). Consumers MUST NOT
   * derive billing, matching, or settlement behavior from it.
   */
  description?: string;
}

export interface CpaPricing {
  model: 'cpa';

  /**
   * Positive decimal string; MUST be greater than zero. Exact passthrough,
   * at most 12 integer and 6 fractional digits.
   */
  amount: string;

  /** ISO 4217 currency code. */
  currency: string;
}

export interface CpsPricing {
  model: 'cps';

  /**
   * Percentage of conversion value: positive decimal string, greater than
   * zero and at most 100, with at most 4 fractional digits. A ratio carries
   * no currency.
   */
  rate: string;
}
