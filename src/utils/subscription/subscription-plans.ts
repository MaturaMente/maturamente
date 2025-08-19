// Client-safe plan configuration (no environment variables)
export const SUBSCRIPTION_PLANS = {
  CUSTOM: {
    name: "MaturaMente Pro",
    price: 0, // Dynamic pricing
    maxSubjects: Infinity, // No limit
    features: [
      "Choose exactly the subjects you need",
      "All exercises and theory for selected subjects",
      "Advanced study tracking and analytics",
      "AI-powered personalized study plans",
      "Priority support and early access to new features",
      "Flexible pricing: pay only for what you use",
    ],
  },
} as const;

export type SubscriptionPlan = keyof typeof SUBSCRIPTION_PLANS;

// Custom pricing constants
export const CUSTOM_PRICING = {
  FIRST_SUBJECT_PRICE: 4.99,
  ADDITIONAL_SUBJECT_PRICE: 2.49,
} as const;

// Calculate custom subscription price
export function calculateCustomPrice(subjectCount: number): number {
  if (subjectCount === 0) return 0;
  if (subjectCount === 1) return CUSTOM_PRICING.FIRST_SUBJECT_PRICE;

  return (
    CUSTOM_PRICING.FIRST_SUBJECT_PRICE +
    CUSTOM_PRICING.ADDITIONAL_SUBJECT_PRICE * (subjectCount - 1)
  );
}

// Get line items for custom subscription checkout
export function getCustomPricingLineItems(subjectCount: number) {
  if (subjectCount === 0) return [];

  const lineItems = [];

  if (subjectCount === 1) {
    // Only one subject: use the "1-materia" price
    lineItems.push({
      priceId: "ONE_MATERIA", // Will be resolved to actual price ID
      quantity: 1,
    });
  } else {
    // Multiple subjects: first subject (5.99) + additional subjects (2.49 each)
    lineItems.push({
      priceId: "ONE_MATERIA", // First subject at 5.99
      quantity: 1,
    });
    lineItems.push({
      priceId: "MATERIA", // Additional subjects at 2.49 each
      quantity: subjectCount - 1,
    });
  }

  return lineItems;
}
