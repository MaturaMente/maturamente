export interface SubscriptionData {
  id: string;
  user_id: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  status: string;
  subject_count: number; // Number of subjects in the subscription (required)
  custom_price: string; // Decimal stored as string (required)
  current_period_start: Date | null;
  current_period_end: Date | null;
  cancel_at_period_end: boolean | null;
  created_at: Date;
  updated_at: Date;
}

export interface SubscriptionStatus {
  isActive: boolean;
  isPastDue: boolean;
  isCanceled: boolean;
  willCancelAtPeriodEnd: boolean;
  currentPeriodEnd: Date | string | null;
  subjectCount: number; // Number of subjects included in the plan
  price: number; // Monthly price for the subscription
}

export interface UserSubjectAccess {
  hasAccess: boolean;
  subjectsCount: number;
  maxSubjects: number;
  availableSlots: number;
  selectedSubjects: string[];
}

// Remove the old plan type enum since all plans are now custom
export interface SubscriptionMetrics {
  isActive: boolean;
  subjectsUsed: number;
  subjectsLimit: number;
  utilizationPercentage: number;
  monthlyPrice: number;
  nextBillingDate: Date | string | null;
}
