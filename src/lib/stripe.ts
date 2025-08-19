import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not set");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-04-30.basil",
  typescript: true,
});

import {
  SUBSCRIPTION_PLANS as CLIENT_PLANS,
  type SubscriptionPlan,
  getCustomPricingLineItems,
  calculateCustomPrice,
} from "../utils/subscription/subscription-plans";

// Stripe Price IDs for server-side usage
export const STRIPE_PRICE_IDS = {
  ONE_MATERIA: process.env.STRIPE_PRICE_ID_1_MATERIA!,
  FIVE_MATERIA: process.env.STRIPE_PRICE_ID_5_MATERIA!,
  TEN_MATERIA: process.env.STRIPE_PRICE_ID_10_MATERIA!,
  MATERIA: process.env.STRIPE_PRICE_ID_MATERIA!,
} as const;

// Server-side plan configuration with price IDs
export const SUBSCRIPTION_PLANS = {
  CUSTOM: {
    ...CLIENT_PLANS.CUSTOM,
    // Custom plans use multiple price IDs, resolved dynamically
    priceId: null,
  },
} as const;

export type { SubscriptionPlan };

// Helper function to resolve price ID from key
export function resolvePriceId(
  priceKey: keyof typeof STRIPE_PRICE_IDS
): string {
  return STRIPE_PRICE_IDS[priceKey];
}

// Get Stripe line items for custom subscription
export function getStripeLineItemsForCustom(subjectCount: number) {
  const customLineItems = getCustomPricingLineItems(subjectCount);

  return customLineItems.map((item) => ({
    price: resolvePriceId(item.priceId as keyof typeof STRIPE_PRICE_IDS),
    quantity: item.quantity,
  }));
}

// Export the calculation function for use in other parts of the app
export { calculateCustomPrice, getCustomPricingLineItems };
