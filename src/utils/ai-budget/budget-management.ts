import { db } from "@/db/drizzle";
import { subscriptions, aiUsageTable, aiBudgetBalanceTable } from "@/db/schema";
import { eq, and, desc, gte, lte } from "drizzle-orm";
import { unstable_cache } from "next/cache";

// DeepSeek API Pricing (USD per 1M tokens)
export const DEEPSEEK_PRICING = {
  INPUT_CACHE_HIT: 0.07, // $0.07 per 1M input tokens (cache hit)
  INPUT_CACHE_MISS: 0.27, // $0.27 per 1M input tokens (cache miss)
  OUTPUT: 1.1, // $1.10 per 1M output tokens
} as const;

// Exchange rate EUR to USD (you might want to fetch this dynamically)
export const EUR_TO_USD_RATE = 1.06;

// Calculate monthly AI budget in EUR based on subscription price
export function calculateMonthlyAIBudget(customPriceEur: number): number {
  return customPriceEur * 0.25;
}

// Calculate cost in USD for token usage with proper cache handling
export function calculateTokenCost(
  inputTokens: number,
  outputTokens: number,
  cachedInputTokens: number = 0
): { inputCostUsd: number; outputCostUsd: number; totalCostUsd: number } {
  // Split input tokens between cached and non-cached
  const nonCachedInputTokens = Math.max(0, inputTokens - cachedInputTokens);

  const cachedInputCostUsd =
    (cachedInputTokens / 1_000_000) * DEEPSEEK_PRICING.INPUT_CACHE_HIT;
  const nonCachedInputCostUsd =
    (nonCachedInputTokens / 1_000_000) * DEEPSEEK_PRICING.INPUT_CACHE_MISS;
  const inputCostUsd = cachedInputCostUsd + nonCachedInputCostUsd;
  const outputCostUsd = (outputTokens / 1_000_000) * DEEPSEEK_PRICING.OUTPUT;
  const totalCostUsd = inputCostUsd + outputCostUsd;

  return {
    inputCostUsd: Math.round(inputCostUsd * 100000000) / 100000000, // Round to 8 decimal places
    outputCostUsd: Math.round(outputCostUsd * 100000000) / 100000000,
    totalCostUsd: Math.round(totalCostUsd * 100000000) / 100000000,
  };
}

// Convert USD to EUR
export function convertUsdToEur(usdAmount: number): number {
  return usdAmount / EUR_TO_USD_RATE;
}

function getCurrentMonthPeriod(now: Date = new Date()) {
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59
  );
  return { periodStart, periodEnd };
}

function getEffectiveSubscriptionPeriod(
  sub: {
    current_period_start: Date | null;
    current_period_end: Date | null;
  },
  now: Date = new Date()
) {
  const hasValidSubPeriod =
    !!sub.current_period_start &&
    !!sub.current_period_end &&
    sub.current_period_start <= now &&
    sub.current_period_end >= now;

  if (hasValidSubPeriod) {
    return {
      periodStart: sub.current_period_start as Date,
      periodEnd: sub.current_period_end as Date,
    };
  }
  return getCurrentMonthPeriod(now);
}

// Get or create current AI budget balance for user
export function getCurrentAIBudgetBalance(userId: string) {
  return unstable_cache(
    async () => {
      const subscription = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.user_id, userId))
        .limit(1);

      if (!subscription.length || subscription[0].status !== "active") {
        return {
          hasAccess: false,
          remainingBudgetEur: 0,
          allocatedBudgetEur: 0,
          usedBudgetUsd: 0,
          usedBudgetEur: 0,
          estimatedRemainingTokens: 0,
        };
      }

      const sub = subscription[0];
      const now = new Date();
      const { periodStart, periodEnd } = getEffectiveSubscriptionPeriod(
        sub,
        now
      );

      // Check if we have a current balance record for this period
      let balance = await db
        .select()
        .from(aiBudgetBalanceTable)
        .where(
          and(
            eq(aiBudgetBalanceTable.user_id, userId),
            eq(aiBudgetBalanceTable.subscription_id, sub.id),
            lte(aiBudgetBalanceTable.period_start, now),
            gte(aiBudgetBalanceTable.period_end, now)
          )
        )
        .limit(1);

      // Create missing balance row for current period (idempotent)
      if (!balance.length) {
        await db
          .insert(aiBudgetBalanceTable)
          .values({
            user_id: userId,
            subscription_id: sub.id,
            period_start: periodStart,
            period_end: periodEnd,
            allocated_budget_eur: sub.monthly_ai_budget,
            used_budget_usd: "0",
            remaining_budget_eur: sub.monthly_ai_budget,
          })
          .onConflictDoNothing({
            target: [
              aiBudgetBalanceTable.user_id,
              aiBudgetBalanceTable.subscription_id,
              aiBudgetBalanceTable.period_start,
              aiBudgetBalanceTable.period_end,
            ],
          });

        // re-fetch to operate on the current row
        balance = await db
          .select()
          .from(aiBudgetBalanceTable)
          .where(
            and(
              eq(aiBudgetBalanceTable.user_id, userId),
              eq(aiBudgetBalanceTable.subscription_id, sub.id),
              lte(aiBudgetBalanceTable.period_start, now),
              gte(aiBudgetBalanceTable.period_end, now)
            )
          )
          .limit(1);
      }

      const current = balance[0];
      const usedBudgetUsd = parseFloat(current.used_budget_usd.toString());
      const usedBudgetEur = convertUsdToEur(usedBudgetUsd);
      const remainingBudgetEur = parseFloat(
        current.remaining_budget_eur.toString()
      );

      const remainingBudgetUsd = remainingBudgetEur * EUR_TO_USD_RATE;
      const estimatedTokens = Math.floor(
        remainingBudgetUsd / (DEEPSEEK_PRICING.INPUT_CACHE_MISS / 1_000_000)
      );

      return {
        hasAccess: true,
        remainingBudgetEur,
        allocatedBudgetEur: parseFloat(current.allocated_budget_eur.toString()),
        usedBudgetUsd,
        usedBudgetEur,
        estimatedRemainingTokens: estimatedTokens,
      };
    },
    ["getCurrentAIBudgetBalance", userId],
    { revalidate: 30, tags: ["ai-budget", `user-${userId}`] }
  )();
}

// Check if user has enough budget for a request (estimate based on average token usage)
export async function checkBudgetAvailability(
  userId: string,
  estimatedInputTokens: number = 1000,
  estimatedOutputTokens: number = 500
): Promise<boolean> {
  const balance = await getCurrentAIBudgetBalance(userId);

  if (!balance.hasAccess) return false;

  // Calculate estimated cost for this request
  const estimatedCost = calculateTokenCost(
    estimatedInputTokens,
    estimatedOutputTokens
  );
  const estimatedCostEur = convertUsdToEur(estimatedCost.totalCostUsd);

  return balance.remainingBudgetEur >= estimatedCostEur;
}

// Record AI usage and update budget after API interaction
export async function recordAIUsage(
  userId: string,
  inputTokens: number,
  outputTokens: number,
  chatType: "pdf" | "subject" | "dashboard",
  modelUsed: string = "deepseek-chat",
  cachedInputTokens: number = 0
) {
  const totalTokens = inputTokens + outputTokens;
  const costs = calculateTokenCost(
    inputTokens,
    outputTokens,
    cachedInputTokens
  );

  const subscription = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.user_id, userId))
    .limit(1);

  if (!subscription.length) return;

  // Record detailed usage
  await db.insert(aiUsageTable).values({
    user_id: userId,
    subscription_id: subscription[0].id,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    total_tokens: totalTokens,
    input_cost_usd: costs.inputCostUsd.toString(),
    output_cost_usd: costs.outputCostUsd.toString(),
    total_cost_usd: costs.totalCostUsd.toString(),
    chat_type: chatType,
    model_used: modelUsed,
  });

  // Ensure a budget balance row exists for the effective period
  const now = new Date();
  const { periodStart, periodEnd } = getEffectiveSubscriptionPeriod(
    subscription[0],
    now
  );

  await db
    .insert(aiBudgetBalanceTable)
    .values({
      user_id: userId,
      subscription_id: subscription[0].id,
      period_start: periodStart,
      period_end: periodEnd,
      allocated_budget_eur: subscription[0].monthly_ai_budget,
      used_budget_usd: "0",
      remaining_budget_eur: subscription[0].monthly_ai_budget,
    })
    .onConflictDoNothing({
      target: [
        aiBudgetBalanceTable.user_id,
        aiBudgetBalanceTable.subscription_id,
        aiBudgetBalanceTable.period_start,
        aiBudgetBalanceTable.period_end,
      ],
    });

  // Update budget balance
  const balance = await db
    .select()
    .from(aiBudgetBalanceTable)
    .where(
      and(
        eq(aiBudgetBalanceTable.user_id, userId),
        eq(aiBudgetBalanceTable.subscription_id, subscription[0].id),
        lte(aiBudgetBalanceTable.period_start, now),
        gte(aiBudgetBalanceTable.period_end, now)
      )
    )
    .limit(1);

  if (balance.length) {
    const currentUsedUsd = parseFloat(balance[0].used_budget_usd.toString());
    const newUsedUsd = currentUsedUsd + costs.totalCostUsd;
    const newUsedEur = convertUsdToEur(newUsedUsd);
    const allocatedEur = parseFloat(balance[0].allocated_budget_eur.toString());
    const newRemainingEur = Math.max(0, allocatedEur - newUsedEur);

    await db
      .update(aiBudgetBalanceTable)
      .set({
        used_budget_usd: newUsedUsd.toString(),
        remaining_budget_eur: newRemainingEur.toString(),
        updated_at: new Date(),
      })
      .where(eq(aiBudgetBalanceTable.id, balance[0].id));
  }
}

// Get usage statistics for a user (for analytics)
export function getUserAIUsageStats(userId: string, days: number = 30) {
  return unstable_cache(
    async () => {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const usageStats = await db
        .select()
        .from(aiUsageTable)
        .where(
          and(
            eq(aiUsageTable.user_id, userId),
            gte(aiUsageTable.created_at, cutoffDate)
          )
        )
        .orderBy(desc(aiUsageTable.created_at));

      const totalUsage = usageStats.reduce(
        (acc, usage) => ({
          totalTokens: acc.totalTokens + usage.total_tokens,
          totalCostUsd:
            acc.totalCostUsd + parseFloat(usage.total_cost_usd.toString()),
          chatCounts: {
            ...acc.chatCounts,
            [usage.chat_type]: (acc.chatCounts[usage.chat_type] || 0) + 1,
          },
        }),
        {
          totalTokens: 0,
          totalCostUsd: 0,
          chatCounts: {} as Record<string, number>,
        }
      );

      return {
        totalUsage,
        dailyUsage: usageStats,
      };
    },
    ["getUserAIUsageStats", userId, String(days)],
    { revalidate: 60, tags: ["ai-usage", `user-${userId}`] }
  )();
}

// Add budget to current period (for plan upgrades)
export async function addBudgetToCurrentPeriod(
  userId: string,
  additionalBudgetEur: number
) {
  // Get current period dates
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59
  );

  // Get current budget balance record directly from database
  const balance = await db
    .select()
    .from(aiBudgetBalanceTable)
    .where(
      and(
        eq(aiBudgetBalanceTable.user_id, userId),
        lte(aiBudgetBalanceTable.period_start, now),
        gte(aiBudgetBalanceTable.period_end, now)
      )
    )
    .limit(1);

  if (!balance.length) {
    throw new Error("No budget balance found for current period");
  }

  const currentBalance = balance[0];

  // Add the additional budget to both allocated and remaining amounts
  const currentAllocated = parseFloat(
    currentBalance.allocated_budget_eur.toString()
  );
  const currentRemaining = parseFloat(
    currentBalance.remaining_budget_eur.toString()
  );

  const newAllocatedBudget = currentAllocated + additionalBudgetEur;
  const newRemainingBudget = currentRemaining + additionalBudgetEur;

  // Update the balance record for current period
  await db
    .update(aiBudgetBalanceTable)
    .set({
      allocated_budget_eur: newAllocatedBudget.toString(),
      remaining_budget_eur: newRemainingBudget.toString(),
      updated_at: new Date(),
    })
    .where(eq(aiBudgetBalanceTable.id, currentBalance.id));

  console.log("Added budget to current period:", {
    userId,
    additionalBudgetEur,
    oldAllocated: currentAllocated,
    newAllocatedBudget,
    oldRemaining: currentRemaining,
    newRemainingBudget,
  });

  return {
    newAllocatedBudget,
    newRemainingBudget,
    additionalBudgetEur,
  };
}

// Reset current period balance when upgrading from free trial to premium
// Sets used_budget_usd to 0 and aligns allocated/remaining to subscription.monthly_ai_budget
export async function resetCurrentPeriodAIBudgetBalance(userId: string) {
  const now = new Date();

  // Get user's active subscription
  const subscriptionRows = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.user_id, userId))
    .limit(1);

  if (!subscriptionRows.length) {
    return { updated: false, reason: "no_subscription" } as const;
  }

  const sub = subscriptionRows[0];

  // Determine effective period using subscription bounds if available
  const { periodStart, periodEnd } = getEffectiveSubscriptionPeriod(sub, now);

  // Ensure a balance row exists for this period
  await db
    .insert(aiBudgetBalanceTable)
    .values({
      user_id: userId,
      subscription_id: sub.id,
      period_start: periodStart,
      period_end: periodEnd,
      allocated_budget_eur: sub.monthly_ai_budget,
      used_budget_usd: "0",
      remaining_budget_eur: sub.monthly_ai_budget,
    })
    .onConflictDoNothing({
      target: [
        aiBudgetBalanceTable.user_id,
        aiBudgetBalanceTable.subscription_id,
        aiBudgetBalanceTable.period_start,
        aiBudgetBalanceTable.period_end,
      ],
    });

  // Now force reset values for the current period row
  const currentBalance = await db
    .select()
    .from(aiBudgetBalanceTable)
    .where(
      and(
        eq(aiBudgetBalanceTable.user_id, userId),
        eq(aiBudgetBalanceTable.subscription_id, sub.id),
        lte(aiBudgetBalanceTable.period_start, now),
        gte(aiBudgetBalanceTable.period_end, now)
      )
    )
    .limit(1);

  if (!currentBalance.length) {
    return { updated: false, reason: "no_current_balance" } as const;
  }

  await db
    .update(aiBudgetBalanceTable)
    .set({
      allocated_budget_eur: sub.monthly_ai_budget,
      used_budget_usd: "0",
      remaining_budget_eur: sub.monthly_ai_budget,
      updated_at: new Date(),
    })
    .where(eq(aiBudgetBalanceTable.id, currentBalance[0].id));

  return { updated: true } as const;
}
