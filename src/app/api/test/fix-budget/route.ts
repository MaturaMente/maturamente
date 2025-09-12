import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { subscriptions, aiBudgetBalanceTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { calculateMonthlyAIBudget } from "@/utils/ai-budget/budget-management";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        {
          error: "userId is required",
        },
        { status: 400 }
      );
    }

    console.log("Fixing AI budget for user:", userId);

    // Get user's subscription
    const userSubscription = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.user_id, userId))
      .limit(1);

    if (!userSubscription.length) {
      return NextResponse.json(
        {
          error: "No subscription found for user",
        },
        { status: 404 }
      );
    }

    const subscription = userSubscription[0];
    const currentPrice = parseFloat(subscription.custom_price || "0");
    const correctAiBudget = calculateMonthlyAIBudget(currentPrice);

    // Update subscription with correct AI budget
    await db
      .update(subscriptions)
      .set({
        monthly_ai_budget: correctAiBudget.toFixed(4),
        updated_at: new Date(),
      })
      .where(eq(subscriptions.user_id, userId));

    // Create budget balance record for current month (idempotent)
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

    await db
      .insert(aiBudgetBalanceTable)
      .values({
        user_id: userId,
        subscription_id: subscription.id,
        period_start: periodStart,
        period_end: periodEnd,
        allocated_budget_eur: correctAiBudget.toFixed(4),
        used_budget_usd: "0",
        remaining_budget_eur: correctAiBudget.toFixed(4),
      })
      .onConflictDoNothing({
        target: [
          aiBudgetBalanceTable.user_id,
          aiBudgetBalanceTable.subscription_id,
          aiBudgetBalanceTable.period_start,
          aiBudgetBalanceTable.period_end,
        ],
      });

    console.log("Fixed AI budget:", {
      userId,
      currentPrice,
      correctAiBudget,
      periodStart,
      periodEnd,
    });

    return NextResponse.json({
      success: true,
      fixed: {
        subscription_monthly_ai_budget: correctAiBudget,
        budget_balance_created: true,
        period_start: periodStart,
        period_end: periodEnd,
      },
    });
  } catch (error) {
    console.error("Error fixing budget:", error);
    return NextResponse.json(
      { error: "Failed to fix budget", details: error },
      { status: 500 }
    );
  }
}
