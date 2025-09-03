import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { subscriptions, aiBudgetBalanceTable } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    // Get a sample subscription to test with
    const sampleSubscription = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.status, "active"))
      .limit(1);

    if (!sampleSubscription.length) {
      return NextResponse.json({
        message: "No active subscriptions found",
        subscriptions: []
      });
    }

    const sub = sampleSubscription[0];

    // Get current budget balance for this user
    const budgetBalance = await db
      .select()
      .from(aiBudgetBalanceTable)
      .where(eq(aiBudgetBalanceTable.user_id, sub.user_id!))
      .orderBy(desc(aiBudgetBalanceTable.created_at))
      .limit(1);

    return NextResponse.json({
      subscription: {
        user_id: sub.user_id,
        subject_count: sub.subject_count,
        custom_price: sub.custom_price,
        monthly_ai_budget: sub.monthly_ai_budget,
        status: sub.status
      },
      budgetBalance: budgetBalance.length > 0 ? {
        allocated_budget_eur: budgetBalance[0].allocated_budget_eur,
        used_budget_usd: budgetBalance[0].used_budget_usd,
        remaining_budget_eur: budgetBalance[0].remaining_budget_eur,
        period_start: budgetBalance[0].period_start,
        period_end: budgetBalance[0].period_end
      } : null,
      testInstructions: {
        upgradeTest: `POST /api/test/plan-change-budget with { "userId": "${sub.user_id}", "currentPrice": ${sub.custom_price}, "newPrice": ${parseFloat(sub.custom_price || "0") + 2.49}, "changeType": "upgrade" }`,
        downgradeTest: `POST /api/test/plan-change-budget with { "userId": "${sub.user_id}", "currentPrice": ${sub.custom_price}, "newPrice": ${Math.max(5.99, parseFloat(sub.custom_price || "0") - 2.49)}, "changeType": "downgrade" }`
      }
    });

  } catch (error) {
    console.error("Error fetching current data:", error);
    return NextResponse.json(
      { error: "Failed to fetch data", details: error },
      { status: 500 }
    );
  }
}
