export interface DashboardSubscriptionData {
  hasActiveSubscription: boolean;
  planName: string;
  daysUntilRenewal: number | null;
  renewalDate: string | null;
  price: number | null;
}

export interface DashboardStudyTimeData {
  totalHours: number;
  totalMinutes: number;
  weeklyData: Array<{
    day: string;
    hours: number;
    minutes: number;
  }>;
}

export interface DashboardRecentStudyData {
  id: string;
  title: string;
  subjectName: string;
  subjectSlug: string;
  subjectColor: string;
  slug: string;
  lastStudiedAt: Date;
  studyTimeMinutes: number;
  is_favorite: boolean;
}
